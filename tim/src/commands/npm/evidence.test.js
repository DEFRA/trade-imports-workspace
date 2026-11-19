import { rmSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { z } from 'zod'
import { packagesPath, runFolder } from '../../npm-upgrade/state.js'
import { writeJsonAtomic } from '../../review/store.js'
import {
  createDepsWorkspace,
  createEvidenceRepo,
  editEvidenceRepo
} from '../../test-support/deps-workspace.js'
import { envelopeOf, runTimInWorkspace } from '../../test-support/tim-cli.js'

const RUN_ID = 'EUDPA-802-eslint-10'
const REPO = 'trade-imports-animals-frontend'
const OLD_RULE = 'no-old-rule'

const workspaces = []

afterEach(() => {
  workspaces
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
})

const okEnvelope = (result) =>
  z.object({ ok: z.literal(true), schema_version: z.literal(1), result })

const policySchema = okEnvelope(
  z.object({
    path: z.string(),
    packages: z.array(
      z
        .object({
          package: z.string(),
          policy: z.enum(['ci-is-enough', 'changelog-driven']),
          set: z.string().nullable(),
          set_scope: z.string().nullable(),
          policy_reason: z.string()
        })
        .strict()
    )
  })
)

const checkSchema = okEnvelope(
  z.object({
    package: z.string(),
    repo: z.string(),
    path: z.string(),
    allClean: z.boolean(),
    rowCount: z.number(),
    notCleanCount: z.number(),
    rows: z.array(z.object({ item: z.string(), clean: z.boolean() }))
  })
)

const renderSchema = okEnvelope(
  z.object({
    runId: z.string(),
    clean: z.boolean(),
    markdown: z.string(),
    repos: z.array(
      z.object({
        repo: z.string(),
        clean: z.boolean(),
        packages: z.array(z.object({ package: z.string(), clean: z.boolean() }))
      })
    )
  })
)

const stageRun = async () => {
  const root = createDepsWorkspace({ cloned: [] })
  workspaces.push(root)
  const repoPath = await createEvidenceRepo(root, REPO, {
    tracked: { 'eslint.config.js': `'${OLD_RULE}': 'error',\n` }
  })
  writeJsonAtomic(packagesPath(runFolder(root, RUN_ID), REPO), {
    ticket: RUN_ID,
    repo: REPO,
    packages: [
      {
        package: 'eslint',
        current: '9.39.0',
        target: '10.0.0',
        classification: 'manual',
        implementation_status: 'done'
      }
    ]
  })
  return { root, repoPath }
}

const ids = ['--run-id', RUN_ID, '--repo', REPO]
const packageIds = [...ids, '--package', 'eslint']

const addRenameRow = (root) =>
  runTimInWorkspace(root, [
    'npm',
    'packages',
    'add-evidence',
    ...packageIds,
    '--item',
    'Remove the no-old-rule rule',
    '--outcome',
    'applied',
    '--pattern',
    OLD_RULE
  ])

const timNpmPackages = (root, args) =>
  runTimInWorkspace(root, ['npm', 'packages', ...args])

describe('tim npm packages set-policy', () => {
  test('Should record each package policy and give it in a JSON envelope', async () => {
    const { root } = await stageRun()

    const run = await timNpmPackages(root, ['set-policy', ...ids, '--json'])

    expect(policySchema.parse(envelopeOf(run)).result.packages).toEqual([
      expect.objectContaining({
        package: 'eslint',
        policy: 'changelog-driven',
        set: 'eslint'
      })
    ])
  })

  test('Should exit 2 and say what is missing with no --repo', async () => {
    const { root } = await stageRun()

    const run = await timNpmPackages(root, ['set-policy', '--run-id', RUN_ID])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr: 'Give the repo with --repo.'
    })
  })
})

describe('tim npm packages add-evidence', () => {
  test('Should say what it recorded', async () => {
    const { root } = await stageRun()

    const run = await addRenameRow(root)

    expect({ exitCode: run.exitCode, stdout: run.stdout.trim() }).toEqual({
      exitCode: 0,
      stdout: `Added evidence for eslint in ${REPO}: applied, pattern "${OLD_RULE}" has 1 hit.`
    })
  })

  test('Should exit 2 on an outcome tim does not know', async () => {
    const { root } = await stageRun()

    const run = await timNpmPackages(root, [
      'add-evidence',
      ...packageIds,
      '--item',
      'Anything',
      '--outcome',
      'done'
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr:
        'Give --outcome as one of applied, not-applicable, needs-a-person.'
    })
  })

  test('Should exit 2 on a not-applicable row with no reason', async () => {
    const { root } = await stageRun()

    const run = await timNpmPackages(root, [
      'add-evidence',
      ...packageIds,
      '--item',
      'New option',
      '--outcome',
      'not-applicable'
    ])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr:
        'A not-applicable row needs a reason: why the repo is not affected.'
    })
  })
})

describe('tim npm packages check-evidence', () => {
  test('Should exit 0 when the change has removed every pattern', async () => {
    const { root, repoPath } = await stageRun()
    await addRenameRow(root)
    editEvidenceRepo(repoPath, {
      'eslint.config.js': "'no-new-rule': 'error',\n"
    })

    const run = await timNpmPackages(root, [
      'check-evidence',
      ...packageIds,
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      allClean: checkSchema.parse(envelopeOf(run)).result.allClean
    }).toEqual({ exitCode: 0, allClean: true })
  })

  test('Should exit 1 and say why when a pattern is still there', async () => {
    const { root } = await stageRun()
    await addRenameRow(root)

    const run = await timNpmPackages(root, ['check-evidence', ...packageIds])

    expect({ exitCode: run.exitCode, stdout: run.stdout.trim() }).toEqual({
      exitCode: 1,
      stdout: [
        `1 of 1 evidence rows for eslint in ${REPO} are not clean:`,
        '- Remove the no-old-rule rule: The pattern still has 1 hit.'
      ].join('\n')
    })
  })
})

describe('tim npm packages render-evidence', () => {
  test('Should give the clean flag and markdown in a JSON envelope', async () => {
    const { root, repoPath } = await stageRun()
    await timNpmPackages(root, ['set-policy', ...ids])
    await addRenameRow(root)
    editEvidenceRepo(repoPath, {
      'eslint.config.js': "'no-new-rule': 'error',\n"
    })
    await timNpmPackages(root, ['check-evidence', ...packageIds])

    const run = await timNpmPackages(root, [
      'render-evidence',
      '--run-id',
      RUN_ID,
      '--json'
    ])

    const { result } = renderSchema.parse(envelopeOf(run))
    expect({ exitCode: run.exitCode, clean: result.clean }).toEqual({
      exitCode: 0,
      clean: true
    })
  })

  test('Should print the markdown and exit 0 even when a package is not clean', async () => {
    const { root } = await stageRun()
    await timNpmPackages(root, ['set-policy', ...ids])

    const run = await timNpmPackages(root, [
      'render-evidence',
      '--run-id',
      RUN_ID
    ])

    expect({
      exitCode: run.exitCode,
      lastLine: run.stdout.trim().split('\n').at(-1)
    }).toEqual({
      exitCode: 0,
      lastLine: '**1 of 1 packages are not clean.**'
    })
  })
})
