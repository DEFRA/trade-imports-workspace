import { parsedCoverage } from './shape.js'

const finding = (capability, message) => ({
  check: 'rollup',
  capability,
  message
})

/**
 * The scenario-level rollup rule from openspec/config.yaml: full if any
 * link is full, partial if there are links but none full, none if empty.
 *
 * @param {{strength: 'full'|'partial'}[]} tests
 * @returns {'full'|'partial'|'none'}
 */
export const derivedScenarioCoverage = (tests) => {
  if (tests.length === 0) return 'none'
  return tests.some((test) => test.strength === 'full') ? 'full' : 'partial'
}

/**
 * The requirement-level rollup rule from openspec/config.yaml: full iff
 * every scenario is full, none iff every scenario is none, else partial.
 *
 * @param {{coverage: 'full'|'partial'|'none'}[]} scenarios
 * @returns {'full'|'partial'|'none'}
 */
export const derivedRequirementCoverage = (scenarios) => {
  if (scenarios.every((scenario) => scenario.coverage === 'full')) return 'full'
  if (scenarios.every((scenario) => scenario.coverage === 'none')) return 'none'
  return 'partial'
}

/**
 * Check 7 — every scenario's stated `coverage` matches what its own
 * `tests[]` array derives to.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkScenarioRollup = (capability) => {
  const coverage = parsedCoverage(capability)
  if (!coverage) return []

  return coverage.requirements
    .flatMap((requirement) => requirement.scenarios)
    .filter(
      (scenario) =>
        scenario.coverage !== derivedScenarioCoverage(scenario.tests)
    )
    .map((scenario) =>
      finding(
        capability.path,
        `${scenario.id} is stated "${scenario.coverage}" but its tests[] derive to "${derivedScenarioCoverage(scenario.tests)}".`
      )
    )
}

/**
 * Check 8 — every requirement's stated `coverage` matches what its own
 * scenarios derive to.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkRequirementRollup = (capability) => {
  const coverage = parsedCoverage(capability)
  if (!coverage) return []

  return coverage.requirements
    .filter(
      (requirement) =>
        requirement.coverage !==
        derivedRequirementCoverage(requirement.scenarios)
    )
    .map((requirement) =>
      finding(
        capability.path,
        `${requirement.id} is stated "${requirement.coverage}" but its scenarios derive to "${derivedRequirementCoverage(requirement.scenarios)}".`
      )
    )
}
