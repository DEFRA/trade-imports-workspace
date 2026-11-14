import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  allowAdvisory,
  auditStateFolder,
  forgetAllowlistEntries,
  resolveRepoCheckout,
  runAuditBaseline,
  runUpgradeGate
} from './audit.js'
import {
  cases,
  EMPTY_REPORT,
  GHSA,
  REPO,
  REPO_FOLDER,
  RUN_ID,
  stageAuditWorkspace,
  stageFakeCommands
} from './__fixtures__/npm-audit-workspace.js'
import {
  expectSameAsBash,
  goldenRunOf,
  nowOf,
  replayAuditCase,
  runnerWith
} from './__fixtures__/npm-audit-replay.js'

describe.each(['baseline', 'allow', 'forget'])(
  '#%s matches the Bash',
  (commandName) => {
    test.each(
      cases[commandName].map((fixtureCase) => [fixtureCase.name, fixtureCase])
    )(
      'Should do what the Bash did: %s',
      async (name, fixtureCase) => {
        const timRun = await replayAuditCase(commandName, fixtureCase)

        expectSameAsBash(timRun, goldenRunOf(commandName, name), fixtureCase)
      },
      30_000
    )
  }
)

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const stage = (fixtureCase) => {
  const staged = stageAuditWorkspace(fixtureCase)
  const fakes = stageFakeCommands(fixtureCase)
  staging.push(staged, fakes)
  return {
    root: staged.root,
    request: {
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repo: REPO,
      now: nowOf(fixtureCase),
      runCommand: runnerWith(fakes)
    }
  }
}

const auditConfigOf = (root) =>
  JSON.parse(readFileSync(join(root, REPO_FOLDER, 'audit-ci.jsonc'), 'utf8'))

describe('#runUpgradeGate', () => {
  const upgrade = { packageName: '@hapi/hapi', target: '21.4.0' }

  test('Should be green with nothing allowlisted when the audit is clean', async () => {
    const { request } = stage({ report: EMPTY_REPORT })

    const gate = await runUpgradeGate({ ...request, ...upgrade })

    expect(gate).toEqual({ status: 'green', reason: null, allowlisted: [] })
  })

  test('Should be red and name every advisory that has a fix', async () => {
    const { request } = stage({ auditExit: 1 })

    const gate = await runUpgradeGate({ ...request, ...upgrade })

    expect(gate).toEqual({
      status: 'red',
      reason: `audit red after upgrading @hapi/hapi to 21.4.0 on an advisory with a fix: ${GHSA.ws} (ws 8.17.1), ${GHSA.braces} (braces 3.0.3)`,
      allowlisted: []
    })
  })

  test('Should be red without an owner and expiry when only advisories with no fix fail', async () => {
    const { request } = stage({
      auditExit: 1,
      registry: { braces: ['3.0.2'], 'basic-ftp': ['5.0.5'], ws: ['8.16.0'] }
    })

    const gate = await runUpgradeGate({ ...request, ...upgrade })

    expect(gate).toEqual({
      status: 'red',
      reason: `audit red after upgrading @hapi/hapi to 21.4.0 on advisories with no fix (${GHSA.ws} ${GHSA.basicFtp} ${GHSA.braces}); pass --allowlist-owner and --expiry-days to allowlist them`,
      allowlisted: []
    })
  })

  test('Should allowlist each advisory with no fix, then go green when the audit passes again', async () => {
    const { root, request } = stage({
      auditExit: [1, 0],
      auditConfig: {
        high: true,
        allowlist: [
          { [GHSA.braces]: { active: true, notes: 'n', expiry: '2099-01-01' } },
          { [GHSA.ws]: { active: true, notes: 'n', expiry: '2099-01-01' } }
        ]
      },
      registry: { braces: ['3.0.2'], 'basic-ftp': ['5.0.5'], ws: ['8.16.0'] }
    })

    const gate = await runUpgradeGate({
      ...request,
      ...upgrade,
      allowlistOwner: 'Sam',
      expiryDays: '30'
    })

    expect(gate).toEqual({
      status: 'green',
      reason: null,
      allowlisted: [GHSA.basicFtp]
    })
    expect(auditConfigOf(root).allowlist.at(-1)).toEqual({
      [GHSA.basicFtp]: {
        active: true,
        notes:
          'basic-ftp FTP command injection: no fixed release; arrived with @hapi/hapi 21.4.0. Owner: Sam',
        expiry: '2026-12-14'
      }
    })
  })

  test('Should be red and keep the GHSAs it wrote when the audit stays red after allowlisting', async () => {
    const { request } = stage({
      auditExit: 1,
      registry: { braces: ['3.0.2'], 'basic-ftp': ['5.0.5'], ws: ['8.16.0'] }
    })

    const gate = await runUpgradeGate({
      ...request,
      ...upgrade,
      allowlistOwner: 'Sam',
      expiryDays: '30'
    })

    expect(gate).toEqual({
      status: 'red',
      reason: `audit still red after allowlisting ${GHSA.ws} ${GHSA.basicFtp} ${GHSA.braces} for @hapi/hapi 21.4.0`,
      allowlisted: [GHSA.ws, GHSA.basicFtp, GHSA.braces]
    })
  })

  test('Should be red and name the GHSA it could not allowlist', async () => {
    const { request } = stage({
      auditExit: 1,
      registry: { braces: ['3.0.2'], 'basic-ftp': ['5.0.5'], ws: ['8.16.0'] },
      npmAuditReport: EMPTY_REPORT
    })

    const gate = await runUpgradeGate({
      ...request,
      ...upgrade,
      allowlistOwner: 'Sam',
      expiryDays: '30'
    })

    expect(gate).toEqual({
      status: 'red',
      reason: `audit red after upgrading @hapi/hapi to 21.4.0; could not allowlist ${GHSA.ws}`,
      allowlisted: []
    })
  })

  test('Should report that the audit could not run when audit-ci gives no report', async () => {
    const { request } = stage({ report: 'not json', auditExit: 1 })

    const gate = await runUpgradeGate({ ...request, ...upgrade })

    expect(gate).toEqual({
      status: 'not_run',
      reason: 'audit could not run after upgrading @hapi/hapi to 21.4.0',
      allowlisted: []
    })
  })

  test('Should save its audit under a label made from the package and target', async () => {
    const { root, request } = stage({ report: EMPTY_REPORT })

    await runUpgradeGate({ ...request, ...upgrade })

    const summary = JSON.parse(
      readFileSync(
        join(
          auditStateFolder(root, RUN_ID, REPO),
          `audit.${REPO}.upgrade-_hapi_hapi-21.4.0.summary.json`
        ),
        'utf8'
      )
    )
    expect(summary.label).toBe('upgrade-_hapi_hapi-21.4.0')
  })
})

