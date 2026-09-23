import { describe, test, expect } from 'vitest'
import { renderCandidatesText } from './candidates.js'

const STALENESS = {
  verifiedAt: '2026-09-16',
  daysAgo: 7,
  totalChangedLinkedFiles: 10,
  totalChangedLinks: 65,
  capabilitiesAffected: 16,
  capabilityCount: 72
}

describe('renderCandidatesText', () => {
  test('reports the staleness header, work packets, and the context counts', () => {
    const text = renderCandidatesText({
      staleness: STALENESS,
      workPackets: [
        {
          capability: 'widgets',
          linkCount: 3,
          coverageUpdatedSinceBaseline: false,
          wide: false
        }
      ],
      unresolvedLinks: [{ check: 'link-test' }],
      knownGaps: [{ id: 'SCN-X' }],
      commitLog: { 'trade-imports-x': ['abc123 touch the linked test'] }
    })

    expect(text).toContain('Behaviour Spec verified 2026-09-16')
    expect(text).toContain('1 work packet:')
    expect(text).toContain('widgets')
    expect(text).toContain('coverage.json not touched since baseline')
    expect(text).toContain('1 unresolved link from tim spec lint.')
    expect(text).toContain('1 known gap from tim spec gaps')
    expect(text).toContain('trade-imports-x:')
    expect(text).toContain('abc123 touch the linked test')
  })

  test('says so when there is no baseline to compare against', () => {
    const text = renderCandidatesText({
      staleness: null,
      workPackets: [],
      unresolvedLinks: [],
      knownGaps: [],
      commitLog: {}
    })

    expect(text).toContain('No openspec/baseline.json')
  })
})
