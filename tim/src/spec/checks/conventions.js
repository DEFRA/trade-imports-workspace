const finding = (capability, message) => ({
  check: 'conventions',
  capability,
  message
})

const THEN_LINE = /-\s*\*\*THEN\*\*/
const SHALL_WORD = /\bSHALL\b/

/**
 * Check 11 (THEN half) — every scenario asserts at least one observable
 * outcome. A GIVEN/WHEN with no THEN at all asserts nothing.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkThenPresent = (capability) => {
  if (!capability.hasSpec) return []
  return capability.requirements
    .flatMap((requirement) => requirement.scenarios)
    .filter((scenario) => !THEN_LINE.test(scenario.body))
    .map((scenario) =>
      finding(
        capability.path,
        `Scenario "${scenario.name}" has no - **THEN** line.`
      )
    )
}

/**
 * Check 11 (MUST half) — requirement bodies use MUST, never SHALL
 * (openspec/config.yaml).
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkNoShall = (capability) => {
  if (!capability.hasSpec) return []
  return capability.requirements
    .filter((requirement) => SHALL_WORD.test(requirement.body))
    .map((requirement) =>
      finding(
        capability.path,
        `Requirement "${requirement.name}" uses SHALL instead of MUST.`
      )
    )
}

const CROSS_REFERENCE = /`([a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)+)`/g

/**
 * Every backticked, slash-separated, all-lowercase path quoted in a
 * spec.md's prose — the shape a capability cross-reference takes
 * (`live-animals/addresses`). Not every match is necessarily a
 * cross-reference, but nothing else in spec.md prose takes this shape per
 * openspec/config.yaml's conventions.
 *
 * @param {string} specText
 * @returns {string[]} unique, in first-seen order
 */
export const findCrossReferences = (specText) => [
  ...new Set([...specText.matchAll(CROSS_REFERENCE)].map((match) => match[1]))
]

/**
 * Check 12 — every backticked capability cross-reference in spec.md's
 * prose resolves to a real capability, so a rename does not orphan it.
 *
 * @param {object} capability
 * @param {Set<string>} knownCapabilityPaths - Every capability path with a spec.md
 * @returns {object[]}
 */
export const checkCrossReferences = (capability, knownCapabilityPaths) => {
  if (!capability.hasSpec) return []
  return findCrossReferences(capability.specText)
    .filter((path) => !knownCapabilityPaths.has(path))
    .map((path) =>
      finding(
        capability.path,
        `Cross-reference \`${path}\` in spec.md does not resolve to a real capability.`
      )
    )
}
