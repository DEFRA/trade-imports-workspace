import { buildCorpus } from './corpus.js'
import { coverageFileSchema } from './checks/shape.js'

const scenarioRows = (corpus) =>
  corpus.capabilities.flatMap((capability) => {
    if (!capability.hasCoverage || capability.coverageParseError) return []
    const result = coverageFileSchema.safeParse(capability.coverage)
    if (!result.success) return []
    return result.data.requirements.flatMap((requirement) =>
      requirement.scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        coverage: scenario.coverage,
        notes: scenario.notes ?? '',
        capability: capability.path,
        requirementId: requirement.id,
        requirementName: requirement.name
      }))
    )
  })

const inScope = (capabilityPath, scopeCapability) =>
  !scopeCapability ||
  capabilityPath === scopeCapability ||
  capabilityPath.startsWith(`${scopeCapability}/`)

/**
 * Narrowing grammar matching `tim spec lint`'s group flags: naming any of
 * `--none` / `--partial` keeps those coverages; naming none of them (or
 * both) keeps every non-full row.
 *
 * @param {object} row
 * @param {boolean} none
 * @param {boolean} partial
 * @returns {boolean}
 */
export const matchesGapNarrowing = (row, none, partial) => {
  if (!none && !partial) return true
  if (none && row.coverage === 'none') return true
  if (partial && row.coverage === 'partial') return true
  return false
}

const SEVERITY = { none: 0, partial: 1 }

const sortRows = (rows) =>
  [...rows].sort((a, b) => {
    const severityDiff = SEVERITY[a.coverage] - SEVERITY[b.coverage]
    if (severityDiff !== 0) return severityDiff
    if (a.capability !== b.capability) {
      return a.capability.localeCompare(b.capability)
    }
    return a.id.localeCompare(b.id)
  })

/**
 * Every scenario the coverage matrix records as not full: `coverage.json`'s
 * own numbers, read and filtered, not re-derived.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {boolean} [args.none] - Narrow to none (unions with --partial)
 * @param {boolean} [args.partial] - Narrow to partial (unions with --none)
 * @param {string} [args.capability] - Scope to one capability and its descendants
 * @returns {Promise<{noneCount: number, partialCount: number, scenarioCount: number, rows: object[]}>}
 */
export const computeSpecGaps = async ({
  workspaceRoot,
  none = false,
  partial = false,
  capability
}) => {
  const corpus = buildCorpus({ root: workspaceRoot })
  const rows = scenarioRows(corpus).filter((row) =>
    inScope(row.capability, capability)
  )

  const nonFull = rows.filter((row) => row.coverage !== 'full')
  const scoped = nonFull.filter((row) =>
    matchesGapNarrowing(row, none, partial)
  )

  return {
    noneCount: nonFull.filter((row) => row.coverage === 'none').length,
    partialCount: nonFull.filter((row) => row.coverage === 'partial').length,
    scenarioCount: rows.length,
    rows: sortRows(scoped)
  }
}
