import { describe, expect, test } from 'vitest'
import { commaList, evidenceList } from './lists.js'

describe('#commaList', () => {
  test('Should drop empty parts before trimming, so a part of spaces stays as empty text', () => {
    expect(commaList(' a , b ,, ,c')).toEqual(['a', 'b', '', 'c'])
  })

  test('Should trim Unicode white space, including next-line, but not a byte-order mark', () => {
    expect(commaList('\u00a0a\u0085,\u2007b\ufeff')).toEqual(['a', 'b\ufeff'])
  })

  test('Should trim only the ends of a part, keeping a newline inside it', () => {
    expect(commaList('x\n y,\n')).toEqual(['x\n y', ''])
  })
})

describe('#evidenceList', () => {
  test('Should split each part on its last colon and drop a part with none', () => {
    expect(
      evidenceList('src/a.js:1-4, C:/win/b.js:7 ,nocolon,:5, src/c.js:,')
    ).toEqual([
      { file: 'src/a.js', lines: '1-4' },
      { file: 'C:/win/b.js', lines: '7' },
      { file: '', lines: '5' },
      { file: 'src/c.js', lines: '' }
    ])
  })
})
