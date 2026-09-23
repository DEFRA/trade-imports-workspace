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

// The two checks that read the linked repos — link `file` exists, link
// `test` resolves. Land in a later piece; until then every run reports them
// as skipped rather than silently pretending the corpus is fully checked.
const REPO_CHECKS_SKIPPED = [
  {
    check: 'link-file',
    reason: 'not yet implemented — needs the repos cloned'
  },
  {
    check: 'link-test',
    reason:
      'not yet implemented — needs the repos cloned, with node_modules installed'
  }
]

/**
 * The ten workspace-only checks plus the two openspec-validate-delegated
 * ones (checks/shape.js, checks/ids.js, checks/rollups.js,
 * checks/conventions.js, openspec-cli.js — BUILD-IT-NOW.md §1.1). The two
 * repo-reading checks (link file exists, link test resolves) are reported
 * as skipped until a later piece adds them.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.root] - Overrides the spec root (journey-builder worktrees)
 * @param {string} [args.capability] - Scope to one capability path and its descendants
 * @param {Function} [args.run] - The subprocess seam for the delegated openspec-validate call
 * @returns {Promise<{specRoot: string, capabilityCount: number, findings: object[], skipped: object[]}>}
 * @throws {TimError} NOT_FOUND when --capability names nothing in the corpus
 */
export const runSpecLint = async ({ workspaceRoot, root, capability, run }) => {
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
  const areasTable = readAreasTable(specRoot)

  const openspecFindings = (
    await validateWithOpenspecCli({ specRoot, capability, run })
  ).filter((finding) => inScope(finding.capability, capability))

  const localFindings = scoped.flatMap((entry) => [
    ...pairingFindings(entry),
    ...checkCoverageShape(entry),
    ...checkNoneHasNotes(entry),
    ...checkAreaCodeAndSpecFile(entry, areasTable),
    ...checkIdsPresent(entry),
    ...checkIdParity(entry),
    ...checkNameParity(entry),
    ...checkScenarioRollup(entry),
    ...checkRequirementRollup(entry),
    ...checkThenPresent(entry),
    ...checkNoShall(entry),
    ...checkCrossReferences(entry, knownCapabilityPaths)
  ])

  const globalIdFindings = checkGlobalIdUniqueness(corpus.capabilities).filter(
    (finding) => inScope(finding.capability, capability)
  )

  return {
    specRoot,
    capabilityCount: scoped.length,
    findings: [...openspecFindings, ...localFindings, ...globalIdFindings],
    skipped: REPO_CHECKS_SKIPPED
  }
}
