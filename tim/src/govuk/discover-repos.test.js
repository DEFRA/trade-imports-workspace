import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ADMIN,
  FRONTEND,
  INS,
  stageStartWorkspace
} from './__fixtures__/govuk-start.js'
import {
  reposUsingGovuk,
  runMetaLines,
  runTicket,
  writeRunMeta
} from './discover-repos.js'

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

describe('#reposUsingGovuk', () => {
  test('Should list the repos depending on govuk-frontend in dependencies or devDependencies', () => {
    staged = stageStartWorkspace()

    expect(reposUsingGovuk(staged.root)).toEqual([ADMIN, FRONTEND, INS])
  })

  test('Should sort by package.json path, so a name that extends another with a hyphen comes first', () => {
    staged = stageStartWorkspace()
    const extended = join(staged.root, 'repos', `${ADMIN}-v2`)
    mkdirSync(extended)
    writeFileSync(
      join(extended, 'package.json'),
      '{ "dependencies": { "govuk-frontend": "5.0.0" } }\n'
    )

    expect(reposUsingGovuk(staged.root)).toEqual([
      `${ADMIN}-v2`,
      ADMIN,
      FRONTEND,
      INS
    ])
  })

  test('Should leave out a repo reached through a symlink', () => {
    staged = stageStartWorkspace()
    symlinkSync(
      join(staged.root, 'repos', ADMIN),
      join(staged.root, 'repos', 'linked-admin')
    )

    expect(reposUsingGovuk(staged.root)).toEqual([ADMIN, FRONTEND, INS])
  })
})

describe('#writeRunMeta', () => {
  test('Should write the run, branch, target and repos to .run-meta.json', () => {
    staged = stageStartWorkspace()

    const written = writeRunMeta({
      workspaceRoot: staged.root,
      runId: 'EUDPA-500',
      branch: 'chore/EUDPA-500'
    })

    const meta = JSON.parse(readFileSync(written.path, 'utf8'))
    expect(meta).toEqual({
      ticket: 'EUDPA-500',
      branch: 'chore/EUDPA-500',
      target_version: null,
      repos: [ADMIN, FRONTEND, INS],
      discovered_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
    })
    expect(runMetaLines(written)).toEqual([
      'Discovered 3 repo(s) consuming govuk-frontend:',
      `  ${ADMIN}`,
      `  ${FRONTEND}`,
      `  ${INS}`,
      '',
      `Wrote: ${join(staged.root, 'workareas/govuk-upgrades/EUDPA-500/.run-meta.json')}`
    ])
  })

  test('Should record the ticket and the unattended mode of an unattended run', () => {
    staged = stageStartWorkspace()

    const written = writeRunMeta({
      workspaceRoot: staged.root,
      runId: 'NO_JIRA-govuk-frontend-5.10.0',
      ticket: 'NO_JIRA',
      unattended: true,
      branch: 'chore/NO_JIRA-govuk-frontend-5.10.0',
      target: '5.10.0'
    })

    expect(JSON.parse(readFileSync(written.path, 'utf8'))).toEqual(
      expect.objectContaining({
        ticket: 'NO_JIRA',
        mode: 'unattended',
        branch: 'chore/NO_JIRA-govuk-frontend-5.10.0',
        target_version: '5.10.0'
      })
    )
  })
})

describe('#runTicket', () => {
  test('Should give the ticket the run recorded', () => {
    staged = stageStartWorkspace()
    writeRunMeta({
      workspaceRoot: staged.root,
      runId: 'EUDPA-802-govuk-frontend-5.10.0',
      ticket: 'EUDPA-802',
      unattended: true
    })

    expect(runTicket(staged.root, 'EUDPA-802-govuk-frontend-5.10.0')).toBe(
      'EUDPA-802'
    )
  })

  test('Should give the run id when the run has no .run-meta.json', () => {
    staged = stageStartWorkspace()

    expect(runTicket(staged.root, 'EUDPA-264')).toBe('EUDPA-264')
  })
})
