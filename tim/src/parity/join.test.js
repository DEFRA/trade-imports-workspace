import { describe, test, expect } from 'vitest'
import { joinFindings, assertCompleteJoin } from './join.js'

const increment = (id, title) => ({ id, title })
const finding = (title, extra = {}) => ({
  title,
  verification: `v-${title}`,
  ...extra
})

describe('joinFindings', () => {
  test('matches by title regardless of order', () => {
    const { byId } = joinFindings(
      [increment('inc-001', 'B'), increment('inc-002', 'A')],
      { survived: [finding('A'), finding('B')] }
    )
    expect(byId.get('inc-001').verification).toBe('v-B')
    expect(byId.get('inc-002').verification).toBe('v-A')
  })

  test('reports how far an ordinal join would have got', () => {
    const { report } = joinFindings(
      [increment('inc-001', 'B'), increment('inc-002', 'A')],
      { survived: [finding('A'), finding('B')] }
    )
    expect(report.ordinalAgreement).toBe(0)
  })

  test('names an increment with no finding', () => {
    const { report } = joinFindings([increment('inc-001', 'Z')], {
      survived: [finding('A')]
    })
    expect(report.unmatchedIncrements).toEqual(['inc-001'])
    expect(report.unmatchedFindings).toEqual(['A'])
  })

  test('refuses to make title the key when the findings file repeats one', () => {
    expect(() =>
      joinFindings([increment('inc-001', 'A')], {
        survived: [finding('A'), finding('A')]
      })
    ).toThrow(/two entries titled/)
  })

  test('ignores refuted and discarded entries entirely', () => {
    const { byId } = joinFindings([increment('inc-001', 'A')], {
      survived: [finding('A')],
      refuted: [{ title: 'A', reason: 'r', band: 'b' }],
      discarded: [{ title: 'A' }]
    })
    expect(byId.size).toBe(1)
  })
})

describe('assertCompleteJoin', () => {
  test('passes a complete join', () => {
    const { report } = joinFindings([increment('inc-001', 'A')], {
      survived: [finding('A')]
    })
    expect(() => assertCompleteJoin(report)).not.toThrow()
  })

  test('halts on a partial join rather than working around it', () => {
    const { report } = joinFindings([increment('inc-001', 'Z')], {
      survived: [finding('A')]
    })
    expect(() => assertCompleteJoin(report)).toThrow(/join is incomplete/)
  })
})
