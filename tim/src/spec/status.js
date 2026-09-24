import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { run as runProcess } from '../exec/exec.js'
import { readJsonFile } from '../backlog/io.js'
import { repoPath } from '../constants/repos.js'
import { buildCorpus } from './corpus.js'
import { linksOf } from './checks/links.js'

export const BASELINE_PATH = join('openspec', 'baseline.json')

/**
 * The per-repo sha and date the Behaviour Spec was last hand-verified
 * against.
 *
 * @param {string} workspaceRoot
 * @returns {{verifiedAt: string, verifiedBy: string, repos: Record<string, string>}}
 * @throws {TimError} NOT_FOUND when openspec/baseline.json is missing
 */
export const loadBaseline = (workspaceRoot) =>
  readJsonFile(join(workspaceRoot, BASELINE_PATH))

export const headSha = async (repoDir, run) => {
  const result = await run('git', ['-C', repoDir, 'rev-parse', 'HEAD'])
  return result.exitCode === 0 ? result.stdout.trim() : null
}

/**
 * Every file that changed in a repo between two shas — the raw list, not
 * intersected with anything. `tim spec candidates --wide` reuses this to
 * check a linked file's whole directory, not just the file itself.
 *
 * @param {string} repoDir
 * @param {string} baselineSha
 * @param {string} headOfHead
 * @param {Function} run
 * @returns {Promise<string[]>}
 */
export const changedFilesSince = async (
  repoDir,
  baselineSha,
  headOfHead,
  run
) => {
  if (baselineSha === headOfHead) return []
  const result = await run('git', [
    '-C',
    repoDir,
    'log',
    `${baselineSha}..${headOfHead}`,
    '--name-only',
    '--pretty=format:'
  ])
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

const repoStatus = async ({
  repo,
  baselineSha,
  workspaceRoot,
  allLinks,
  run
}) => {
  const dir = repoPath(workspaceRoot, repo)
  if (!existsSync(dir)) {
    return {
      repo,
      baselineSha,
      headSha: null,
      cloned: false,
      changedLinkedFiles: [],
      changedLinks: []
    }
  }
  const head = await headSha(dir, run)
  const changedFiles = new Set(
    await changedFilesSince(dir, baselineSha, head, run)
  )
  const changedLinks = allLinks.filter(
    (link) => link.repo === repo && changedFiles.has(link.file)
  )
  const changedLinkedFiles = [
    ...new Set(changedLinks.map((link) => link.file))
  ].sort()
  return {
    repo,
    baselineSha,
    headSha: head,
    cloned: true,
    changedLinkedFiles,
    changedLinks
  }
}

/**
 * How stale the Behaviour Spec is against the baseline: per repo, the
 * baseline sha and current HEAD, and which linked test files changed
 * between them; overall, how many linked files and links that touches,
 * and how many of the corpus's capabilities are affected.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {Function} [args.run] - The subprocess seam; defaults to tim's exec.run
 * @returns {Promise<object>}
 * @throws {TimError} NOT_FOUND when openspec/baseline.json is missing
 */
export const computeSpecStatus = async ({
  workspaceRoot,
  run = runProcess
}) => {
  const baseline = loadBaseline(workspaceRoot)
  const corpus = buildCorpus({ root: workspaceRoot })
  const allLinks = corpus.capabilities.flatMap((capability) =>
    linksOf(capability).map((link) => ({
      ...link,
      capability: capability.path
    }))
  )

  const repos = await Promise.all(
    Object.entries(baseline.repos).map(([repo, baselineSha]) =>
      repoStatus({ repo, baselineSha, workspaceRoot, allLinks, run })
    )
  )

  const allChangedLinks = repos.flatMap((entry) => entry.changedLinks)
  const capabilitiesAffected = new Set(
    allChangedLinks.map((link) => link.capability)
  )
  const totalChangedLinkedFiles = repos.reduce(
    (sum, entry) => sum + entry.changedLinkedFiles.length,
    0
  )

  return {
    verifiedAt: baseline.verifiedAt,
    verifiedBy: baseline.verifiedBy,
    repos: repos.map(({ changedLinks: _changedLinks, ...rest }) => rest),
    totalChangedLinkedFiles,
    totalChangedLinks: allChangedLinks.length,
    capabilitiesAffected: capabilitiesAffected.size,
    capabilityCount: corpus.capabilities.length
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const daysAgo = (isoDate) =>
  Math.floor((Date.now() - new Date(isoDate).getTime()) / ONE_DAY_MS)

/**
 * `computeSpecStatus`'s result plus how many days old `verifiedAt` is —
 * the shape `renderStalenessLine` and every staleness-header consumer
 * (`tim workspace status`, `tim spec gaps`, `tim spec candidates`) reads.
 * Call this — not `computeSpecStatus` alone — wherever the staleness line
 * is rendered, or `daysAgo` will be undefined.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {Function} [args.run]
 * @returns {Promise<object|null>} `null` when openspec/baseline.json is missing
 */
export const computeStaleness = async ({ workspaceRoot, run }) => {
  try {
    const status = await computeSpecStatus({ workspaceRoot, run })
    return { ...status, daysAgo: daysAgo(status.verifiedAt) }
  } catch (error) {
    if (error.code === 'NOT_FOUND') return null
    throw error
  }
}

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`

/**
 * The one staleness line every spec command's header is built from, e.g.
 * "Behaviour Spec verified 2026-09-16 (7 days ago) — 10 linked test
 * files changed since, 65 links across 16 of 72 capabilities unverified."
 *
 * @param {object} staleness - From computeStaleness; must not be null
 * @returns {string}
 */
export const renderStalenessLine = (staleness) =>
  `Behaviour Spec verified ${staleness.verifiedAt} (${plural(staleness.daysAgo, 'day', 'days')} ago) — ` +
  `${plural(staleness.totalChangedLinkedFiles, 'linked test file', 'linked test files')} changed since, ` +
  `${plural(staleness.totalChangedLinks, 'link', 'links')} across ${staleness.capabilitiesAffected} of ${staleness.capabilityCount} capabilities unverified.`
