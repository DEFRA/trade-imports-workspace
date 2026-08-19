import { describe, it, expect } from 'vitest'
import { assembleMap, coverageOf, hintsStub, blockers } from './map.js'
import { parseMap } from './schema.js'

const screen = (over = {}) => ({
  id: 'fe-start',
  routeTemplate: '/start',
  url: '/start',
  heading: 'A page',
  title: 'A page',
  variant: null,
  fingerprint: 'aaaaaaaaaa',
  fingerprintInputs: {},
  terminal: false,
  blocked: null,
  route: [],
  model: 'fe-start.json',
  controls: [],
  outgoing: [],
  ...over
})

const body = (over = {}) => ({
  screens: [screen()],
  frontier: [],
  unfilled: [],
  warnings: [],
  stoppedBy: 'frontier-empty',
  spent: { steps: 1, replays: 1, elapsedMs: 10 },
  ...over
})

const map = (over = {}) =>
  assembleMap({
    side: 'frontend',
    baseUrl: 'http://localhost:3000',
    startPath: '/',
    appSha: 'abc123',
    harnessSha: 'def456',
    dataState: 'fresh session',
    budgets: { steps: 400 },
    mappedOn: '2026-08-19T00:00:00.000Z',
    body: body(over)
  })

describe('coverageOf', () => {
  it('counts what was mapped and what was left', () => {
    const coverage = coverageOf(
      body({
        screens: [screen(), screen({ id: 'fe-cph', blocked: { reason: 'x' } })],
        frontier: [{}, {}],
        unfilled: [{}]
      })
    )

    expect(coverage).toEqual({
      screensMapped: 2,
      routeTemplatesSeen: 1,
      frontierRemaining: 2,
      unfilledFields: 1,
      blockedScreens: 1
    })
  })
})

describe('assembleMap', () => {
  it('produces an artefact its own schema accepts', () => {
    expect(() => parseMap(map(), 'map.frontend.json')).not.toThrow()
  })

  it('records which data state the map is of', () => {
    expect(map().dataState).toBe('fresh session')
  })

  it('keeps the page models out of the artefact, since they are files of their own', () => {
    const assembled = assembleMap({
      side: 'frontend',
      baseUrl: 'http://localhost:3000',
      startPath: '/',
      appSha: 'abc',
      harnessSha: 'def',
      dataState: 'fresh session',
      budgets: {},
      body: body({ screens: [{ ...screen(), pageModel: { h1: 'A page' } }] })
    })

    expect(assembled.screens[0].pageModel).toBeUndefined()
  })
})

describe('hintsStub', () => {
  it('writes an empty entry per field nothing could fill, with what the page said', () => {
    const stub = hintsStub({
      side: 'frontend',
      unfilled: [{ screen: 'fe-cph', name: 'cph', why: 'Enter a valid CPH' }]
    })

    expect(stub.fields).toEqual({ cph: '' })
    expect(stub.notes.cph).toBe('fe-cph: Enter a valid CPH')
  })

  it('never overwrites a value a human has already filled in', () => {
    const stub = hintsStub({
      side: 'frontend',
      unfilled: [{ screen: 'fe-cph', name: 'cph', why: 'Enter a valid CPH' }],
      existing: { fields: { cph: '12/345/6789' } }
    })

    expect(stub.fields.cph).toBe('12/345/6789')
  })
})

describe('blockers', () => {
  it('says nothing about a map that reached everything', () => {
    expect(blockers(map())).toEqual([])
  })

  it('refuses to let a sample pass for an inventory', () => {
    const partial = map({ frontier: [{ label: 'Transit' }] })

    expect(blockers(partial)[0]).toContain('sample rather than an inventory')
  })
})
