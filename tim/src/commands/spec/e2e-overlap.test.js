import { describe, test, expect } from 'vitest'
import { renderE2eOverlapText } from './e2e-overlap.js'

describe('renderE2eOverlapText', () => {
  test('leads with the guidance, then the count, then each row', () => {
    const text = renderE2eOverlapText({
      guidance:
        'Overlap is not grounds for deletion — see risk-based-testing.md.',
      totalDistinctE2eTests: 227,
      overlappingCount: 96,
      overlapping: [
        {
          repo: 'trade-imports-animals-tests',
          file: 'tests/e2e/features/hub.spec.ts',
          test: 'shows the hub'
        }
      ]
    })
    const lines = text.split('\n')

    expect(lines[0]).toContain('not grounds for deletion')
    expect(text).toContain('96 of 227 distinct e2e tests are fully overlapped')
    expect(text).toContain('shows the hub')
  })
})
