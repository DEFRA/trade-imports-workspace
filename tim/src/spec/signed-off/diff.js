import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../../errors.js'
import { run } from '../../exec/exec.js'
import { buildCorpus } from '../corpus.js'
import {
  capabilityOf,
  changedCapabilities,
  coverageEntries,
  endsOf,
  fileAt,
  scenarioKey,
  shaOf,
  specScenarios
} from '../diff.js'
import { linkedTestChange } from './test-blocks.js'
import { draftSignedOffTicket } from './ticket-draft.js'

const SIGNED_OFF_LINE = /^\*\*Signed off\*\*:/

const trimmedLinesOf = (body) =>
  body.split(/\r\n|\r|\n/).map((line) => line.trim())

const isSignedOff = (scenario) =>
  trimmedLinesOf(scenario.body).some((line) => SIGNED_OFF_LINE.test(line))

const stepsOf = (scenario) =>
  trimmedLinesOf(scenario.body).filter(
    (line) => line !== '' && !SIGNED_OFF_LINE.test(line)
  )

const sameBehaviour = (first, second) =>
  first.name === second.name &&
  stepsOf(first).join('\n') === stepsOf(second).join('\n')

const versionOf = (scenario) =>
  scenario ? { name: scenario.name, steps: stepsOf(scenario) } : null

const verdict = (change, why) => ({ change, why })

const rewrittenVerdict = (after) =>
  isSignedOff(after)
    ? verdict(
        'changed',
        'It was signed off, and the change rewrites its name or steps.'
      )
    : verdict(
        'changed',
        'It was signed off, and the change rewrites its name or steps and removes its Signed off mark.'
      )

const signedOffVerdict = (before, after) => {
  if (!before) {
    return after && isSignedOff(after)
      ? verdict('added', 'It is new and already marked signed off.')
      : null
  }
  if (!isSignedOff(before)) return null
  if (!after) {
    return verdict('removed', 'It was signed off, and the change removes it.')
  }
  if (!sameBehaviour(before, after)) return rewrittenVerdict(after)
  return isSignedOff(after)
    ? null
    : verdict('unmarked', 'The change removes its Signed off mark.')
}

const byCapabilityThenId = (first, second) =>
  first.capability.localeCompare(second.capability) ||
  (first.id ?? first.name).localeCompare(second.id ?? second.name)

const scenarioEntry = ({ capability, before, after, foundIn, found }) => {
  const scenario = after ?? before
  return {
    id: scenario.id ?? null,
    name: scenario.name,
    capability,
    requirementId: scenario.requirementId ?? null,
    ...found,
    foundIn,
    before: versionOf(before),
    after: versionOf(after)
  }
}

const specPathOf = (capability) => `openspec/specs/${capability}/spec.md`

const capabilitySpecChanges = ({
  capability,
  beforeText,
  afterText,
  foundIn
}) => {
  const before = specScenarios(beforeText)
  const after = specScenarios(afterText)
  const entryFor = (key) => {
    const found = signedOffVerdict(before.get(key), after.get(key))
    if (!found) return []
    return [
      scenarioEntry({
        capability,
        before: before.get(key),
        after: after.get(key),
        foundIn,
        found
      })
    ]
  }
  return [...new Set([...before.keys(), ...after.keys()])].flatMap(entryFor)
}

const committedSpecChanges = async (cwd, ends, capability, foundIn) => {
  const [beforeText, afterText] = await Promise.all([
    fileAt(cwd, ends.from, specPathOf(capability)),
    fileAt(cwd, ends.to, specPathOf(capability))
  ])
  return capabilitySpecChanges({ capability, beforeText, afterText, foundIn })
}

const foundInOf = (named, ends) =>
  named.range === undefined
    ? { commit: named.commit, sha: ends.to }
    : { range: named.range, from: ends.from, to: ends.to }

const refusedRange = ({ skipped, missing }) =>
  missing
    ? new TimError(
        'NOT_FOUND',
        `Can't find ${missing}. Fetch first, or name another --range.`
      )
    : new TimError('USAGE', `${skipped}. Name another --range.`)

const specSignedOffChanges = async (cwd, named) => {
  const ends = await endsOf(cwd, named)
  if (ends.skipped && named.range !== undefined) throw refusedRange(ends)
  if (ends.skipped) {
    return {
      skipped: { commit: named.commit ?? named.range, reason: ends.skipped }
    }
  }
  const { capabilities } = await changedCapabilities(cwd, ends.from, ends.to)
  const scenarios = (
    await Promise.all(
      capabilities.map((capability) =>
        committedSpecChanges(cwd, ends, capability, foundInOf(named, ends))
      )
    )
  ).flat()
  return { scenarios: scenarios.sort(byCapabilityThenId) }
}

