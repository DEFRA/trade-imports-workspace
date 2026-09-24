import { buildCorpus } from './corpus.js'
import { coverageFileSchema } from './checks/shape.js'
import { computeStaleness } from './status.js'
import { TimError } from '../errors.js'

const scenarioRows = (corpus) =>
  corpus.capabilities.flatMap((capability) => {
    if (!capability.hasCoverage || capability.coverageParseError) return []
    const result = coverageFileSchema.safeParse(capability.coverage)
    if (!result.success) return []
    return result.data.requirements.flatMap((requirement) =>
      requirement.scenarios.map((scenario) => ({
        ...scenario,
        capability: capability.path,
        requirementId: requirement.id,
        requirementName: requirement.name
      }))
    )
  })

// config.yaml: journey-pages/ = one capability per screen; journey-
// obligations/ = conditional rules stated from a triggering page.
// Everything else is cross-cutting or outside the flow (authentication,
// notification-lifecycle, journey-flow, dashboards, ...) — a broken
// cross-cutting capability has wider blast radius than one broken page.
const isSystemLevel = (capabilityPath) =>
  !capabilityPath.includes('journey-pages/') &&
  !capabilityPath.includes('journey-obligations/')

const SCN_ID = /SCN-[A-Z0-9-]+/g

/**
 * Group scenarios that record the same hole twice: an identical scenario
 * name across different capabilities (a mirror-service requirement
 * restated verbatim, e.g. live-animals/plants), or a scenario whose
 * `notes` explicitly names another non-full scenario's id (the author
 * saying so directly, e.g. "same hole X already records"). Union-find
 * over both signals, so a scenario in either relation lands in one
 * cluster.
 *
 * @param {{id: string, name: string, notes?: string}[]} rows
 * @returns {Map<string, string[]>} cluster root id -> member ids
 */
export const findClusters = (rows) => {
  const parent = new Map(rows.map((row) => [row.id, row.id]))
  const find = (id) => {
    let current = id
    while (parent.get(current) !== current) current = parent.get(current)
    return current
  }
  const union = (a, b) => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent.set(rootA, rootB)
  }

  const byName = new Map()
  for (const row of rows) {
    const ids = byName.get(row.name) ?? []
    byName.set(row.name, [...ids, row.id])
  }
  for (const ids of byName.values()) {
    for (let index = 1; index < ids.length; index += 1) {
      union(ids[0], ids[index])
    }
  }

  const knownIds = new Set(rows.map((row) => row.id))
  for (const row of rows) {
    const referenced = row.notes?.match(SCN_ID) ?? []
    for (const id of referenced) {
      if (id !== row.id && knownIds.has(id)) union(row.id, id)
    }
  }

  const clusters = new Map()
  for (const row of rows) {
    const root = find(row.id)
    clusters.set(root, [...(clusters.get(root) ?? []), row.id])
  }
  return clusters
}

const SEVERITY = { none: 0, partial: 1 }

const clusterRow = (memberIds, byId) => {
  const members = memberIds.map((id) => byId.get(id))
  const coverage = members.some((member) => member.coverage === 'none')
    ? 'none'
    : 'partial'
  const notes = [
    ...new Set(members.map((member) => member.notes?.trim()).filter(Boolean))
  ]
  return {
    ids: members.map((member) => member.id),
    capabilities: [...new Set(members.map((member) => member.capability))],
    name: members[0].name,
    coverage,
    notes
  }
}

const sortRows = (rows) =>
  [...rows].sort((a, b) => {
    const severityDiff = SEVERITY[a.coverage] - SEVERITY[b.coverage]
    if (severityDiff !== 0) return severityDiff
    const aSystem = a.capabilities.some(isSystemLevel)
    const bSystem = b.capabilities.some(isSystemLevel)
    if (aSystem !== bSystem) return aSystem ? -1 : 1
    return a.name.localeCompare(b.name)
  })

const inScope = (capabilityPath, scopeCapability) =>
  !scopeCapability ||
  capabilityPath === scopeCapability ||
  capabilityPath.startsWith(`${scopeCapability}/`)

const witnessTypes = (row) =>
  [
    ...new Set(
      row.tests
        .filter((test) => test.strength === 'full')
        .map((test) => test.type)
    )
  ].sort()

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

/**
 * The scenarios the coverage matrix records as holes — clustered,
 * risk-ordered, under a staleness header — or, with `--unitOnly`, the
 * scenarios whose only full-strength witness is a unit test: not a gap,
 * but weak product evidence. `--scenario` looks up one id regardless of
 * its coverage state, for an ad hoc "is SCN-X really covered?" check.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {boolean} [args.none] - Narrow to none (unions with --partial)
 * @param {boolean} [args.partial] - Narrow to partial (unions with --none)
 * @param {boolean} [args.unitOnly]
 * @param {string} [args.scenario] - One scenario id, any coverage state
 * @param {string} [args.capability] - Scope to one capability and its descendants
 * @returns {Promise<object>}
 * @throws {TimError} NOT_FOUND when --scenario names nothing in the corpus
 */
export const computeSpecGaps = async ({
  workspaceRoot,
  none = false,
  partial = false,
  unitOnly = false,
  scenario,
  capability
}) => {
  const corpus = buildCorpus({ root: workspaceRoot })
  const rows = scenarioRows(corpus).filter((row) =>
    inScope(row.capability, capability)
  )
  const status = await computeStaleness({ workspaceRoot })

  if (scenario) {
    const found = rows.find((row) => row.id === scenario)
    if (!found) {
      throw new TimError(
        'NOT_FOUND',
        `Can't find scenario "${scenario}" in the corpus.`
      )
    }
    return { staleness: status, scenario: found }
  }

  if (unitOnly) {
    const unitOnlyRows = rows.filter(
      (row) =>
        row.coverage === 'full' &&
        witnessTypes(row).length === 1 &&
        witnessTypes(row)[0] === 'unit'
    )
    return { staleness: status, unitOnly: unitOnlyRows }
  }

  const nonFull = rows.filter((row) => row.coverage !== 'full')
  const scoped = nonFull.filter((row) =>
    matchesGapNarrowing(row, none, partial)
  )
  const clusters = findClusters(scoped)
  const byId = new Map(scoped.map((row) => [row.id, row]))
  const clustered = [...clusters.values()].map((ids) => clusterRow(ids, byId))

  return {
    staleness: status,
    noneCount: nonFull.filter((row) => row.coverage === 'none').length,
    partialCount: nonFull.filter((row) => row.coverage === 'partial').length,
    scenarioCount: rows.length,
    rows: sortRows(clustered)
  }
}
