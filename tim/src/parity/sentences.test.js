import { describe, test, expect } from 'vitest'
import { sentences } from './sentences.js'

const texts = (text) => sentences(text).map((sentence) => sentence.text)

describe('sentences', () => {
  test('splits on a full stop followed by a capital', () => {
    expect(texts('One thing. Two things.')).toEqual([
      'One thing.',
      'Two things.'
    ])
  })

  test('splits on a paragraph break', () => {
    expect(texts('One.\n\nTwo.')).toEqual(['One.', 'Two.'])
  })

  test('does not split a version number or a lower-case continuation', () => {
    expect(
      sentences('accessible-autocomplete@3.0.1 is a dependency now.')
    ).toHaveLength(1)
  })

  test('splits after a citation that ends a sentence', () => {
    expect(texts('It renders at layout.njk:17. The hub does not.')).toEqual([
      'It renders at layout.njk:17.',
      'The hub does not.'
    ])
  })

  test('splits before a sentence that opens with the file it is about', () => {
    expect(
      texts('Confirmed on both sides. layout.njk:27-32 calls it.')
    ).toEqual(['Confirmed on both sides.', 'layout.njk:27-32 calls it.'])
  })

  test('does not split before a lower-case word that is not a citation', () => {
    expect(
      sentences('It imports COMMODITY_OPTIONS et al. directly from stub.js.')
    ).toHaveLength(1)
  })

  test('does not split a list number for an item', () => {
    expect(
      sentences('The groups are (1. About the consignment, 2. Movement).')
    ).toHaveLength(1)
  })

  test('does not split a quoted section number', () => {
    expect(sentences("Sections stop at '6. Contact address'.")).toHaveLength(1)
  })

  test('does not split an initialism', () => {
    expect(
      sentences('The style guide bans e.g. (copy.en.js:6) in body copy.')
    ).toHaveLength(1)
  })

  test('does not split at an elision inside a quoted expression', () => {
    expect(
      sentences("It renders `govukRadios({ name: 'type', ... Private })`.")
    ).toHaveLength(1)
  })

  test('does not split quoted code at a ternary', () => {
    expect(
      sentences('It reads `showTemperatureQuestion ? (value) : null` today.')
    ).toHaveLength(1)
  })

  test('keeps a width class that ends in a number as a sentence end', () => {
    expect(texts('The box is width-10. The hint is absent.')).toEqual([
      'The box is width-10.',
      'The hint is absent.'
    ])
  })

  test('records each sentence offset in the original text', () => {
    expect(sentences('One thing. Two things.')).toEqual([
      { text: 'One thing.', start: 0, end: 10 },
      { text: 'Two things.', start: 11, end: 22 }
    ])
  })
})
