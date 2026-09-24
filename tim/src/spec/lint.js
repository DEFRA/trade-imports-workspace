import { resolveSpecRoot } from './config.js'
import { buildCorpus } from './corpus.js'
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
  checkGlobalIdUniqueness
} from './checks/ids.js'
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
  prepareLinkResolution,
  checkLinkFilesExist,
  checkLinkTestsResolve
} from './checks/links.js'
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

const inScope = (capabilityPath, scopeCapability) =>
  !scopeCapability ||
  capabilityPath === scopeCapability ||
  capabilityPath.startsWith(`${scopeCapability}/`)

/**
 * The four groups every check belongs to, named for what the check reads.
 * `specs`, `coverage` and `binding` are file-local and finish in about a
 * second; `links` reads the linked repos and builds a test-title index per
 * repo, which is the expensive part of a lint run.
 */
export const CHECK_GROUPS = ['specs', 'coverage', 'binding', 'links']

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
  {
    group: 'links',
    run: (capability, { workspaceRoot, resolution }) =>
      checkLinkFilesExist(capability, workspaceRoot, resolution.cloned)
  },
  {
    group: 'links',
    run: (capability, { workspaceRoot, resolution }) =>
      checkLinkTestsResolve(capability, workspaceRoot, resolution)
  }
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

const NO_LINK_RESOLUTION = {
  gates: null,
  indexes: {},
  cloned: new Set(),
  skipped: []
}

/**
 * All twelve checks (BUILD-IT-NOW.md §1.1): the two delegated to `openspec
 * validate --specs --strict --json` (openspec-cli.js), the ten
 * workspace-only ones (checks/shape.js, checks/ids.js, checks/rollups.js,
 * checks/conventions.js), and the two that read the linked repos
 * (checks/links.js) — link `file` exists, link `test` resolves. A repo
 * that is not cloned, or has no `node_modules`, is reported as skipped
 * with the reason rather than failed.
 *
 * The two repo-reading checks always resolve against `workspaceRoot`'s
 * `repos/`, never against `--root` — `--root` scopes which `openspec/` is
 * validated (a journey-builder worktree has no `repos/` of its own), not
 * where the real repo clones live.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.root] - Overrides the spec root (journey-builder worktrees)
 * @param {string} [args.capability] - Scope to one capability path and its descendants
 * @param {string[]} [args.groups] - Which of CHECK_GROUPS to run; defaults to all four
 * @param {Function} [args.run] - The subprocess seam, for both the delegated openspec-validate call and the repo listings
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

  const openspecFindings = wants('specs')
    ? (await validateWithOpenspecCli({ specRoot, capability, run })).filter(
        (finding) => inScope(finding.capability, capability)
      )
    : []

  const resolution = wants('links')
    ? await prepareLinkResolution({
        corpus: { capabilities: scoped },
        workspaceRoot,
        run
      })
    : NO_LINK_RESOLUTION

  const context = {
    areasTable,
    knownCapabilityPaths,
    workspaceRoot,
    resolution
  }
  const checks = capabilityChecksFor(groups)
  const localFindings = scoped.flatMap((entry) =>
    checks.flatMap((check) => check.run(entry, context))
  )

  const globalIdFindings = wants('specs')
    ? checkGlobalIdUniqueness(corpus.capabilities).filter((finding) =>
        inScope(finding.capability, capability)
      )
    : []

  return {
    specRoot,
    capabilityCount: scoped.length,
    groups,
    findings: [...openspecFindings, ...localFindings, ...globalIdFindings],
    skipped: [...unselectedGroupSkips(groups), ...resolution.skipped]
  }
}