const SPEC_PATHS = ['openspec/specs', 'openspec/coverage']

const workspaceGitLines = async (cwd, args) => {
  const result = await run('git', args, { cwd })
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Can't read the workspace's uncommitted openspec/ change: ${result.stderr.trim()}`
    )
  }
  return result.stdout.split('\n').filter((line) => line.trim() !== '')
}

const uncommittedCapabilities = async (cwd) => {
  const [tracked, untracked] = await Promise.all([
    workspaceGitLines(cwd, [
      'diff',
      '--name-only',
      'HEAD',
      '--',
      ...SPEC_PATHS
    ]),
    workspaceGitLines(cwd, [
      'ls-files',
      '--others',
      '--exclude-standard',
      '--',
      ...SPEC_PATHS
    ])
  ])
  return [
    ...new Set([...tracked, ...untracked].map(capabilityOf).filter(Boolean))
  ].sort()
}

const workingTreeText = (cwd, path) => {
  const fullPath = join(cwd, path)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : null
}

const uncommittedSpecChanges = async (cwd) => {
  const capabilities = await uncommittedCapabilities(cwd)
  const scenarios = await Promise.all(
    capabilities.map(async (capability) =>
      capabilitySpecChanges({
        capability,
        beforeText: await fileAt(cwd, 'HEAD', specPathOf(capability)),
        afterText: workingTreeText(cwd, specPathOf(capability)),
        foundIn: { uncommitted: true }
      })
    )
  )
  return scenarios.flat().sort(byCapabilityThenId)
}

const checkedOutRepoPath = async (workspaceRoot, repo, base) => {
  const repoPath = join(workspaceRoot, 'repos', repo)
  if (!existsSync(join(repoPath, '.git'))) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find repos/${repo}. Check the name, or clone it first.`
    )
  }
  if (!(await shaOf(repoPath, `${base}^{commit}`))) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${base} in repos/${repo}. Fetch first, or name another --base.`
    )
  }
  return repoPath
}

const statusPairs = (fields) =>
  Array.from({ length: Math.floor(fields.length / 2) }, (_, index) => [
    fields[index * 2],
    fields[index * 2 + 1]
  ])

const mergeBaseOf = async (repoPath, repo, base) => {
  const result = await run('git', ['merge-base', base, 'HEAD'], {
    cwd: repoPath
  })
  if (result.exitCode !== 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find where repos/${repo} left ${base}. Fetch first, or name another --base.`
    )
  }
  return result.stdout.trim()
}

const changedRepoFiles = async (repoPath, repo, base, mergeBase) => {
  const result = await run(
    'git',
    ['diff', '--name-status', '--no-renames', '-z', mergeBase],
    { cwd: repoPath }
  )
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Can't compare repos/${repo} with ${base}: ${result.stderr.trim()}`
    )
  }
  const fields = result.stdout.split('\0').filter((field) => field !== '')
  return new Set(
    statusPairs(fields)
      .filter(([status]) => status !== 'A')
      .map(([, path]) => path)
  )
}

const titlesOf = (links) => [
  ...new Set(links.map((link) => link.test).filter(Boolean))
]

const hasUntitledLink = (links) => links.some((link) => !link.test)

const fileLinkChanges = (file, links, versions) => {
  const titled = titlesOf(links).map((title) => ({
    title,
    found: linkedTestChange({ title, file, ...versions })
  }))
  const untitled = hasUntitledLink(links)
    ? [{ title: null, found: linkedTestChange({ file, ...versions }) }]
    : []
  return [...titled, ...untitled].filter(({ found }) => found !== null)
}

const changeWhy = ({ check, file, change, changed }) =>
  [
    `A test linked to it in coverage.json is ${change}: ${check.repo}/${file}.`,
    ...new Set(changed.map(({ found }) => found.fileLevel).filter(Boolean))
  ].join(' ')

const fileTestEntries = ({ check, file, changes, scenarioOf }) =>
  Object.entries(Object.groupBy(changes, ({ found }) => found.change)).map(
    ([change, changed]) =>
      scenarioEntry({
        ...scenarioOf,
        foundIn: { repo: check.repo, base: check.base },
        found: {
          ...verdict(
            `test-${change}`,
            changeWhy({ check, file, change, changed })
          ),
          test: {
            repo: check.repo,
            file,
            titles: changed.map(({ title }) => title).filter(Boolean)
          }
        }
      })
  )

