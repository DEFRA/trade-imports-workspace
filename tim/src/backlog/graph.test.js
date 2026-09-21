import { describe, test, expect } from 'vitest'
import { findCycle } from './graph.js'

describe('findCycle', () => {
  test('returns the path for a two-node loop, first key repeated last', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['a']]
    ])

    expect(findCycle(edges)).toEqual(['a', 'b', 'a'])
  })

  test('returns all three keys for a three-node loop', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']]
    ])

    expect(findCycle(edges)).toEqual(['a', 'b', 'c', 'a'])
  })

  test('returns null for a diamond with no loop', () => {
    const edges = new Map([
      ['a', ['b', 'c']],
      ['b', ['d']],
      ['c', ['d']],
      ['d', []]
    ])

    expect(findCycle(edges)).toBeNull()
  })

  test('returns the single node twice for a self-edge', () => {
    const edges = new Map([['a', ['a']]])

    expect(findCycle(edges)).toEqual(['a', 'a'])
  })

  test('excludes a chain prefix that leads into the cycle but is not part of it', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['b']]
    ])

    expect(findCycle(edges)).toEqual(['b', 'c', 'b'])
  })

  test('finds a cycle in a later component when an earlier component is acyclic', () => {
    const edges = new Map([
      ['a', []],
      ['b', ['c']],
      ['c', ['b']]
    ])

    expect(findCycle(edges)).toEqual(['b', 'c', 'b'])
  })

  test('returns null for an empty edge map', () => {
    expect(findCycle(new Map())).toBeNull()
  })

  test('returns null when every node has no outgoing edges', () => {
    const edges = new Map([
      ['a', []],
      ['b', []]
    ])

    expect(findCycle(edges)).toBeNull()
  })

  test('returns null for a 5,000-node chain without exceeding the stack', () => {
    const CHAIN_LENGTH = 5000
    const edges = new Map(
      Array.from({ length: CHAIN_LENGTH }, (_, index) => [
        `n${index}`,
        index + 1 < CHAIN_LENGTH ? [`n${index + 1}`] : []
      ])
    )

    expect(findCycle(edges)).toBeNull()
  })

  test('ignores an edge pointing at an id that is not a node', () => {
    const edges = new Map([['a', ['nowhere']]])

    expect(findCycle(edges)).toBeNull()
  })
})
