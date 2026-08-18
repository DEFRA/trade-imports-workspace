import { describe, test, expect } from 'vitest'
import {
  parseLineSpec,
  sentences,
  alternatesSides,
  tokenise,
  citableFields,
  tokeniseIncrement
} from './parse.js'

describe('parseLineSpec', () => {
  test('reads a single line', () => {
    expect(parseLineSpec('41')).toEqual([{ start: 41, end: 41 }])
  })

  test('reads a range', () => {
    expect(parseLineSpec('41-53')).toEqual([{ start: 41, end: 53 }])
  })

  test('reads a comma list as separate ranges', () => {
    expect(parseLineSpec('72, 85, 98')).toEqual([
      { start: 72, end: 72 },
      { start: 85, end: 85 },
      { start: 98, end: 98 }
    ])
  })
})

describe('sentences', () => {
  test('splits on a full stop followed by a capital', () => {
    expect(sentences('One thing. Two things.').map((s) => s.text)).toEqual([
      'One thing.',
      'Two things.'
    ])
  })

  test('splits on a paragraph break', () => {
    expect(sentences('One.\n\nTwo.').map((s) => s.text)).toEqual([
      'One.',
      'Two.'
    ])
  })

  test('does not split a version number or a lower-case continuation', () => {
    expect(
      sentences('accessible-autocomplete@3.0.1 is a dependency now.')
    ).toHaveLength(1)
  })
})

describe('tokenise — named citations', () => {
  test('finds a bare basename with a line range', () => {
    const [token] = tokenise({
      text: 'layout.njk:41-53 renders it.',
      field: 'detail'
    })
    expect(token).toMatchObject({
      asWritten: 'layout.njk:41-53',
      pathAsWritten: 'layout.njk',
      form: 'named',
      lines: [{ start: 41, end: 53 }]
    })
  })

  test('finds a full repo-relative path', () => {
    const [token] = tokenise({
      text: 'src/server/common/components/service-header/template.njk:21 emits it.',
      field: 'detail'
    })
    expect(token.pathAsWritten).toBe(
      'src/server/common/components/service-header/template.njk'
    )
  })

  test('finds a dotted basename', () => {
    const [token] = tokenise({
      text: 'copy.en.js:6 has the typo.',
      field: 'detail'
    })
    expect(token.pathAsWritten).toBe('copy.en.js')
  })

  test('finds a page-model citation under a capture directory', () => {
    const [token] = tokenise({
      text: 'fe-dashboard-populated.json:7-11 shows serviceNav.',
      field: 'detail'
    })
    expect(token.pathAsWritten).toBe('fe-dashboard-populated.json')
  })

  test('reads a comma-joined line list as one token with several ranges', () => {
    const [token] = tokenise({
      text: 'review-notification.html:72, 85, 98 lists the same six.',
      field: 'detail'
    })
    expect(token.lines).toHaveLength(3)
  })

  test('carries the side hint from the field it was found in', () => {
    const [token] = tokenise({
      text: 'app/views/x.html:1',
      field: 'evidence.prototype',
      sideHint: 'prototype'
    })
    expect(token.sideHint).toBe('prototype')
  })
})

describe('tokenise — continuations', () => {
  test('resolves a bare :NN to the file named earlier in the sentence', () => {
    const tokens = tokenise({
      text: 'routes.js:5410-5428 builds the list, :5444-5455 flags it.',
      field: 'detail'
    })
    const continuation = tokens.find((t) => t.form === 'continuation')
    expect(continuation).toMatchObject({
      pathAsWritten: 'routes.js',
      antecedent: 'routes.js:5410-5428',
      needsHuman: false
    })
  })

  test('refuses to resolve when the sentence alternates sides across a vs', () => {
    const tokens = tokenise({
      text: 'Breeding (copy.en.js:9-10 vs :17) ends without a full stop.',
      field: 'detail'
    })
    const continuation = tokens.find((t) => t.form === 'continuation')
    expect(continuation.needsHuman).toBe(true)
  })

  test('refuses to resolve a continuation with no antecedent in its sentence', () => {
    const tokens = tokenise({
      text: 'It also appears at :4413 in the same file.',
      field: 'detail'
    })
    expect(tokens[0]).toMatchObject({ form: 'continuation', needsHuman: true })
  })

  test('does not read the tail of a named citation as a continuation', () => {
    const tokens = tokenise({ text: 'layout.njk:41-53.', field: 'detail' })
    expect(tokens).toHaveLength(1)
  })

  test('does not split a comma line list into a continuation', () => {
    const tokens = tokenise({
      text: 'routes.js:5032-5035, 5047-5049 do it.',
      field: 'detail'
    })
    expect(tokens.filter((t) => t.form === 'continuation')).toHaveLength(0)
  })

  test('does not cross a sentence boundary to find an antecedent', () => {
    const tokens = tokenise({
      text: 'routes.js:10 is one. The other lives at :20.',
      field: 'detail'
    })
    const continuation = tokens.find((t) => t.form === 'continuation')
    expect(continuation.needsHuman).toBe(true)
  })
})

describe('alternatesSides', () => {
  test('fires when a vs sits between the antecedent and the continuation', () => {
    expect(alternatesSides(' vs ')).toBe(true)
  })

  test('fires on against', () => {
    expect(alternatesSides(' rendered against ')).toBe(true)
  })

  test('stays quiet on ordinary connecting text', () => {
    expect(alternatesSides(' builds the list, and ')).toBe(false)
  })
})

describe('citableFields', () => {
  const increment = {
    detail: 'a.js:1',
    evidence: { frontend: 'b.js:2', prototype: 'c.html:3' },
    notes: [{ note: 'd.js:4', at: 'now' }],
    decision: { ruling: 'falsified', note: 'e.js:5' }
  }

  test('scans detail, both evidence sides, notes and the decision', () => {
    expect(citableFields(increment).map((f) => f.field)).toEqual([
      'detail',
      'evidence.frontend',
      'evidence.prototype',
      'notes[0]',
      'decision'
    ])
  })

  test('attributes each evidence field to its own side', () => {
    const fields = citableFields(increment)
    expect(fields.find((f) => f.field === 'evidence.prototype').sideHint).toBe(
      'prototype'
    )
  })
})

describe('tokeniseIncrement', () => {
  test('returns every token across every citable field', () => {
    const tokens = tokeniseIncrement({
      detail: 'a.js:1 and b.js:2',
      evidence: { frontend: 'c.js:3' },
      notes: [{ note: 'd.js:4', at: 'now' }]
    })
    expect(tokens.map((t) => t.asWritten)).toEqual([
      'a.js:1',
      'b.js:2',
      'c.js:3',
      'd.js:4'
    ])
  })
})