const testEntriesFor = ({
  capability,
  requirement,
  scenario,
  links,
  check
}) => {
  const changedLinks = links.filter(
    (link) => link.repo === check.repo && check.versions.has(link.file)
  )
  const scenarioOf = {
    capability,
    before: { ...scenario, requirementId: requirement.id },
    after: { ...scenario, requirementId: requirement.id }
  }
  return Object.entries(
    Object.groupBy(changedLinks, (link) => link.file)
  ).flatMap(([file, fileLinks]) =>
    fileTestEntries({
      check,
      file,
      changes: fileLinkChanges(file, fileLinks, check.versions.get(file)),
      scenarioOf
    })
  )
}

const capabilityTestChanges = (capability, check) => {
  const coverage = coverageEntries(capability.coverage)
  return capability.requirements.flatMap((requirement) =>
    requirement.scenarios.filter(isSignedOff).flatMap((scenario) =>
      testEntriesFor({
        capability: capability.path,
        requirement,
        scenario,
        links: coverage.get(scenarioKey(scenario))?.tests ?? [],
        check
      })
    )
  )
}

const linkedFilesIn = (capabilities, repo) =>
  new Set(
    capabilities.flatMap((capability) =>
      [...coverageEntries(capability.coverage).values()].flatMap((scenario) =>
        (scenario.tests ?? [])
          .filter((link) => link.repo === repo)
          .map((link) => link.file)
      )
    )
  )

const fileVersions = async (repoPath, mergeBase, file) => ({
  baseText: await fileAt(repoPath, mergeBase, file),
  currentText: workingTreeText(repoPath, file)
})

const versionsOfFiles = async (repoPath, mergeBase, files) =>
  new Map(
    await Promise.all(
      files.map(async (file) => [
        file,
        await fileVersions(repoPath, mergeBase, file)
      ])
    )
  )

const linkedTestChanges = async (workspaceRoot, repo, base) => {
  const repoPath = await checkedOutRepoPath(workspaceRoot, repo, base)
  const mergeBase = await mergeBaseOf(repoPath, repo, base)
  const changedFiles = await changedRepoFiles(repoPath, repo, base, mergeBase)
  if (changedFiles.size === 0) return []
  const capabilities = buildCorpus({
    root: workspaceRoot
  }).capabilities.filter((capability) => capability.hasSpec)
  const changedLinkedFiles = [...linkedFilesIn(capabilities, repo)].filter(
    (file) => changedFiles.has(file)
  )
  const check = {
    repo,
    base,
    versions: await versionsOfFiles(repoPath, mergeBase, changedLinkedFiles)
  }
  return capabilities
    .flatMap((capability) => capabilityTestChanges(capability, check))
    .sort(byCapabilityThenId)
}

/**
 * Every change to a signed-off scenario: one the commits or ranges added
 * already signed off, rewrote, removed or took the Signed off mark from;
 * with `uncommitted`, the same for the workspace's uncommitted change to
 * `openspec/` against HEAD, new files included; and, for each of `repos`,
 * each signed-off scenario in the workspace's own `openspec/` whose linked
 * test in that repo is edited or deleted since HEAD left `base`, counting
 * uncommitted work. A linked test counts only when its own block changes,
 * unless it cannot be told apart from the rest of its file; then any
 * change to the file counts and `why` says so. A test only `base` has
 * changed since is left out. `ticketDraft` is the Jira ticket for a person
 * to approve or refuse them, or null when there are none.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string[]} [args.commits]
 * @param {string[]} [args.ranges]
 * @param {boolean} [args.uncommitted]
 * @param {string[]} [args.repos] - Folders under `repos/`
 * @param {string} [args.base] - A ref in each of `repos`; given with them
 * @returns {Promise<{signedOff: object[], skipped: {commit: string, reason: string}[], ticketDraft: {summary: string, description: string}|null}>}
 * @throws {TimError} NOT_FOUND when a repo, its base or an end of a range
 * cannot be found; USAGE when a range is not one or has no merge base
 */
export const diffSignedOff = async ({
  workspaceRoot,
  commits = [],
  ranges = [],
  uncommitted = false,
  repos = [],
  base
}) => {
  const named = [
    ...commits.map((commit) => ({ commit })),
    ...ranges.map((range) => ({ range }))
  ]
  const [specOutcomes, uncommittedChanges, testChanges] = await Promise.all([
    Promise.all(named.map((each) => specSignedOffChanges(workspaceRoot, each))),
    uncommitted ? uncommittedSpecChanges(workspaceRoot) : [],
    Promise.all(
      repos.map((repo) => linkedTestChanges(workspaceRoot, repo, base))
    )
  ])
  const signedOff = [
    ...specOutcomes.flatMap((outcome) => outcome.scenarios ?? []),
    ...uncommittedChanges,
    ...testChanges.flat()
  ]
  return {
    signedOff,
    skipped: specOutcomes.flatMap((outcome) =>
      outcome.skipped ? [outcome.skipped] : []
    ),
    ticketDraft: draftSignedOffTicket(signedOff)
  }
}
