import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadGates, MVN_VERIFY } from '../../build/gates.js'
import {
  buildUnitIndex,
  buildFitIndex,
  buildE2eIndex
} from '../index-builder.js'
import { resolveLink } from '../resolve.js'
import { coverageFileSchema } from './shape.js'

const finding = (check, capability, message) => ({ check, capability, message })

/**
 * Every coverage link across one capability's requirements, flattened,
 * with the scenario id attached so a finding can name it.
 *
 * @param {object} capability
 * @returns {{type: string, repo: string, file: string, test: string, scenarioId: string}[]}
 */
export const linksOf = (capability) => {
  if (!capability.hasCoverage || capability.coverageParseError) return []
  const result = coverageFileSchema.safeParse(capability.coverage)
  if (!result.success) return []
  return result.data.requirements.flatMap((requirement) =>
    requirement.scenarios.flatMap((scenario) =>
      scenario.tests.map((test) => ({ ...test, scenarioId: scenario.id }))
    )
  )
}

const isJavaRepo = (gates, repo) =>
  gates.repos[repo]?.rungs.some((rung) => rung.run === MVN_VERIFY) ?? false

/**
 * Every (repo, type) pair the corpus actually links to — the real set of
 * runner listings needed, read off the coverage data itself rather than
 * assumed from a fixed repo list.
 *
 * @param {object[]} capabilities
 * @returns {Map<string, Set<string>>}
 */
const neededByRepo = (capabilities) => {
  const map = new Map()
  for (const capability of capabilities) {
    for (const link of linksOf(capability)) {
      const types = map.get(link.repo) ?? new Set()
      types.add(link.type)
      map.set(link.repo, types)
    }
  }
  return map
}

const readFileIfExists = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
}

const buildRepoIndex = async ({ repoPath, types, run }) => {
  const index = {}
  if (types.has('unit')) index.unit = await buildUnitIndex({ repoPath, run })
  if (types.has('fit')) index.fit = await buildFitIndex({ repoPath, run })
  if (types.has('e2e')) index.e2e = await buildE2eIndex({ repoPath, run })
  return index
}

/**
 * Everything the two repo-reading checks need, built once per lint run
 * rather than once per capability: the runner title index for every
 * cloned, `npm ci`'d, non-Java repo the corpus links to; which repos are
 * cloned at all; and why any repo was skipped. A Java repo needs no
 * index — its 3 links resolve by literal grep at check time.
 *
 * @param {object} args
 * @param {{capabilities: object[]}} args.corpus
 * @param {string} args.workspaceRoot - Where repos/ actually lives, regardless of --root
 * @param {Function} [args.run] - The subprocess seam, threaded through to index-builder.js
 * @returns {Promise<{gates: object, indexes: Record<string, object>, cloned: Set<string>, skipped: {check: string, repo: string, reason: string}[]}>}
 */
export const prepareLinkResolution = async ({ corpus, workspaceRoot, run }) => {
  const gates = loadGates(workspaceRoot)
  const needed = neededByRepo(corpus.capabilities)
  const indexes = {}
  const cloned = new Set()
  const skipped = []

  for (const [repo, types] of needed.entries()) {
    const repoPath = join(workspaceRoot, 'repos', repo)
    if (!existsSync(repoPath)) {
      skipped.push(
        { check: 'link-file', repo, reason: 'not cloned under repos/' },
        { check: 'link-test', repo, reason: 'not cloned under repos/' }
      )
      continue
    }
    cloned.add(repo)
    if (isJavaRepo(gates, repo)) continue
    if (!existsSync(join(repoPath, 'node_modules'))) {
      skipped.push({
        check: 'link-test',
        repo,
        reason: 'no node_modules — run npm ci'
      })
      continue
    }
    indexes[repo] = await buildRepoIndex({ repoPath, types, run })
  }

  return { gates, indexes, cloned, skipped }
}

/**
 * Check — every link's `file` exists in its named repo. Needs the clone
 * only (Tier B); skips a link whose repo is not cloned rather than
 * failing it.
 *
 * @param {object} capability
 * @param {string} workspaceRoot
 * @param {Set<string>} cloned
 * @returns {object[]}
 */
export const checkLinkFilesExist = (capability, workspaceRoot, cloned) =>
  linksOf(capability)
    .filter((link) => cloned.has(link.repo))
    .filter(
      (link) => !existsSync(join(workspaceRoot, 'repos', link.repo, link.file))
    )
    .map((link) =>
      finding(
        'link-file',
        capability.path,
        `${link.scenarioId} links to repos/${link.repo}/${link.file}, which does not exist.`
      )
    )

/**
 * Check — every link's `test` resolves to a real test title, via the
 * two-tier resolver in resolve.js. Needs the runner index (Tier C) or, for
 * a Java repo, the clone alone.
 *
 * @param {object} capability
 * @param {string} workspaceRoot
 * @param {{gates: object, indexes: Record<string, object>, cloned: Set<string>}} resolution
 * @returns {object[]}
 */
export const checkLinkTestsResolve = (
  capability,
  workspaceRoot,
  { gates, indexes, cloned }
) =>
  linksOf(capability)
    .filter((link) => cloned.has(link.repo))
    .filter((link) => indexes[link.repo] || isJavaRepo(gates, link.repo))
    .filter((link) => {
      const javaSourceText = isJavaRepo(gates, link.repo)
        ? readFileIfExists(join(workspaceRoot, 'repos', link.repo, link.file))
        : undefined
      return !resolveLink({ link, index: indexes[link.repo], javaSourceText })
        .resolved
    })
    .map((link) =>
      finding(
        'link-test',
        capability.path,
        `${link.scenarioId}: "${link.test}" does not resolve to a real test in repos/${link.repo}/${link.file}.`
      )
    )
