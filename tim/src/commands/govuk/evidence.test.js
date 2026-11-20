import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { ERROR, OK, USAGE } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import { applyEnv } from '../../govuk/__fixtures__/govuk-apply.js'
import {
  ABSENT_PATTERN,
  EVIDENCE_REPO,
  EVIDENCE_RUN,
  evidenceRepoLog,
  evidenceStatePath,
  evidenceVersion,
  NEW_CLASS,
  OLD_CLASS,
  stageEvidenceWorkspace,
  writeLayout
} from '../../govuk/__fixtures__/govuk-evidence.js'

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const timGovuk = (command, version, extra = []) =>
  recordTimRun(
    staged,
    [
      'govuk',
      command,
      '--run-id',
      EVIDENCE_RUN,
      '--repo',
      EVIDENCE_REPO,
      ...(version ? ['--govuk-version', version] : []),
      ...extra
    ],
    { env: applyEnv(staged) }
  )

const addApplied = () =>
  timGovuk('add-evidence', '5.5.0', [
    '--item',
    'Remove the service name link class',
    '--outcome',
    'applied',
    '--pattern',
    OLD_CLASS
  ])

const addNotApplicable = (version, item) =>
  timGovuk('add-evidence', version, [
    '--item',
    item,
    '--outcome',
    'not-applicable',
    '--reason',
    'Nothing in this repo uses it'
  ])

const stateText = () => readFileSync(evidenceStatePath(staged), 'utf8')

const packageText = () =>
  readFileSync(
    join(staged.root, 'repos', EVIDENCE_REPO, 'package.json'),
    'utf8'
  )

describe('tim govuk add-evidence', () => {
  test('Should record the row with its hits before and say so', async () => {
    staged = stageEvidenceWorkspace()

    const run = await addApplied()

    expect(run).toEqual({
      exitCode: OK,
      stdout: `Added evidence for ${EVIDENCE_REPO}@5.5.0: applied, the pattern "${OLD_CLASS}" has 2 hits\n`,
      stderr: ''
    })
    expect(evidenceVersion(staged, '5.5.0').evidence).toEqual([
      {
        item: 'Remove the service name link class',
        pattern: OLD_CLASS,
        hitsBefore: 2,
        hitsAfter: null,
        outcome: 'applied',
        reason: ''
      }
    ])
  })

  test('Should refuse an applied row whose pattern has no hits with exit 2 and leave the state file alone', async () => {
    staged = stageEvidenceWorkspace()
    const before = stateText()

    const run = await timGovuk('add-evidence', '5.5.0', [
      '--item',
      'x',
      '--outcome',
      'applied',
      '--pattern',
      ABSENT_PATTERN
    ])

    expect(run).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr: `The pattern "${ABSENT_PATTERN}" has no hits, so there is nothing to apply. Record the item as not-applicable.\n`
    })
    expect(stateText()).toBe(before)
  })

  test('Should refuse a missing --outcome with exit 2', async () => {
    staged = stageEvidenceWorkspace()

    const run = await timGovuk('add-evidence', '5.5.0', ['--item', 'x'])

    expect(run).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr: 'Missing --outcome\n'
    })
  })
})

describe('tim govuk check-evidence', () => {
  test('Should exit 1 and name the row while the pattern still has hits', async () => {
    staged = stageEvidenceWorkspace()
    await addApplied()

    const run = await timGovuk('check-evidence', '5.5.0')

    expect(run).toEqual({
      exitCode: ERROR,
      stdout: `1 of 1 evidence rows for ${EVIDENCE_REPO}@5.5.0 are not clean:\n- Remove the service name link class: The pattern still has 2 hits.\n`,
      stderr: ''
    })
  })

  test('Should exit 0 once the pattern has gone, and record 0 hits after', async () => {
    staged = stageEvidenceWorkspace()
    await addApplied()
    writeLayout(staged, NEW_CLASS)

    const run = await timGovuk('check-evidence', '5.5.0', ['--json'])

    expect(run.exitCode).toBe(OK)
    expect(JSON.parse(run.stdout).result).toEqual(
      expect.objectContaining({ allClean: true, rowCount: 1 })
    )
    expect(evidenceVersion(staged, '5.5.0').evidence[0].hitsAfter).toBe(0)
  })
})