describe('#runAuditBaseline', () => {
  test('Should save the report audit-ci printed byte for byte', async () => {
    const { root, request } = stage({ report: EMPTY_REPORT })

    const summary = await runAuditBaseline(request)

    expect(readFileSync(summary.snapshot, 'utf8')).toBe(
      `${JSON.stringify(EMPTY_REPORT, null, 2)}\n`
    )
    expect(summary.snapshot).toBe(
      join(auditStateFolder(root, RUN_ID, REPO), `audit.${REPO}.baseline.json`)
    )
  })
})

describe('#allowAdvisory', () => {
  test('Should keep every other key of audit-ci.jsonc in its order', async () => {
    const { root, request } = stage({})
    const path = join(root, REPO_FOLDER, 'audit-ci.jsonc')
    writeFileSync(
      path,
      '{"report-type":"summary","allowlist":[],"high":true,"skip-dev":false}\n'
    )

    await allowAdvisory({
      ...request,
      ghsa: GHSA.basicFtp,
      reason: 'r',
      owner: 'Sam',
      expiryDays: '1'
    })

    expect(Object.keys(auditConfigOf(root))).toEqual([
      'report-type',
      'allowlist',
      'high',
      'skip-dev'
    ])
  })
})

describe('#forgetAllowlistEntries', () => {
  test('Should name the state file it read, whether or not it was there', () => {
    const { root } = stage({})

    const forgotten = forgetAllowlistEntries({
      workspaceRoot: root,
      runId: RUN_ID,
      repo: REPO,
      ghsas: [GHSA.braces]
    })

    expect(forgotten).toEqual({
      dropped: [GHSA.braces],
      state_file: join(
        auditStateFolder(root, RUN_ID, REPO),
        `allowlist.${REPO}.json`
      )
    })
  })
})

describe('#resolveRepoCheckout', () => {
  test('Should refuse a checkout that is not there', () => {
    const { root } = stage({ withoutRepo: true })

    expect(() =>
      resolveRepoCheckout({ workspaceRoot: root, repo: REPO })
    ).toThrow(`Repo not found: ${join(root, 'repos', REPO)}`)
  })
})
