import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  FRONTEND,
  RUN_ID,
  SCHEMAS,
  stageStartUpgradeWorkspace
} from '../__fixtures__/npm-start-upgrade-workspace.js'
import { auditPhase, phase0Path, requireGreenPhase0 } from './audit-phase.js'
import { PhaseStopped } from './run-repos.js'

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const stagedRoot = () => {
  const staged = stageStartUpgradeWorkspace(
    { repos: { [FRONTEND]: { auditConfig: false } } },
    'http://127.0.0.1:9'
  )
  staging.push(staged)
  return staged.root
}

const ignoreLine = async () => undefined

const writePhase0 = (workspaceRoot, runs) => {
  const path = phase0Path(workspaceRoot, RUN_ID)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ runs }))
}

describe('#auditPhase', () => {
  test('Should record a repo whose audit cannot run as red, with the label and time of the run', async () => {
    const workspaceRoot = stagedRoot()

    const outcome = await auditPhase({
      workspaceRoot,
      runId: RUN_ID,
      repos: [FRONTEND],
      branch: '',
      now: new Date('2026-11-14T09:30:05.123Z'),
      warn: ignoreLine
    })

    expect(outcome.exitCode).toBe(1)
    expect(outcome.result).toMatchObject({
      ran_at: '2026-11-14T09:30:05Z',
      label: 'phase0-20261114T093005Z',
      green: false,
      red: [FRONTEND],
      per_repo: [
        {
          repo: FRONTEND,
          green: false,
          error: 'tim npm audit baseline could not run the audit',
          exit_code: 2
        }
      ]
    })
  })

  test('Should add each run to phase0.json after the earlier ones', async () => {
    const workspaceRoot = stagedRoot()
    writePhase0(workspaceRoot, [{ label: 'earlier' }])

    await auditPhase({
      workspaceRoot,
      runId: RUN_ID,
      repos: [FRONTEND],
      branch: 'main',
      warn: ignoreLine
    })

    const { runs } = JSON.parse(
      readFileSync(phase0Path(workspaceRoot, RUN_ID), 'utf8')
    )
    expect(runs.map(({ label, branch }) => [label, branch])).toEqual([
      ['earlier', undefined],
      [expect.stringMatching(/^phase0-\d{8}T\d{6}Z$/), 'main']
    ])
  })
})

describe('#requireGreenPhase0', () => {
  test('Should refuse a repo that is green in an earlier run but missing from the last one', async () => {
    const workspaceRoot = stagedRoot()
    writePhase0(workspaceRoot, [
      { per_repo: [{ repo: SCHEMAS, exit_code: 0, head: 'abc' }] },
      { per_repo: [] }
    ])

    const gate = requireGreenPhase0({
      workspaceRoot,
      runId: RUN_ID,
      repos: [SCHEMAS],
      warn: ignoreLine
    })

    await expect(gate).rejects.toThrow(
      new PhaseStopped(
        `Refusing phase 1 until a green phase 0 run covers these repos:\n  ${SCHEMAS}: not in the last phase 0 run`
      )
    )
  })
})
