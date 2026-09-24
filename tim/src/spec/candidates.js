import { dirname, join } from 'node:path'
import { run as runProcess } from '../exec/exec.js'
import { repoPath } from '../constants/repos.js'
import { buildCorpus } from './corpus.js'
import { linksOf } from './checks/links.js'
import { computeStaleness, loadBaseline, changedFilesSince } from './status.js'
import { runSpecLint } from './lint.js'
import { computeSpecGaps } from './gaps.js'

const inScope = (capabilityPath, scopeCapability) =>
  !scopeCapability ||
  capabilityPath === scopeCapability ||
  capabilityPath.startsWith(`${scopeCapability}/`)

const commitLogFor = async ({ workspaceRoot, repoEntry, run }) => {
  if (!repoEntry.cloned || repoEntry.baselineSha === repoEntry.headSha) {
    return []
  }
  const result = await run('git', [
    '-C',
    repoPath(workspaceRoot, repoEntry.repo),
    'log',
    `${repoEntry.baselineSha}..${repoEntry.headSha}`,
    '--oneline'
  ])
  return result.stdout.split('\n').filter(Boolean)
}

/**
 * Whether a capability's own coverage.json changed in the workspace's own
 * git history since the baseline was verified — the "a linked test file
 * changed and its scenario did not" signal. `baseline.verifiedBy` is the
 * workspace commit the hand re-verify landed in, so it doubles as the
 * workspace-side range start.
 *
 * @param {object} args
 * @returns {Promise<boolean>}
 */
const coverageTouchedSinceBaseline = async ({
  workspaceRoot,
  capabilityPath,
  verifiedBy,
  run
}) => {
  const result = await run('git', [
    '-C',
    workspaceRoot,
    'log',
    `${verifiedBy}..HEAD`,
    '--oneline',
    '--',
    join('openspec', 'coverage', capabilityPath, 'coverage.json')
  ])
  return result.stdout.trim().length > 0
}

/**
 * --wide: whether any file in the same directory as a changed linked file
 * also changed, beyond the linked file itself — catches source drift a
 * test-file-only diff misses, at the cost of precision.
 *
 * @param {object} args
 * @returns {Promise<Set<string>>} repo-relative directories with any change
 */
const widenedDirectories = async ({ workspaceRoot, repoEntry, run }) => {
  if (!repoEntry.cloned || repoEntry.baselineSha === repoEntry.headSha) {
    return new Set()
  }
  const dir = repoPath(workspaceRoot, repoEntry.repo)
  const allChanged = await changedFilesSince(
    dir,
    repoEntry.baselineSha,
    repoEntry.headSha,
    run
  )
  return new Set(allChanged.map((file) => dirname(file)))
}

const buildWorkPacket = ({
  capability,
  links,
  changedLinkCount,
  coverageUpdated,
  wide
}) => ({
  capability,
  linkCount: links.length,
  links,
  changedLinkCount,
  coverageUpdatedSinceBaseline: coverageUpdated,
  wide
})

/**
 * What the next sweep should look at: linked test files changed since the
 * baseline, grouped into work packets per capability; the "a linked file
 * changed but its coverage.json did not" flag per packet; unresolved
 * links from `tim spec lint`; the known holes from `tim spec gaps` (so
 * the sweep does not re-report them); and the commit log per repo, for
 * triage.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.capability] - Scope to one capability and its descendants
 * @param {boolean} [args.wide] - Also flag a capability whose linked file's directory changed, even if the linked file itself did not
 * @param {Function} [args.run]
 * @returns {Promise<object>}
 */
export const computeSpecCandidates = async ({
  workspaceRoot,
  capability,
  wide = false,
  run = runProcess
}) => {
  const baseline = loadBaseline(workspaceRoot)
  const staleness = await computeStaleness({ workspaceRoot, run })
  const [lint, gaps] = await Promise.all([
    runSpecLint({ workspaceRoot, run }),
    computeSpecGaps({ workspaceRoot })
  ])

  const corpus = buildCorpus({ root: workspaceRoot })
  const changedFilesByRepo = Object.fromEntries(
    staleness.repos.map((entry) => [
      entry.repo,
      new Set(entry.changedLinkedFiles)
    ])
  )
  const widenedByRepo = wide
    ? Object.fromEntries(
        await Promise.all(
          staleness.repos.map(async (entry) => [
            entry.repo,
            await widenedDirectories({ workspaceRoot, repoEntry: entry, run })
          ])
        )
      )
    : {}

  const packets = []
  for (const capabilityEntry of corpus.capabilities) {
    if (!inScope(capabilityEntry.path, capability)) continue
    const allLinks = linksOf(capabilityEntry)
    const changedLinks = allLinks.filter((link) =>
      changedFilesByRepo[link.repo]?.has(link.file)
    )
    const widenedLinks = wide
      ? allLinks.filter(
          (link) =>
            !changedFilesByRepo[link.repo]?.has(link.file) &&
            widenedByRepo[link.repo]?.has(dirname(link.file))
        )
      : []
    if (changedLinks.length === 0 && widenedLinks.length === 0) continue

    const coverageUpdated = await coverageTouchedSinceBaseline({
      workspaceRoot,
      capabilityPath: capabilityEntry.path,
      verifiedBy: baseline.verifiedBy,
      run
    })

    packets.push(
      buildWorkPacket({
        capability: capabilityEntry.path,
        links: [...changedLinks, ...widenedLinks],
        changedLinkCount: changedLinks.length,
        coverageUpdated,
        wide: widenedLinks.length > 0
      })
    )
  }
  packets.sort(
    (a, b) =>
      b.linkCount - a.linkCount || a.capability.localeCompare(b.capability)
  )

  const commitLog = Object.fromEntries(
    await Promise.all(
      staleness.repos.map(async (entry) => [
        entry.repo,
        await commitLogFor({ workspaceRoot, repoEntry: entry, run })
      ])
    )
  )

  return {
    staleness,
    workPackets: packets,
    unresolvedLinks: lint.findings.filter(
      (finding) =>
        finding.check === 'link-file' || finding.check === 'link-test'
    ),
    knownGaps: gaps.rows,
    commitLog: Object.fromEntries(
      Object.entries(commitLog).filter(([, log]) => log.length > 0)
    )
  }
}
