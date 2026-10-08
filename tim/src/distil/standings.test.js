import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { claimStandings } from './standings.js'
import { inspectSources, readSources } from './checks.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const standings = () =>
  claimStandings(
    inspectSources({
      layout: workspace.layout,
      schemas: workspace.schemas,
      sources: readSources(workspace.layout, workspace.schemas.sources),
      workarea: DEMO_WORKAREA
    })
  )

describe('claimStandings', () => {
  test('marks held, refuted and missed claims of a verified source', () => {
    workspace = makeDistilWorkspace()

    const found = standings()

    expect(
      ['tests-001', 'tests-010', 'tests-001-m1'].map(
        (claimId) => found.get(claimId).standing
      )
    ).toEqual(['held', 'refuted', 'missed'])
  })

  test('marks every claim of a source not verified yet as unverified', () => {
    workspace = makeDistilWorkspace()
    rmSync(join(workspace.layout.verifyDir, 'repo-tests.json'))

    expect(standings().get('tests-001')).toMatchObject({
      source: 'repo:tests',
      state: 'extracted',
      standing: 'unverified'
    })
  })
})
