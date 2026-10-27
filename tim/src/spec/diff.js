import { run } from '../exec/exec.js'
import { parseSpecMarkdown } from './corpus.js'

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
const SPEC_FILE = /^openspec\/specs\/(.+)\/spec\.md$/
const COVERAGE_FILE = /^openspec\/coverage\/(.+)\/coverage\.json$/

const git = (cwd, args) => run('git', args, { cwd })

const shaOf = async (cwd, ref) => {
  const result = await git(cwd, ['rev-parse', '--verify', '--quiet', ref])
  return result.exitCode === 0 ? result.stdout.trim() : null
}

const fileAt = async (cwd, ref, path) => {
  const result = await git(cwd, ['show', `${ref}:${path}`])
  return result.exitCode === 0 ? result.stdout : null
}

const jsonAt = async (cwd, ref, path) => {
  const text = await fileAt(cwd, ref, path)
  try {
    return text === null ? null : JSON.parse(text)
  } catch {
    return null
  }
}

const capabilityOf = (file) =>
  file.match(SPEC_FILE)?.[1] ?? file.match(COVERAGE_FILE)?.[1] ?? null

const changedCapabilities = async (cwd, parent, sha) => {
  const { stdout } = await git(cwd, [
    'diff',
    '--name-only',
    parent,
    sha,
    '--',
    'openspec/specs',
    'openspec/coverage'
  ])
  const files = stdout.split('\n').filter((line) => line.trim().length > 0)
  return {
    files,
    capabilities: [...new Set(files.map(capabilityOf).filter(Boolean))].sort()
  }
}

const scenarioKey = (scenario) => scenario.id ?? `name:${scenario.name}`

const specScenarios = (specText) =>
  new Map(
    parseSpecMarkdown(specText ?? '').flatMap((requirement) =>
      requirement.scenarios.map((scenario) => [
        scenarioKey(scenario),
        {
          ...scenario,
          requirementId: requirement.id,
          requirementName: requirement.name
        }
      ])
    )
  )

const coverageEntries = (coverage) =>
  new Map(
    (coverage?.requirements ?? []).flatMap((requirement) =>
      (requirement.scenarios ?? []).map((scenario) => [
        scenarioKey(scenario),
        scenario
      ])
    )
  )

const sameText = (first, second) =>
  first.name === second.name && first.body.trim() === second.body.trim()

const changeOf = (key, spec, coverage) => {
  const before = spec.before.get(key)
  const after = spec.after.get(key)
  if (after && !before) return 'added'
  if (before && !after) return 'removed'
  if (before && after && !sameText(before, after)) return 'changed'
  const coverageBefore = JSON.stringify(coverage.before.get(key) ?? null)
  const coverageAfter = JSON.stringify(coverage.after.get(key) ?? null)
  return coverageBefore === coverageAfter ? null : 'coverage'
}

const describeScenario = (capability, key, change, spec, coverage) => {
  const scenario =
    spec.after.get(key) ?? spec.before.get(key) ?? coverage.after.get(key)
  return {
    id: scenario?.id ?? null,
    name: scenario?.name ?? key,
    capability,
    requirementId: scenario?.requirementId ?? null,
    requirementName: scenario?.requirementName ?? null,
    change,
    coverage: coverage.after.get(key)?.coverage ?? null
  }
}

const capabilityChanges = async (cwd, parent, sha, capability) => {
  const specPath = `openspec/specs/${capability}/spec.md`
  const coveragePath = `openspec/coverage/${capability}/coverage.json`
  const [specBefore, specAfter, coverageBefore, coverageAfter] =
    await Promise.all([
      fileAt(cwd, parent, specPath),
      fileAt(cwd, sha, specPath),
      jsonAt(cwd, parent, coveragePath),
      jsonAt(cwd, sha, coveragePath)
    ])
  const spec = {
    before: specScenarios(specBefore),
    after: specScenarios(specAfter)
  }
  const coverage = {
    before: coverageEntries(coverageBefore),
    after: coverageEntries(coverageAfter)
  }
  const keys = new Set([
    ...spec.before.keys(),
    ...spec.after.keys(),
    ...coverage.before.keys(),
    ...coverage.after.keys()
  ])
  return [...keys].flatMap((key) => {
    const change = changeOf(key, spec, coverage)
    return change
      ? [describeScenario(capability, key, change, spec, coverage)]
      : []
  })
}

const commitChanges = async (cwd, commit) => {
  const sha = await shaOf(cwd, `${commit}^{commit}`)
  if (!sha) return { commit, skipped: `${commit} is not a commit in this repo` }
  const parent = (await shaOf(cwd, `${sha}^1`)) ?? EMPTY_TREE
  const { files, capabilities } = await changedCapabilities(cwd, parent, sha)
  const scenarios = (
    await Promise.all(
      capabilities.map((capability) =>
        capabilityChanges(cwd, parent, sha, capability)
      )
    )
  ).flat()
  return { commit, sha, files, scenarios }
}

const touchedIds = (commits) => [
  ...new Set(
    commits.flatMap(({ scenarios }) =>
      scenarios
        .filter(({ id, change }) => id && change !== 'removed')
        .map(({ id }) => id)
    )
  )
]

/**
 * What each commit changed in the Behaviour Spec, scenario by scenario,
 * against its first parent: each scenario it added, changed (name or steps),
 * removed, or only re-proved (its coverage.json entry changed), with the
 * coverage it has after the commit. A commit git cannot find in the
 * workspace repo is listed in `skipped`, not treated as an error. `touched`
 * is every scenario id the commits added, changed or re-proved.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string[]} args.commits
 * @returns {Promise<{commits: object[], skipped: {commit: string, reason: string}[], touched: string[]}>}
 */
export const diffSpecCommits = async ({ workspaceRoot, commits }) => {
  const outcomes = await Promise.all(
    commits.map((commit) => commitChanges(workspaceRoot, commit))
  )
  const found = outcomes.filter((outcome) => !outcome.skipped)
  return {
    commits: found,
    skipped: outcomes
      .filter((outcome) => outcome.skipped)
      .map(({ commit, skipped }) => ({ commit, reason: skipped })),
    touched: touchedIds(found)
  }
}
