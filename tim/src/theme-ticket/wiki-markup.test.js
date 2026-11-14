import { describe, expect, test } from 'vitest'
import { hardWrappedLines, usesExpandMacro } from './wiki-markup.js'

describe('#hardWrappedLines', () => {
  test('Should give the first three lines that run straight on from a prose line', () => {
    const description = [
      'h2. Background',
      '',
      'This paragraph is wrapped at a short width so that it',
      'runs over two lines.',
      '',
      '* a bullet',
      '* runs on from a bullet',
      '|| a ||',
      'First wrapped line',
      'second',
      'third',
      'fourth',
      ''
    ].join('\n')

    expect(hardWrappedLines(description)).toEqual([4, 10, 11])
  })

  test('Should find nothing in a description with no wiki heading', () => {
    expect(hardWrappedLines('Short line one\nshort line two\n')).toEqual([])
  })

  test('Should find nothing when no paragraph runs on', () => {
    const longLine = 'A'.repeat(80)

    expect(
      hardWrappedLines(`h2. Head\n\n${longLine}\n\n${longLine}\n`)
    ).toEqual([])
  })

  test('Should count a line opening with a curly quote as prose', () => {
    expect(
      hardWrappedLines('h3. Head\n\n“Quoted start\nand continues\n')
    ).toEqual([4])
  })
})

describe('#usesExpandMacro', () => {
  test('Should spot an {expand} macro with or without a title', () => {
    expect([
      usesExpandMacro('{expand:Details}\nhidden\n{expand}'),
      usesExpandMacro('{expand}'),
      usesExpandMacro('h2. Plain\n')
    ]).toEqual([true, true, false])
  })
})
