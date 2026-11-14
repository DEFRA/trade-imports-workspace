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
})
