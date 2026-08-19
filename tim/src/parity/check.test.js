import { describe, test, expect } from 'vitest'
import {
  checkDetailFrozen,
  checkCitationsImmutable,
  checkTokensCovered,
  checkMarkers,
  checkQuotes,
  checkNumbers,
  checkResidue,
  checkSlots,
  checkPolarity,
  withoutCitations
} from './check.js'

const increment = (overrides = {}) => ({
  id: 'inc-001',
  gate: null,
  status: 'todo',
  detail: 'The frontend renders no phase banner.',
  evidence: {},
  ...overrides
})

const migrated = (slots, overrides = {}) =>
  increment({
    finding: {
      frontend: 'a',
      prototype: 'b',
      difference: 'c',
      falsifiedBy: 'd',
      verification: 'e',
      ...slots
    },
    ...overrides
  })

describe('withoutCitations', () => {
  test('removes a comma-joined citation whole, line numbers included', () => {
    const text = withoutCitations(
      increment({ detail: 'It is at view-model.js:92,110-112 today.' })
    )
    expect(text).not.toMatch(/110|112|92/)
  })

  test('removes the sentinel labels, which are structure rather than content', () => {
    const text = withoutCitations(
      increment({ detail: 'Body.\n\nFALSIFIED BY: A prior decision.' })
    )
    expect(text).not.toContain('FALSIFIED BY')
    expect(text).toContain('A prior decision')
  })

  test('leaves the words of the claim alone', () => {
    expect(
      withoutCitations(
        increment({ detail: 'All 34 models have phaseBanner null.' })
      )
    ).toContain('All 34 models')
  })
})

describe('I1 — detail is frozen', () => {
  const baseline = { increments: [increment()] }

  test('passes when nothing changed', () => {
    expect(checkDetailFrozen([increment()], baseline).state).toBe('pass')
  })

  test('names the increment whose detail moved', () => {
    const edited = increment({ detail: 'Reworded.' })
    expect(checkDetailFrozen([edited], baseline)).toMatchObject({
      state: 'fail',
      detail: expect.stringContaining('inc-001')
    })
  })

  test('skips rather than passing when there is no baseline', () => {
    expect(checkDetailFrozen([increment()], null).state).toBe('skipped')
  })
})

describe('I2 — citations are immutable', () => {
  const citation = (overrides = {}) => ({
    ref: 'c1',
    path: 'src/a.js',
    side: 'frontend',
    ranges: [{ start: 1, end: 2 }],
    ...overrides
  })
  const baseline = { increments: [increment({ citations: [citation()] })] }

  test('passes when the citation is untouched', () => {
    expect(
      checkCitationsImmutable(
        [increment({ citations: [citation()] })],
        baseline
      ).state
    ).toBe('pass')
  })

  test('fails when a citation is deleted', () => {
    expect(
      checkCitationsImmutable([increment({ citations: [] })], baseline)
    ).toMatchObject({
      state: 'fail',
      detail: expect.stringContaining('deleted')
    })
  })

  test('fails when a citation is repointed', () => {
    expect(
      checkCitationsImmutable(
        [increment({ citations: [citation({ path: 'src/b.js' })] })],
        baseline
      )
    ).toMatchObject({
      state: 'fail',
      detail: expect.stringContaining('edited')
    })
  })
})

describe('I3 — every token carries a citation', () => {
  test('accepts a citation recorded under a second written form', () => {
    const result = checkTokensCovered([
      increment({
        detail: 'See stub.js:1-48.',
        evidence: { frontend: 'src/server/stub.js:1-48' },
        citations: [
          {
            ref: 'c1',
            asWritten: 'stub.js:1-48',
            alsoWritten: ['src/server/stub.js:1-48']
          }
        ]
      })
    ])
    expect(result.state).toBe('pass')
  })

  test('names a token no citation covers', () => {
    expect(
      checkTokensCovered([
        increment({ detail: 'See stub.js:1-48.', citations: [] })
      ])
    ).toMatchObject({
      state: 'fail',
      detail: expect.stringContaining('stub.js:1-48')
    })
  })
})

describe('I4 — markers match citations', () => {
  test('fails on a marker that is not a citation', () => {
    expect(
      checkMarkers([
        migrated({ frontend: 'It does X [[c9]].' }, { citations: [] })
      ])
    ).toMatchObject({ state: 'fail', detail: expect.stringContaining('c9') })
  })

  test('passes when every marker has a citation', () => {
    expect(
      checkMarkers([
        migrated(
          { frontend: 'It does X [[c1]].' },
          { citations: [{ ref: 'c1' }] }
        )
      ]).state
    ).toBe('pass')
  })
})

describe('I5 — quote conservation', () => {
  const detail =
    'The hint has "has as it\'s aim," and calls `govukSelect` today.'

  test('passes when every quoted span and identifier survives', () => {
    expect(
      checkQuotes([
        migrated(
          { frontend: 'It reads "has as it\'s aim," via `govukSelect`.' },
          { detail }
        )
      ]).state
    ).toBe('pass')
  })

  test('catches the copy editor correcting the typo the finding is about', () => {
    expect(
      checkQuotes([
        migrated(
          { frontend: 'It reads "has as its aim," via `govukSelect`.' },
          { detail }
        )
      ])
    ).toMatchObject({ state: 'fail', detail: expect.stringContaining("it's") })
  })

  test('does not invent a span by pairing quotes across a short one', () => {
    // "it's" is under the five-character minimum. A pattern that skipped it
    // would pair its closing quote with the next opening one.
    const tricky =
      'errors (possessive "it\'s", a spurious comma, "e.g.") remain'
    const result = checkQuotes([
      migrated({ frontend: tricky }, { detail: tricky })
    ])
    expect(result.state).toBe('pass')
  })

  test('skips when nothing has been migrated', () => {
    expect(checkQuotes([increment()]).state).toBe('skipped')
  })
})

