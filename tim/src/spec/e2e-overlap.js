import { buildCorpus } from './corpus.js'
import { coverageFileSchema } from './checks/shape.js'

const inScope = (capabilityPath, scopeCapability) =>
  !scopeCapability ||
  capabilityPath === scopeCapability ||
  capabilityPath.startsWith(`${scopeCapability}/`)

const hasFullLowerWitness = (scenario) =>
  scenario.tests.some(
    (test) =>
      test.strength === 'full' && (test.type === 'fit' || test.type === 'unit')
  )

const testKey = (test) => `${test.repo}\t${test.file}\t${test.test}`

/**
 * Every distinct E2E test, and whether every scenario it witnesses also
 * has a full-strength fit or unit witness. One e2e test can witness
 * several scenarios (linked from more than one coverage.json); it only
 * counts as overlapped when *all* of them are also covered lower down —
 * one sole-witnessed scenario keeps the whole test off the shortlist.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.capability] - Scope to one capability and its descendants
 * @returns {object}
 */
export const computeE2eOverlap = ({ workspaceRoot, capability }) => {
  const corpus = buildCorpus({ root: workspaceRoot })
  const rows = new Map()

  for (const capabilityEntry of corpus.capabilities) {
    if (!inScope(capabilityEntry.path, capability)) continue
    if (!capabilityEntry.hasCoverage || capabilityEntry.coverageParseError) {
      continue
    }
    const result = coverageFileSchema.safeParse(capabilityEntry.coverage)
    if (!result.success) continue

    for (const requirement of result.data.requirements) {
      for (const scenario of requirement.scenarios) {
        const shadowed = hasFullLowerWitness(scenario)
        for (const test of scenario.tests) {
          if (test.type !== 'e2e') continue
          const key = testKey(test)
          const existing = rows.get(key) ?? {
            repo: test.repo,
            file: test.file,
            test: test.test,
            everyWitnessShadowed: true,
            scenarioIds: []
          }
          if (!shadowed) existing.everyWitnessShadowed = false
          existing.scenarioIds.push(scenario.id)
          rows.set(key, existing)
        }
      }
    }
  }

  const all = [...rows.values()].sort(
    (a, b) =>
      a.repo.localeCompare(b.repo) ||
      a.file.localeCompare(b.file) ||
      a.test.localeCompare(b.test)
  )
  const overlapping = all.filter((row) => row.everyWitnessShadowed)

  return {
    guidance:
      'Overlap is not grounds for deletion — see docs/testing/risk-based-testing.md, which names ' +
      '"removing a browser-driven test solely because a lower-level test covers similar-sounding ' +
      'behaviour" as an anti-pattern. A fit witness proves stub-mode behaviour only.',
    totalDistinctE2eTests: all.length,
    overlappingCount: overlapping.length,
    overlapping
  }
}