describe('tim govuk apply --unattended', () => {
  test('Should refuse a version whose evidence is not clean with exit 1, changing neither the state file nor package.json', async () => {
    staged = stageEvidenceWorkspace()
    await addApplied()
    const stateBefore = stateText()
    const packageBefore = packageText()

    const run = await timGovuk('apply', '5.5.0', ['--unattended'])

    expect(run).toEqual({
      exitCode: ERROR,
      stdout: '',
      stderr: `Can't apply ${EVIDENCE_REPO}@5.5.0 unattended: its evidence is not all clean, and govuk-frontend 5.4.0 to 5.5.0 is changelog-driven.\n1 of 1 evidence rows for ${EVIDENCE_REPO}@5.5.0 are not clean:\n- Remove the service name link class: The pattern still has 2 hits.\n`
    })
    expect(stateText()).toBe(stateBefore)
    expect(packageText()).toBe(packageBefore)
  })

  test('Should refuse an intermediate noop version with no evidence before marking it done', async () => {
    staged = stageEvidenceWorkspace()

    const run = await timGovuk('apply', '5.6.0', ['--unattended'])

    expect(run.exitCode).toBe(ERROR)
    expect(evidenceVersion(staged, '5.6.0').implementation_status).toBeNull()
  })

  test('Should apply a version without --unattended whatever its evidence', async () => {
    staged = stageEvidenceWorkspace()

    const run = await timGovuk('apply', '5.5.0')

    expect(run.exitCode).toBe(OK)
    expect(evidenceVersion(staged, '5.5.0').implementation_status).toBe('done')
  })
})

describe('An unattended govuk-frontend run, from evidence to the pull request table', () => {
  test('Should apply every version once its evidence is clean, commit under the run ticket and render a clean table', async () => {
    staged = stageEvidenceWorkspace()
    writeFileSync(
      join(
        staged.root,
        'workareas/govuk-upgrades',
        EVIDENCE_RUN,
        EVIDENCE_REPO,
        'version__5.7.0.changelog.md'
      ),
      '## govuk-frontend v5.7.0 — Changelog\n'
    )
    await addApplied()
    await addNotApplicable('5.6.0', 'Fix the accordion focus style')
    await addNotApplicable('5.7.0', 'Internal build changes')
    writeLayout(staged, NEW_CLASS)
    const checks = [
      await timGovuk('check-evidence', '5.5.0'),
      await timGovuk('check-evidence', '5.6.0'),
      await timGovuk('check-evidence', '5.7.0')
    ]

    const applies = [
      await timGovuk('apply', '5.5.0', ['--unattended']),
      await timGovuk('apply', '5.6.0', ['--unattended']),
      await timGovuk('apply', '5.7.0', ['--unattended'])
    ]
    const rendered = await timGovuk('render-evidence', null, ['--json'])

    expect(checks.map(({ exitCode }) => exitCode)).toEqual([OK, OK, OK])
    expect(applies.map(({ exitCode }) => exitCode)).toEqual([OK, OK, OK])
    expect(evidenceRepoLog(staged).slice(0, 2)).toEqual([
      'chore(NO_JIRA): upgrade govuk-frontend to 5.7.0',
      'chore(NO_JIRA): upgrade govuk-frontend to 5.5.0'
    ])
    expect(JSON.parse(rendered.stdout).result).toEqual(
      expect.objectContaining({
        allClean: true,
        rowCount: 3,
        notCleanCount: 0
      })
    )
  })

  test('Should print the table as markdown and exit 0 when a row is not clean', async () => {
    staged = stageEvidenceWorkspace()
    await addApplied()

    const run = await timGovuk('render-evidence')

    expect(run.exitCode).toBe(OK)
    expect(run.stdout).toContain(
      `| v5.5.0: Remove the service name link class | **Applied** | \`${OLD_CLASS}\`: 2 hits before, not counted after.<br>**Not clean:** The pattern has not been counted since the change. |`
    )
  })
})

describe('tim govuk --help for the evidence commands', () => {
  test.each([
    ['add-evidence', 'Usage: tim govuk add-evidence [options]'],
    ['check-evidence', 'Usage: tim govuk check-evidence [options]'],
    ['render-evidence', 'Usage: tim govuk render-evidence [options]']
  ])('Should give %s a usage line', async (command, usage) => {
    staged = stageEvidenceWorkspace()

    const run = await recordTimRun(staged, ['govuk', command, '--help'])

    expect(run.stdout.split('\n')[0]).toBe(usage)
  })
})
