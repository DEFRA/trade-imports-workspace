import { parsedCoverage } from './shape.js'

const finding = (capability, message) => ({
  check: 'ids',
  capability,
  message
})

const specIds = (capability) => [
  ...capability.requirements.map((requirement) => ({
    kind: 'requirement',
    id: requirement.id,
    name: requirement.name
  })),
  ...capability.requirements.flatMap((requirement) =>
    requirement.scenarios.map((scenario) => ({
      kind: 'scenario',
      id: scenario.id,
      name: scenario.name
    }))
  )
]

/**
 * Check 5 (presence half) — every requirement and scenario in spec.md has
 * an `**ID**:` line.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkIdsPresent = (capability) => {
  if (!capability.hasSpec) return []
  return specIds(capability)
    .filter((entry) => !entry.id)
    .map((entry) =>
      finding(
        capability.path,
        `${entry.kind} "${entry.name}" has no **ID**: line.`
      )
    )
}

const coverageIds = (parsedCoverage) => [
  ...parsedCoverage.requirements.map((requirement) => ({
    kind: 'requirement',
    id: requirement.id,
    name: requirement.name
  })),
  ...parsedCoverage.requirements.flatMap((requirement) =>
    requirement.scenarios.map((scenario) => ({
      kind: 'scenario',
      id: scenario.id,
      name: scenario.name
    }))
  )
]

/**
 * Check 5 (parity half) — the set of IDs spec.md declares (read only from
 * `**ID**:` lines, never grepped) matches coverage.json's exactly, in both
 * directions.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkIdParity = (capability) => {
  if (!capability.hasSpec) return []
  const coverage = parsedCoverage(capability)
  if (!coverage) return []

  const specSet = new Set(
    specIds(capability)
      .map((entry) => entry.id)
      .filter(Boolean)
  )
  const coverageSet = new Set(coverageIds(coverage).map((entry) => entry.id))

  const missingFromCoverage = [...specSet].filter((id) => !coverageSet.has(id))
  const missingFromSpec = [...coverageSet].filter((id) => !specSet.has(id))

  return [
    ...missingFromCoverage.map((id) =>
      finding(
        capability.path,
        `${id} is in spec.md but has no coverage.json entry.`
      )
    ),
    ...missingFromSpec.map((id) =>
      finding(capability.path, `${id} is in coverage.json but not in spec.md.`)
    )
  ]
}

/**
 * Check 6 — a requirement or scenario's name in coverage.json matches its
 * spec.md heading verbatim, for every ID present on both sides.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkNameParity = (capability) => {
  if (!capability.hasSpec) return []
  const coverage = parsedCoverage(capability)
  if (!coverage) return []

  const specById = new Map(
    specIds(capability)
      .filter((entry) => entry.id)
      .map((entry) => [entry.id, entry.name])
  )

  return coverageIds(coverage)
    .filter(
      (entry) => specById.has(entry.id) && specById.get(entry.id) !== entry.name
    )
    .map((entry) =>
      finding(
        capability.path,
        `${entry.id}'s coverage.json name "${entry.name}" does not match spec.md's "${specById.get(entry.id)}".`
      )
    )
}

/**
 * Check 5 (uniqueness half) — no REQ-/SCN- id appears more than once across
 * the whole corpus. IDs are the coverage join key, so a duplicate makes one
 * scenario's coverage ambiguous.
 *
 * @param {object[]} capabilities - The full corpus, unfiltered by --capability
 * @returns {object[]}
 */
export const checkGlobalIdUniqueness = (capabilities) => {
  const occurrences = new Map()
  for (const capability of capabilities) {
    for (const entry of specIds(capability)) {
      if (!entry.id) continue
      const existing = occurrences.get(entry.id) ?? []
      occurrences.set(entry.id, [...existing, capability.path])
    }
  }
  return [...occurrences.entries()]
    .filter(([, paths]) => paths.length > 1)
    .flatMap(([id, paths]) => {
      const distinctPaths = [...new Set(paths)]
      return distinctPaths.map((path) => {
        const elsewhere = distinctPaths.filter((other) => other !== path)
        const message =
          elsewhere.length > 0
            ? `${id} is used ${paths.length} times, also in: ${elsewhere.join(', ')}.`
            : `${id} is used ${paths.length} times within this capability alone.`
        return finding(path, message)
      })
    })
}
