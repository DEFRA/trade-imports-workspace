import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { jqText } from './audit-rules.js'
import { auditBaselineToLog } from './audit-to-log.js'
import {
  EMPTY_REPORT,
  REPO,
  RUN_ID,
  stageAuditWorkspace,
  stageFakeCommands
} from './__fixtures__/npm-audit-workspace.js'
import { runnerWith } from './__fixtures__/npm-audit-replay.js'

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const stage = (fixtureCase) => {
  const staged = stageAuditWorkspace(fixtureCase)
  const fakes = stageFakeCommands(fixtureCase)
  staging.push(staged, fakes)
  return {
    logPath: join(staged.root, 'audit.log'),
    request: {
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repo: REPO,
      label: 'logged',
      runCommand: runnerWith(fakes)
    }
  }
}

describe('#auditBaselineToLog', () => {
  test('Should write the summary to the log and give exit 0 when the audit is green', async () => {
    const { logPath, request } = stage({ report: EMPTY_REPORT })

    const outcome = await auditBaselineToLog(request, { logPath })

    expect(outcome.exitCode).toBe(0)
    expect(readFileSync(logPath, 'utf8')).toBe(jqText(outcome.summary))
  })

  test('Should give exit 1 when the audit is red', async () => {
    const { logPath, request } = stage({ auditExit: 1 })

    const outcome = await auditBaselineToLog(request, { logPath })

    expect(outcome.exitCode).toBe(1)
    expect(outcome.summary.failing.length).toBeGreaterThan(0)
  })

  test('Should write the error to the log and give exit 2 when the audit cannot run', async () => {
    const { logPath, request } = stage({ report: 'not a report', auditExit: 1 })

    const outcome = await auditBaselineToLog(request, { logPath })

    expect(outcome).toEqual({ exitCode: 2, summary: null })
    expect(readFileSync(logPath, 'utf8')).toMatch(
      /^audit-ci did not produce an npm audit report for trade-imports-animals-frontend \(exit 1\)\./
    )
  })

  test('Should add to the end of the log when asked to append', async () => {
    const { logPath, request } = stage({ report: EMPTY_REPORT })
    writeFileSync(logPath, '== earlier step\n')

    const outcome = await auditBaselineToLog(request, { logPath, append: true })

    expect(readFileSync(logPath, 'utf8')).toBe(
      `== earlier step\n${jqText(outcome.summary)}`
    )
  })
})
