import { describe, expect, test } from 'vitest'
import { namesId } from './ids-in-text.js'

describe('#namesId', () => {
  test('Should find an id that stands alone in the text', () => {
    expect(namesId('Folded into inc-002 for the shared page.', 'inc-002')).toBe(
      true
    )
  })

  test('Should find an id followed by a full stop', () => {
    expect(namesId('Folded into inc-002.', 'inc-002')).toBe(true)
  })

  test('Should not find an id that is the start of a longer id', () => {
    expect(namesId('Folded into inc-10.', 'inc-1')).toBe(false)
  })

  test('Should not find an id that ends a longer id or a dotted name', () => {
    expect([
      namesId('see xinc-1', 'inc-1'),
      namesId('see inc-1.md', 'inc-1'),
      namesId('see inc-1_a', 'inc-1')
    ]).toEqual([false, false, false])
  })
})
