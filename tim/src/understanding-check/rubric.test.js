import { describe, expect, test } from 'vitest'
import {
  hasCategoricalVerb,
  rubricClauseLines,
  rubricMatchOverlaps,
  squeezedText
} from './rubric.js'

describe('#hasCategoricalVerb', () => {
  test.each([
    'Names it',
    'NAMES',
    'names-x',
    'it cites. ok',
    'names²',
    'nameś',
    'names😀',
    "d'cites"
  ])('Should accept %j', (clause) => {
    expect(hasCategoricalVerb(clause)).toBe(true)
  })

  test.each([
    'renames',
    'names_x',
    'namesé',
    'énames',
    'names٣',
    'nameſ',
    'İdentifies',
    'shows good understanding'
  ])('Should refuse %j', (clause) => {
    expect(hasCategoricalVerb(clause)).toBe(false)
  })
})

describe('#squeezedText', () => {
  test('Should make each run of white space one space and trim the ends', () => {
    expect(squeezedText('  a\t b\n\nc \n')).toBe('a b c')
  })

  test('Should leave a next-line character and a byte-order mark alone', () => {
    expect(squeezedText('a\u0085b﻿c')).toBe('a\u0085b﻿c')
  })

  test('Should make text of echo options alone empty', () => {
    expect(squeezedText('-neE')).toBe('')
  })
})

describe('#rubricClauseLines', () => {
  test('Should give each line of each clause, dropping blank lines', () => {
    const question = {
      rubric: { PASS: 'one\n\ntwo', PARTIAL: '', FAIL: 42 }
    }

    expect(rubricClauseLines(question)).toEqual(['one', 'two', '42'])
  })

  test('Should give null for each clause of a question with no rubric', () => {
    expect(rubricClauseLines(undefined)).toEqual(['null', 'null', 'null'])
  })
})

describe('#rubricMatchOverlaps', () => {
  const clause =
    'Names BOTH that 4xx is non-transient AND that retrying would exhaust the budget'

  test('Should find a quote of 12 characters inside a clause', () => {
    expect(
      rubricMatchOverlaps('with 5xx beh', ['Conflates 4xx with 5xx behaviour'])
    ).toBe(true)
  })

  test('Should refuse a quote of 11 characters', () => {
    expect(
      rubricMatchOverlaps('with 5xx be', ['Conflates 4xx with 5xx behaviour'])
    ).toBe(false)
  })

  test('Should find a 24-character window taken at a multiple of 4', () => {
    expect(rubricMatchOverlaps(`-- ${clause.slice(3, 31)} --`, [clause])).toBe(
      true
    )
  })

  test('Should refuse a 25-character run that misses every window', () => {
    expect(rubricMatchOverlaps(`-- ${clause.slice(5, 30)} --`, [clause])).toBe(
      false
    )
  })

  test('Should count characters, not bytes, toward the 12', () => {
    expect(rubricMatchOverlaps('éééééééééé1', ['éééééééééé1 and more'])).toBe(
      false
    )
  })

  test('Should overlap anything long enough when a clause line squeezes to nothing', () => {
    expect(rubricMatchOverlaps('nothing like the rubric', ['   '])).toBe(true)
  })
})
