import { describe, it, expect } from 'vitest'
import { makeFrontier, frontierKey } from './frontier.js'

const choice = (over = {}) => ({
  kind: 'radio-option',
  screen: 'fe-reason',
  routeTemplate: '/reason',
  control: 'importReason',
  value: 'transit',
  label: 'Transit',
  class: 'safe',
  prefix: [],
  ...over
})

describe('frontierKey', () => {
  it('gives the same choice found twice the same key', () => {
    expect(frontierKey(choice())).toBe(frontierKey(choice({ screen: 'other' })))
  })
})

describe('makeFrontier', () => {
  it('takes the same choice only once, however often it is found', () => {
    const frontier = makeFrontier()

    frontier.push(choice())
    frontier.push(choice())

    expect(frontier.size).toBe(1)
  })

  it('caps the variants explored per route and says which were capped', () => {
    const frontier = makeFrontier({ caps: { variantsPerRoute: 2 } })

    frontier.push(choice({ value: 'a' }))
    frontier.push(choice({ value: 'b' }))
    frontier.push(choice({ value: 'c' }))

    expect(frontier.remaining().map((entry) => entry.why)).toEqual([
      'unexplored',
      'unexplored',
      'variant-cap'
    ])
  })

  it('does not count a deferred task link against the variant cap', () => {
    const frontier = makeFrontier({ caps: { variantsPerRoute: 3 } })
    const task = (to) => ({
      kind: 'task',
      screen: 'fe-tasks',
      routeTemplate: '/notifications/:id/tasks',
      label: to,
      value: to,
      class: 'safe',
      prefix: []
    })

    for (const to of ['/a', '/b', '/c', '/d', '/e']) frontier.push(task(to))

    expect(frontier.pending).toBe(5)
  })

  it('still caps the alternatives of one control', () => {
    const frontier = makeFrontier({ caps: { variantsPerRoute: 3 } })
    const task = { ...choice(), kind: 'task', control: undefined, value: '/a' }

    frontier.push(task)
    for (const value of ['a', 'b', 'c', 'd']) frontier.push(choice({ value }))

    expect(frontier.remaining().map((entry) => entry.why)).toEqual([
      'unexplored',
      'unexplored',
      'unexplored',
      'unexplored',
      'variant-cap'
    ])
  })

  it('refuses a branch that would need a longer replay than the cap allows', () => {
    const frontier = makeFrontier({ caps: { replayDepth: 2 } })

    const pushed = frontier.push(choice({ prefix: [1, 2, 3] }))

    expect(pushed.why).toBe('replay-depth')
  })

  it('leaves every safe choice before it reaches a destructive one', () => {
    const frontier = makeFrontier()
    frontier.push(choice({ value: 'submit', class: 'destructive' }))
    frontier.push(choice({ value: 'transit' }))

    expect(frontier.take().value).toBe('transit')
    expect(frontier.take().value).toBe('submit')
  })

  it('empties when everything has been taken', () => {
    const frontier = makeFrontier()
    frontier.push(choice())

    frontier.take()

    expect([frontier.take(), frontier.remaining()]).toEqual([null, []])
  })

  it('says the budget ran out rather than leaving a choice unexplained', () => {
    const frontier = makeFrontier()
    frontier.push(choice())

    frontier.closeOut('budget')

    expect(frontier.remaining()[0].why).toBe('budget')
  })

  it('keeps how deep a replay would have to go, without keeping the replay', () => {
    const frontier = makeFrontier()
    frontier.push(choice({ prefix: [1, 2] }))

    const [entry] = frontier.remaining()

    expect([entry.via, entry.prefix]).toEqual([2, undefined])
  })
})
