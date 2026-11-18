import { resolveSpecRoot } from './config.js'
import { buildCorpus } from './corpus.js'
import { inScope } from './scope.js'
import { validateWithOpenspecCli } from './openspec-cli.js'
import {
  checkCoverageShape,
  checkNoneHasNotes,
  checkAreaCodeAndSpecFile,
  readAreasTable
} from './checks/shape.js'
import {
  checkIdsPresent,
  checkIdParity,
  checkNameParity,
  checkGlobalIdUniqueness,
  checkCoverageIdsUnique
} from './checks/ids.js'
import { checkTestTitlesExist, testFileReader } from './checks/test-titles.js'
import {
  checkScenarioRollup,
  checkRequirementRollup
} from './checks/rollups.js'
import {
  checkThenPresent,
  checkNoShall,
  checkCrossReferences
} from './checks/conventions.js'
import {
  checkMaturityLine,
  checkSignedOffMarks,
  checkSignedOffNeedsSignedOffPage
} from './checks/maturity.js'
import {
  checkPageLine,
  checkPageMaturityMatchesFrontend,
  pageMaturityReader
} from './checks/page-maturity.js'
import { TimError } from '../errors.js'

const pairingFindings = (capability) => {
  if (capability.hasSpec && !capability.hasCoverage) {
    return [
      {
        check: 'pairing',
        capability: capability.path,
        message: 'spec.md has no matching coverage.json.'
      }
    ]
  }
  if (!capability.hasSpec && capability.hasCoverage) {
    return [
      {
        check: 'pairing',
        capability: capability.path,
        message: 'coverage.json has no matching spec.md.'
      }
    ]
  }
  return []
}

/**
 * The three groups every check belongs to, named for what the check reads.
 * `coverage` and `binding` are pure file reads, finishing in well under a
 * second on their own. `specs` additionally delegates two checks to
 * `openspec validate` via `npx` (openspec-cli.js), which shells out and
 * can take several seconds, especially cold.
 */
export const CHECK_GROUPS = ['specs', 'coverage', 'binding']

// Ordered as the findings appear in the report, and tagged rather than
// blocked by group: that keeps the order stable when a group is left out,
// so a narrowed run is a filter over this list and not a different walk.
const CAPABILITY_CHECKS = [
  { group: 'binding', run: (capability) => pairingFindings(capability) },
  { group: 'coverage', run: (capability) => checkCoverageShape(capability) },
  { group: 'coverage', run: (capability) => checkNoneHasNotes(capability) },
  {
    group: 'coverage',
    run: (capability, { areasTable }) =>
      checkAreaCodeAndSpecFile(capability, areasTable)
  },
  { group: 'specs', run: (capability) => checkIdsPresent(capability) },
  { group: 'binding', run: (capability) => checkIdParity(capability) },
  { group: 'binding', run: (capability) => checkNameParity(capability) },
  {
    group: 'coverage',
    run: (capability) => checkCoverageIdsUnique(capability)
  },
  { group: 'coverage', run: (capability) => checkScenarioRollup(capability) },
  {
    group: 'coverage',
    run: (capability) => checkRequirementRollup(capability)
  },
  { group: 'specs', run: (capability) => checkThenPresent(capability) },
  { group: 'specs', run: (capability) => checkNoShall(capability) },
  {
    group: 'specs',
    run: (capability, { knownCapabilityPaths }) =>
      checkCrossReferences(capability, knownCapabilityPaths)
  },
  { group: 'specs', run: (capability) => checkMaturityLine(capability) },
  { group: 'specs', run: (capability) => checkSignedOffMarks(capability) },
  {
    group: 'specs',
    run: (capability) => checkSignedOffNeedsSignedOffPage(capability)
  },
  { group: 'specs', run: (capability) => checkPageLine(capability) }
]

const capabilityChecksFor = (groups) =>
  CAPABILITY_CHECKS.filter((check) => groups.includes(check.group))

const UNSELECTED_REASON = 'not selected'

// A group that did not run is reported, not omitted: a green narrow run
// must never read like a green full one.
const unselectedGroupSkips = (groups) =>
  CHECK_GROUPS.filter((group) => !groups.includes(group)).map((group) => ({
    check: group,
    repo: null,
    reason: UNSELECTED_REASON
  }))

/**
 * Every check: those delegated to `openspec validate --specs --strict
 * --json` (openspec-cli.js), and the workspace-only ones under checks/.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.root] - Overrides the spec root
 * @param {string} [args.capability] - Scope to one capability path and its descendants
 * @param {string[]} [args.groups] - Which of CHECK_GROUPS to run; defaults to all three
 * @param {Function} [args.run] - The subprocess seam for the delegated openspec-validate call
 * @returns {Promise<{specRoot: string, capabilityCount: number, findings: object[], skipped: object[]}>}
 * @throws {TimError} NOT_FOUND when --capability names nothing in the corpus
 */
export const runSpecLint = async ({
  workspaceRoot,
  root,
  capability,
  groups = CHECK_GROUPS,
  run
}) => {
  const specRoot = resolveSpecRoot({ workspaceRoot, root })
  const corpus = buildCorpus({ root: specRoot })

  if (
    capability &&
    !corpus.capabilities.some((entry) => inScope(entry.path, capability))
  ) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find capability "${capability}" under ${specRoot}/openspec.`
    )
  }

  const scoped = corpus.capabilities.filter((entry) =>
    inScope(entry.path, capability)
  )
  const knownCapabilityPaths = new Set(
    corpus.capabilities
      .filter((entry) => entry.hasSpec)
      .map((entry) => entry.path)
  )
  const wants = (group) => groups.includes(group)
  const areasTable = wants('coverage') ? readAreasTable(specRoot) : null

  const openspecCapability =
    capability &&
    corpus.capabilities.some(
      (entry) => entry.hasSpec && entry.path === capability
    )
      ? capability
      : undefined

  const openspecFindings = wants('specs')
    ? (
        await validateWithOpenspecCli({
          specRoot,
          capability: openspecCapability,
          run
        })
      ).filter((finding) => inScope(finding.capability, capability))
    : []

  const context = { areasTable, knownCapabilityPaths }
  const checks = capabilityChecksFor(groups)
  const localFindings = scoped.flatMap((entry) =>
    checks.flatMap((check) => check.run(entry, context))
  )

  const testFiles = testFileReader(workspaceRoot)
  const titleResults = wants('binding')
    ? scoped.map((entry) => checkTestTitlesExist(entry, testFiles))
    : []
  const pages = pageMaturityReader(workspaceRoot)
  const pageResults = wants('binding')
    ? scoped.map((entry) => checkPageMaturityMatchesFrontend(entry, pages))
    : []
  const repoFindings = [...titleResults, ...pageResults].flatMap(
    (result) => result.findings
  )
  const uncheckedRepoSkips = (check, results) =>
    [...new Set(results.flatMap((result) => result.uncheckedRepos))].map(
      (repo) => ({ check, repo, reason: 'not checked out under repos/' })
    )
  const repoSkips = [
    ...uncheckedRepoSkips('test-titles', titleResults),
    ...uncheckedRepoSkips('page-maturity', pageResults)
  ]

  const globalIdFindings = wants('specs')
    ? checkGlobalIdUniqueness(corpus.capabilities).filter((finding) =>
        inScope(finding.capability, capability)
      )
    : []

  return {
    specRoot,
    capabilityCount: scoped.length,
    groups,
    findings: [
      ...openspecFindings,
      ...localFindings,
      ...repoFindings,
      ...globalIdFindings
    ],
    skipped: [...unselectedGroupSkips(groups), ...repoSkips]
  }
}
