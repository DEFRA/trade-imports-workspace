import { run } from '../exec/exec.js'
import { parseSpecMarkdown } from './corpus.js'

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
const SPEC_FILE = /^openspec\/specs\/(.+)\/spec\.md$/
const COVERAGE_FILE = /^openspec\/coverage\/(.+)\/coverage\.json$/

const git = (cwd, args) => run('git', args, { cwd })

export const shaOf = async (cwd, ref) => {
  const result = await git(cwd, ['rev-parse', '--verify', '--quiet', ref])
  return result.exitCode === 0 ? result.stdout.trim() : null
}

export const fileAt = async (cwd, ref, path) => {
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

export const capabilityOf = (file) =>
  file.match(SPEC_FILE)?.[1] ?? file.match(COVERAGE_FILE)?.[1] ?? null

export const changedCapabilities = async (cwd, from, to) => {
  const { stdout } = await git(cwd, [
    'diff',
    '--name-only',
    from,
    to,
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

export const scenarioKey = (scenario) => scenario.id ?? `name:${scenario.name}`

export const specScenarios = (specText) =>
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

export const coverageEntries = (coverage) =>
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

const capabilityChanges = async (cwd, from, to, capability) => {
  const specPath = `openspec/specs/${capability}/spec.md`
  const coveragePath = `openspec/coverage/${capability}/coverage.json`
  const [specBefore, specAfter, coverageBefore, coverageAfter] =
    await Promise.all([
      fileAt(cwd, from, specPath),
      fileAt(cwd, to, specPath),
      jsonAt(cwd, from, coveragePath),
      jsonAt(cwd, to, coveragePath)
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

const rangeEnds = async (cwd, range) => {
  const parts = range.match(/^(.+?)(\.\.\.?)(.+)$/)
  if (!parts) return { skipped: `${range} is not a range such as main..HEAD` }
  const [, baseRef, dots, headRef] = parts
  const [base, to] = await Promise.all([
    shaOf(cwd, `${baseRef}^{commit}`),
    shaOf(cwd, `${headRef}^{commit}`)
  ])
  if (!base || !to) {
    return { skipped: `${range} names a commit that is not in this repo` }
  }
  if (dots === '..') return { from: base, to }
  const mergeBase = await git(cwd, ['merge-base', base, to])
  return mergeBase.exitCode === 0
    ? { from: mergeBase.stdout.trim(), to }
    : { skipped: `${range} has no merge base` }
}

const commitEnds = async (cwd, commit) => {
  const to = await shaOf(cwd, `${commit}^{commit}`)
  if (!to) return { skipped: `${commit} is not a commit in this repo` }
  return { from: (await shaOf(cwd, `${to}^1`)) ?? EMPTY_TREE, to }
}

/**
 * The two trees a commit or a range compares: a commit against its first
 * parent, or nothing for a first commit; `base..head` from base to head;
 * `base...head` from their merge base to head.
 *
 * @param {string} cwd
 * @param {{commit: string}|{range: string}} named
 * @returns {Promise<{from: string, to: string}|{skipped: string}>}
 */
export const endsOf = (cwd, named) =>
  named.range === undefined
    ? commitEnds(cwd, named.commit)
    : rangeEnds(cwd, named.range)

const changesBetween = async (cwd, { from, to }) => {
  const { files, capabilities } = await changedCapabilities(cwd, from, to)
  const scenarios = (
    await Promise.all(
      capabilities.map((capability) =>
        capabilityChanges(cwd, from, to, capability)
      )
    )
  ).flat()
  return { files, scenarios }
}

const commitChanges = async (cwd, commit) => {
  const ends = await endsOf(cwd, { commit })
  if (ends.skipped) return { commit, skipped: ends.skipped }
  return { commit, sha: ends.to, ...(await changesBetween(cwd, ends)) }
}

const rangeChanges = async (cwd, range) => {
  const ends = await endsOf(cwd, { range })
  if (ends.skipped) return { commit: range, skipped: ends.skipped }
  return { range, ...ends, ...(await changesBetween(cwd, ends)) }
}

const touchedIds = (changes) => [
  ...new Set(
    changes.flatMap(({ scenarios }) =>
      scenarios
        .filter(({ id, change }) => id && change !== 'removed')
        .map(({ id }) => id)
    )
  )
]

const skippedOf = (outcomes) =>
  outcomes
    .filter((outcome) => outcome.skipped)
    .map(({ commit, skipped }) => ({ commit, reason: skipped }))

/**
 * What each commit or range changed in the Behaviour Spec, scenario by
 * scenario: each scenario it added, changed (name or steps), removed, or
 * only re-proved (its coverage.json entry changed), with the coverage it
 * has after. A commit compares with its first parent, a range as `endsOf`
 * says. A commit or range git cannot find in the workspace repo is listed
 * in `skipped`, not treated as an error. `touched` is every scenario id
 * they added, changed or re-proved.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string[]} [args.commits]
 * @param {string[]} [args.ranges]
 * @returns {Promise<{commits: object[], ranges: object[], skipped: {commit: string, reason: string}[], touched: string[]}>}
 */
export const diffSpecCommits = async ({
  workspaceRoot,
  commits = [],
  ranges = []
}) => {
  const [commitOutcomes, rangeOutcomes] = await Promise.all([
    Promise.all(commits.map((commit) => commitChanges(workspaceRoot, commit))),
    Promise.all(ranges.map((range) => rangeChanges(workspaceRoot, range)))
  ])
  const found = (outcomes) => outcomes.filter((outcome) => !outcome.skipped)
  return {
    commits: found(commitOutcomes),
    ranges: found(rangeOutcomes),
    skipped: skippedOf([...commitOutcomes, ...rangeOutcomes]),
    touched: touchedIds([...found(commitOutcomes), ...found(rangeOutcomes)])
  }
}
