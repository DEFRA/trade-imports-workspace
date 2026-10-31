import { describe, test, expect } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadBacklogSchema, rigoursOf } from '../backlog/backlog-schema.js'
import { proposeRigour } from './rigour.js'

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(here, '..', '..', '..')

const ENVELOPE = {
  backend: { path: 'repos/trade-imports-animals-backend' },
  frontend: { path: 'repos/trade-imports-animals-frontend' },
  tests: { path: 'repos/trade-imports-ins-tests' }
}

const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  kind: 'feat',
  repos: ['frontend', 'tests'],
  status: 'todo',
  ...overrides
})

const backlogOf = (...increments) => ({ repos: ENVELOPE, increments })

const proposalsFor = (...increments) => proposeRigour(backlogOf(...increments))

describe('proposeRigour', () => {
  test('proposes standard for a one-service row', () => {
    expect(proposalsFor(row())).toEqual([
      {
        id: 'inc-001',
        title: 'Show the notification list',
        rigour: 'standard',
        source: 'derived',
        reason: 'one service repo, frontend: nothing crosses a repo boundary'
      }
    ])
  })

  test('proposes full for a row across two services, naming them', () => {
    expect(
      proposalsFor(row({ repos: ['backend', 'frontend', 'tests'] }))[0]
    ).toMatchObject({
      rigour: 'full',
      reason: 'backend and frontend: a contract between repos'
    })
  })

  test('names all three services with commas and a final and', () => {
    expect(
      proposalsFor(row({ repos: ['backend', 'frontend', 'admin'] }))[0]
    ).toMatchObject({
      rigour: 'full',
      reason: 'backend, frontend and admin: a contract between repos'
    })
  })

  test('proposes standard for a feat row that changes no backlog repo', () => {
    expect(proposalsFor(row({ repos: [] }))[0]).toMatchObject({
      rigour: 'standard',
      reason: 'no backlog repo: nothing the gate builds'
    })
  })

  test('proposes fast for a docs row that changes no backlog repo', () => {
    expect(proposalsFor(row({ repos: [], kind: 'docs' }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'a docs row in the workspace repo'
    })
  })

  test('proposes standard for a one-service row the gate runs no phase for', () => {
    expect(proposalsFor(row({ gatePhases: [] }))[0]).toMatchObject({
      rigour: 'standard',
      reason: 'one service repo, frontend: nothing crosses a repo boundary'
    })
  })

  test('proposes fast for a docs row', () => {
    expect(proposalsFor(row({ kind: 'docs' }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'a docs row: no production behaviour to read'
    })
  })

  test('names the suites a row changes when it names no service', () => {
    expect(proposalsFor(row({ repos: ['tests'] }))[0]).toMatchObject({
      rigour: 'standard',
      reason: 'tests only: no service repo changes'
    })
  })

  test('takes the row’s own rigour over anything it would derive', () => {
    expect(
      proposalsFor(row({ repos: ['backend', 'frontend'], rigour: 'fast' }))[0]
    ).toMatchObject({
      rigour: 'fast',
      source: 'row',
      reason: 'set on the row'
    })
  })

  test('proposes nothing for a row that is not todo', () => {
    expect(
      proposalsFor(row({ status: 'done' }), row({ id: 'inc-002' }))
    ).toEqual([
      {
        id: 'inc-002',
        title: 'Show the notification list',
        rigour: 'standard',
        source: 'derived',
        reason: 'one service repo, frontend: nothing crosses a repo boundary'
      }
    ])
  })

  test('treats a row with no repos field as every configured repo', () => {
    expect(proposalsFor(row({ repos: undefined }))[0]).toMatchObject({
      rigour: 'full',
      reason: 'backend and frontend: a contract between repos'
    })
  })

  test('proposes exactly the rigour presets a row may set', () => {
    const everyRule = [
      row({ repos: [] }),
      row({ id: 'inc-002', repos: [], kind: 'docs' }),
      row({ id: 'inc-003', kind: 'docs' }),
      row({ id: 'inc-004', repos: ['backend', 'frontend'] }),
      row({ id: 'inc-005', repos: ['tests'] }),
      row({ id: 'inc-006' })
    ]
    const proposed = new Set(
      proposalsFor(...everyRule).map((entry) => entry.rigour)
    )

    expect([...proposed].sort()).toEqual(
      rigoursOf(loadBacklogSchema(workspaceRoot)).sort()
    )
  })
})
