import { describe, test, expect } from 'vitest'
import { renderStatusText } from './status.js'

describe('renderStatusText', () => {
  test('reports the verified date, each repo, and the totals', () => {
    const text = renderStatusText({
      verifiedAt: '2026-09-16',
      verifiedBy: '8932fbf9',
      repos: [
        {
          repo: 'trade-imports-x',
          cloned: true,
          baselineSha: 'aaaaaaaaaaaa',
          headSha: 'aaaaaaaaaaaa',
          changedLinkedFiles: []
        },
        {
          repo: 'trade-imports-y',
          cloned: true,
          baselineSha: 'bbbbbbbbbbbb',
          headSha: 'cccccccccccc',
          changedLinkedFiles: ['src/a.test.js']
        }
      ],
      totalChangedLinkedFiles: 1,
      capabilitiesAffected: 1,
      capabilityCount: 72
    })
    const lines = text.split('\n')

    expect(lines[0]).toBe('Behaviour Spec verified 2026-09-16 (8932fbf9).')
    expect(lines[1]).toContain('trade-imports-x')
    expect(lines[1]).toContain('unchanged')
    expect(lines[2]).toContain('trade-imports-y')
    expect(lines[2]).toContain('src/a.test.js')
    expect(lines[3]).toBe(
      '1 linked test file changed across 1 of 72 capabilities.'
    )
  })

  test('names a repo that is not cloned', () => {
    const text = renderStatusText({
      verifiedAt: '2026-09-16',
      verifiedBy: '8932fbf9',
      repos: [
        { repo: 'trade-imports-x', cloned: false, changedLinkedFiles: [] }
      ],
      totalChangedLinkedFiles: 0,
      capabilitiesAffected: 0,
      capabilityCount: 72
    })

    const line = text.split('\n')[1]
    expect(line).toContain('trade-imports-x')
    expect(line).toContain('not cloned')
  })
})
