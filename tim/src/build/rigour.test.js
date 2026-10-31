import { describe, test, expect } from 'vitest'
import { proposeRigour } from './rigour.js'

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
        reason: 'one service repo, frontend'
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

  test('proposes fast for a row that changes no backlog repo', () => {
    expect(proposalsFor(row({ repos: [] }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'no backlog repo: the change is in the workspace repo'
    })
  })

  test('proposes fast for a row the gate runs nothing for', () => {
    expect(proposalsFor(row({ gatePhases: [] }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'the gate runs no phase for it'
    })
  })

  test('proposes fast for a docs row', () => {
    expect(proposalsFor(row({ kind: 'docs' }))[0]).toMatchObject({
      rigour: 'fast',
      reason: 'a docs row changes no production behaviour'
    })
  })

  test('proposes standard for a row that names only the test suite', () => {
    expect(proposalsFor(row({ repos: ['tests'] }))[0]).toMatchObject({
      rigour: 'standard',
      reason: 'no service repo, the test suite only'
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
        reason: 'one service repo, frontend'
      }
    ])
  })

  test('treats a row with no repos field as every configured repo', () => {
    expect(proposalsFor(row({ repos: undefined }))[0]).toMatchObject({
      rigour: 'full',
      reason: 'backend and frontend: a contract between repos'
    })
  })
})
