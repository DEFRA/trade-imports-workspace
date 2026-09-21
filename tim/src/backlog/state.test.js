import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { startedIncrementIds } from './state.js'

let root
let statePath

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-backlog-state-'))
  statePath = join(root, 'build', 'state.json')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeState = (state) => {
  mkdirSync(join(root, 'build'), { recursive: true })
  writeFileSync(statePath, JSON.stringify(state))
}

describe('startedIncrementIds', () => {
  test('an absent file gives an empty set', () => {
    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('{} gives an empty set', () => {
    writeState({})

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('{ increments: {} } gives an empty set', () => {
    writeState({ increments: {} })

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('attempts: [] is not started', () => {
    writeState({ increments: { 'inc-001': { attempts: [] } } })

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('attempts: [{...}] is started', () => {
    writeState({ increments: { 'inc-001': { attempts: [{ n: 1 }] } } })

    expect(startedIncrementIds(statePath)).toEqual(new Set(['inc-001']))
  })

  test('attempts: 2 is started, attempts: 0 is not', () => {
    writeState({
      increments: {
        'inc-001': { attempts: 2 },
        'inc-002': { attempts: 0 }
      }
    })

    expect(startedIncrementIds(statePath)).toEqual(new Set(['inc-001']))
  })

  test('an increment with no attempts key is not started', () => {
    writeState({ increments: { 'inc-001': {} } })

    expect(startedIncrementIds(statePath)).toEqual(new Set())
  })

  test('invalid JSON throws PARSE naming the path', () => {
    mkdirSync(join(root, 'build'), { recursive: true })
    writeFileSync(statePath, '{not json')

    expect(() => startedIncrementIds(statePath)).toThrowError(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringContaining(statePath)
      })
    )
  })
})