describe('I6 — number conservation', () => {
  test('accepts a count written as a word', () => {
    expect(
      checkNumbers([
        migrated(
          { frontend: 'There are five entries.' },
          { detail: 'There are 5 entries.' }
        )
      ]).state
    ).toBe('pass')
  })

  test('catches a dropped count', () => {
    expect(
      checkNumbers([
        migrated(
          { frontend: 'There are entries.' },
          { detail: 'There are 34 entries.' }
        )
      ])
    ).toMatchObject({ state: 'fail', detail: expect.stringContaining('34') })
  })

  test('does not count a citation line number as a claim', () => {
    expect(
      checkNumbers([
        migrated(
          { frontend: 'It is there [[c1]].' },
          { detail: 'It is at layout.njk:41-53.' }
        )
      ]).state
    ).toBe('pass')
  })

  test('does not treat the pronoun "one" as a count', () => {
    expect(
      checkNumbers([
        migrated(
          { frontend: 'They end with a full stop.' },
          { detail: 'They end with one in the prototype.' }
        )
      ]).state
    ).toBe('pass')
  })
})

describe('I8 — word residue', () => {
  test('passes when every word survives somewhere in the slots', () => {
    const result = checkResidue([
      migrated(
        {
          frontend: 'The frontend renders no phase banner.',
          prototype: 'x',
          difference: 'y',
          falsifiedBy: 'z',
          verification: 'w'
        },
        { detail: 'The frontend renders no phase banner.' }
      )
    ])
    expect(result.state).toBe('pass')
    expect(result.rows[0].missing).toEqual([])
  })

  test('prints the residue when a word is dropped', () => {
    const result = checkResidue([
      migrated(
        { frontend: 'The frontend renders a banner.' },
        {
          detail: 'The frontend renders a phaseBanner on every page.'
        }
      )
    ])
    expect(result.rows[0].missing).toContain('phasebanner')
  })
})

describe('I9 — slot sanity', () => {
  test('does not assert the corpus-wide counts on a part-migrated file', () => {
    const result = checkSlots([migrated({}), increment({ id: 'inc-002' })], {
      corrected: 39
    })
    expect(result.state).toBe('pass')
    expect(result.detail).toMatch(/not asserted yet/)
  })

  test('does not enforce the word budgets in Pass A', () => {
    const long = 'word '.repeat(200)
    expect(
      checkSlots([migrated({ prototype: long }, {})], undefined, 'a').state
    ).toBe('pass')
  })

  test('enforces the word budgets in Pass B on a finding that has had Pass B', () => {
    const long = 'word '.repeat(200)
    const item = migrated({ prototype: long, pass: 'b' }, {})
    expect(checkSlots([item], undefined, 'b')).toMatchObject({
      state: 'fail',
      detail: expect.stringContaining('over a 60 budget')
    })
  })

  test('leaves a Pass A finding alone during a Pass B check', () => {
    const long = 'word '.repeat(200)
    const item = migrated({ prototype: long, pass: 'a' }, {})
    expect(checkSlots([item], undefined, 'b').state).toBe('pass')
  })

  test('accepts an over-budget slot that says why it is long', () => {
    const long = 'word '.repeat(200)
    const item = migrated(
      { prototype: long, pass: 'b', longBecause: 'Two flows.' },
      {}
    )
    expect(checkSlots([item], undefined, 'b').state).toBe('pass')
  })

  test('does not count a decision question as migrated prose', () => {
    const questionOnly = increment({
      gate: 'sam',
      finding: { decisionRequired: { question: 'Q?', source: 'authored' } }
    })
    expect(checkSlots([questionOnly], undefined, 'a').state).toBe('pass')
  })
})

describe('I10 — polarity', () => {
  test('lists an absolute that disappeared, comparing against the frozen detail', () => {
    const result = checkPolarity(
      [
        migrated(
          { frontend: 'The frontend renders a phase banner sometimes.' },
          { detail: 'No page in the frontend renders a phase banner.' }
        )
      ],
      null
    )
    expect(result.rows[0].absolutesLost).toContain('no')
  })

  test('lists a hedge that appeared', () => {
    const result = checkPolarity(
      [
        migrated(
          { frontend: 'The frontend may render a banner.' },
          { detail: 'The frontend renders a banner.' }
        )
      ],
      null
    )
    expect(result.rows[0].hedgesAdded).toContain('may')
  })

  test('is advisory, never a gate', () => {
    expect(checkPolarity([migrated({})], null).state).toBe('advisory')
  })

  test('falls back to the frozen detail when the baseline has no slots yet', () => {
    const baseline = { increments: [increment()] }
    const result = checkPolarity(
      [
        migrated(
          { frontend: 'The frontend may render a phase banner.' },
          { detail: 'No page in the frontend renders a phase banner.' }
        )
      ],
      baseline
    )
    expect(result.rows[0].absolutesLost).toContain('no')
  })
})
