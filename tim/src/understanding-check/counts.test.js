import { describe, expect, test } from 'vitest'
import { countsText, countVerdicts } from './counts.js'

const questions = {
  questions: [
    { id: 'Q1', category: 'testing' },
    { id: 'Q2', category: 'security' },
    { id: 'Q3', category: 'design' }
  ]
}

const entry = (questionId, score) => ({ question_id: questionId, score })

describe('#countVerdicts', () => {
  test('Should count each verdict, treat a missing or false verdict as PENDING and count security FAILs', () => {
    const transcript = {
      entries: [
        entry('Q1', { verdict: 'FAIL' }),
        entry('Q2', { verdict: 'FAIL' }),
        entry('Q3', null),
        entry('Q3', { verdict: false })
      ]
    }

    const counts = countVerdicts({
      questions,
      transcript,
      meta: { coverage_gaps: ['a', 'b', 'c'] }
    })

    expect(counts).toEqual({
      total: 4,
      PASS: 0,
      PARTIAL: 0,
      FAIL: 2,
      PENDING: 2,
      security_fails: 1,
      coverage_gaps: 3,
      by_category: {
        design: { PASS: 0, PARTIAL: 0, FAIL: 0, PENDING: 2 },
        security: { PASS: 0, PARTIAL: 0, FAIL: 1, PENDING: 0 },
        testing: { PASS: 0, PARTIAL: 0, FAIL: 1, PENDING: 0 }
      }
    })
  })

  test('Should list categories in sorted order whatever order they were answered in', () => {
    const transcript = {
      entries: [entry('Q1', null), entry('Q3', null), entry('Q2', null)]
    }

    const { by_category: byCategory } = countVerdicts({
      questions,
      transcript,
      meta: {}
    })

    expect(Object.keys(byCategory)).toEqual(['design', 'security', 'testing'])
  })

  test('Should count no coverage gaps when the meta holds none', () => {
    const counts = countVerdicts({
      questions,
      transcript: { entries: [] },
      meta: {}
    })

    expect(counts.coverage_gaps).toBe(0)
  })

  test('Should refuse an answer to a question questions.json does not hold', () => {
    const transcript = { entries: [entry('Q9', { verdict: 'PASS' })] }

    expect(() => countVerdicts({ questions, transcript, meta: {} })).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message:
          'Error: transcript.json answers Q9, which has no category in questions.json'
      })
    )
  })
})

describe('#countsText', () => {
  test('Should print the totals, then one line per category', () => {
    const counts = countVerdicts({
      questions,
      transcript: { entries: [entry('Q1', { verdict: 'PASS' })] },
      meta: { coverage_gaps: [] }
    })

    const text = countsText('EUDPA-7', counts)

    expect(text).toBe(
      [
        'Counts for EUDPA-7:',
        '  Total:    1',
        '  PASS:     1',
        '  PARTIAL:  0',
        '  FAIL:     0',
        '  PENDING:  0',
        '  Security FAILs:  0',
        '  Coverage gaps:   0',
        '',
        'By category:',
        '  testing: PASS=1 PARTIAL=0 FAIL=0 PENDING=0'
      ].join('\n')
    )
  })
})
