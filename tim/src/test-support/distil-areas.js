/**
 * An areas.json for the demo workarea, cut the way an area-plan agent
 * would: the ruling goes to every area, the test suite and the one policy
 * claim it disagrees with to `suite`, and the policy page to `tiers`. Each
 * existing requirement and conflict goes to the area whose claims back it.
 */
export const DEMO_AREAS = {
  everyArea: ['ruling:sam-2026-09-29c'],
  areas: [
    {
      id: 'suite',
      title: 'The test suite',
      scope: 'How the suite is laid out and run, and its smoke test.',
      slices: [
        { source: 'repo:tests' },
        { source: 'confluence:6608160092', from: 'dr5-018', to: 'dr5-018' }
      ],
      requirements: ['req-001', 'req-003'],
      conflicts: ['c-001']
    },
    {
      id: 'tiers',
      title: 'Test tiers',
      scope: 'Which tiers and scenarios run where, and how often.',
      slices: [
        { source: 'confluence:6608160092', from: 'dr5-001', to: 'dr5-060' }
      ],
      requirements: ['req-002', 'req-004', 'req-005', 'req-006'],
      conflicts: ['c-002']
    }
  ]
}

/**
 * Write the demo's areas.json, as the area-plan agent would.
 *
 * @param {object} workspace - From `makeDistilWorkspace`
 * @param {object} [plan] - The areas.json to write
 */
export const writeDemoAreas = (workspace, plan = DEMO_AREAS) =>
  workspace.writeJson(workspace.layout.areas, plan)

/**
 * The reconciled file an area's reconciler writes, holding the existing
 * requirements and conflicts the area owns, plus any new ones given.
 *
 * @param {object} workspace - From `makeDistilWorkspace`, with the demo's requirements and conflicts
 * @param {string} areaId
 * @param {{requirements?: object[], conflicts?: object[]}} [added]
 * @returns {{area: string, requirements: object[], conflicts: object[]}}
 */
export const reconciledFor = (workspace, areaId, added = {}) => {
  const area = DEMO_AREAS.areas.find((candidate) => candidate.id === areaId)
  const requirements = workspace
    .readJson(workspace.layout.requirements)
    .requirements.filter((requirement) =>
      area.requirements.includes(requirement.id)
    )
  const conflicts = workspace
    .readJson(workspace.layout.conflicts)
    .conflicts.filter((conflict) => area.conflicts.includes(conflict.id))
  return {
    area: areaId,
    requirements: [...requirements, ...(added.requirements ?? [])],
    conflicts: [...conflicts, ...(added.conflicts ?? [])]
  }
}
