import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  FRONTEND,
  INS,
  stageStartWorkspace
} from './__fixtures__/govuk-start.js'
import { auditRepos, preflightLines } from './audit-preflight.js'

let staged
const pathBefore = process.env.PATH

afterEach(() => {
  process.env.PATH = pathBefore
  staged?.remove()
  staged = undefined
})

describe('#auditRepos', () => {
  test('Should count critical and high advisories, and none for output that is not an audit report', async () => {
    staged = stageStartWorkspace()
    process.env.PATH = `${join(staged.home, 'stub-bin')}:${pathBefore}`

    const audits = await auditRepos({
      workspaceRoot: staged.root,
      repos: [ADMIN, FRONTEND, INS]
    })

    expect(audits).toEqual([
      { repo: ADMIN, critical: 0, high: 2, flagged: true },
      { repo: FRONTEND, critical: 0, high: 0, flagged: false },
      { repo: INS, critical: 0, high: 0, flagged: false }
    ])
  })
})

describe('#preflightLines', () => {
  test('Should warn about a flagged repo and add the advice', () => {
    const lines = preflightLines([
      { repo: ADMIN, critical: 1, high: 0, flagged: true },
      { repo: INS, critical: 0, high: 0, flagged: false }
    ])

    expect(lines).toEqual([
      '',
      '=== SECURITY PRE-FLIGHT (npm audit, HIGH/CRITICAL) ===',
      `  [WARN] ${ADMIN}: 1 critical, 0 high — resolve before/alongside the upgrade`,
      `  [ok]   ${INS}: no high/critical advisories`,
      '',
      '  Clear flagged advisories before Phase 3 (direct-dep bump or an',
      "  'overrides' entry — see the npm-upgrade skill), or proceed knowing",
      "  the upgrade commit may be blocked by a repo's pre-commit audit."
    ])
  })

  test('Should give only the heading and ok lines when nothing is flagged', () => {
    expect(
      preflightLines([{ repo: INS, critical: 0, high: 0, flagged: false }])
    ).toEqual([
      '',
      '=== SECURITY PRE-FLIGHT (npm audit, HIGH/CRITICAL) ===',
      `  [ok]   ${INS}: no high/critical advisories`
    ])
  })
})
