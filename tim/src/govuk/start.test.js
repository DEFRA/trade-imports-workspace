import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createGovukChangelogClient } from '../clients/govuk-changelog-client.js'
import { createNpmRegistryClient } from '../clients/npm-registry-client.js'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import {
  ADMIN,
  changelogText,
  FRONTEND,
  giveEveryRepoAnOrigin,
  INS,
  readGovukStartGolden,
  recordStartCase,
  registryDocument,
  startCases,
  stageStartWorkspace,
  startEnv,
  USAGE_CASES
} from './__fixtures__/govuk-start.js'
import { startUpgrade } from './start.js'

const REGISTRY = 'https://registry.npmjs.org'
const RAW = 'https://raw.githubusercontent.com'
const CHANGELOG_PATH = '/alphagov/govuk-frontend/main/CHANGELOG.md'

let staged
let registryRequests

beforeEach(() => {
  const { mockPool } = installHttpMocks()
  registryRequests = 0
  mockPool(REGISTRY)
    .get('/govuk-frontend')
    .reply(200, () => {
      registryRequests += 1
      return registryDocument()
    })
    .persist()
  mockPool(RAW).get(CHANGELOG_PATH).reply(200, changelogText()).persist()
})

afterEach(() => {
  closeHttpMocks()
  staged?.remove()
  staged = undefined
})

const optionsOf = (args) => {
  const names = {
    '--ticket': 'ticket',
    '--branch': 'branch',
    '--target': 'target'
  }
  return Object.fromEntries(
    args.flatMap((arg, index) =>
      names[arg] ? [[names[arg], args[index + 1]]] : []
    )
  )
}

const withEnv = async (env, work) => {
  const before = { ...process.env }
  Object.assign(process.env, env)
  try {
    return await work()
  } finally {
    Object.keys(process.env)
      .filter((name) => !(name in before))
      .forEach((name) => delete process.env[name])
    Object.assign(process.env, before)
  }
}

const textOf = (lines) => lines.map((line) => `${line}\n`).join('')

const startInProcess = async (args, env, extra = {}) =>
  withEnv(env, async () => {
    const said = []
    const warned = []
    let exitCode = 0
    try {
      await startUpgrade({
        workspaceRoot: staged.root,
        ...optionsOf(args),
        ...extra,
        registry: createNpmRegistryClient({ registry: `${REGISTRY}/` }),
        changelogs: createGovukChangelogClient(),
        say: (line) => said.push(line),
        warn: (line) => warned.push(line)
      })
    } catch (error) {
      warned.push(error.message)
      exitCode = error.code === 'USAGE' ? 2 : 1
    }
    return { exitCode, stdout: textOf(said), stderr: textOf(warned) }
  })

const asTimExits = (golden) =>
  USAGE_CASES.has(golden.case)
    ? { ...golden, runs: golden.runs.map((run) => ({ ...run, exitCode: 2 })) }
    : golden

const pointReposAt = ({ root }, reposDir) =>
  writeFileSync(
    join(root, 'repos.json'),
    `{ "reposDir": "${reposDir}", "githubOrg": "DEFRA", "repos": [] }\n`
  )

const adminState = () =>
  JSON.parse(
    readFileSync(
      join(
        staged.root,
        'workareas/govuk-upgrades/EUDPA-500',
        ADMIN,
        `versions.${ADMIN}.json`
      ),
      'utf8'
    )
  )

describe('#startUpgrade matches start-upgrade.sh', () => {
  test.each(startCases.map((startCase) => [startCase.name, startCase]))(
    'Should print, exit, write the files and set the branches as the Bash did: %s',
    async (name, startCase) => {
      staged = stageStartWorkspace()
      const golden = readGovukStartGolden().find(
        (recorded) => recorded.case === name
      )

      const record = await recordStartCase(staged, startCase, startInProcess)

      expect(record).toEqual(asTimExits(golden))
    }
  )
})

describe('#startUpgrade', () => {
  test('Should ask the registry once per repo it needs the latest version for, and once more per repo for the list', async () => {
    staged = stageStartWorkspace()

    await recordStartCase(staged, startCases[0], startInProcess)

    expect(registryRequests).toBe(5)
  })

  test('Should reseed every version and download the changelog again with force', async () => {
    staged = stageStartWorkspace()
    await recordStartCase(staged, startCases[1], startInProcess)

    const run = await startInProcess(
      ['--ticket', 'EUDPA-500', '--target', '5.9.1'],
      {},
      { force: true }
    )

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toContain(
      'Found 8 versions to process\nFetching CHANGELOG.md from GitHub...\n'
    )
    expect(
      adminState().versions.find(({ version }) => version === '5.9.1')
    ).toEqual(expect.objectContaining({ classification: null, summary: null }))
  })

  test('Should keep an earlier version section without force', async () => {
    staged = stageStartWorkspace()
    const section = join(
      staged.root,
      'workareas/govuk-upgrades/EUDPA-500',
      ADMIN,
      'version__5.9.1.changelog.md'
    )
    await startInProcess(['--ticket', 'EUDPA-500'], {})
    writeFileSync(section, 'Edited by hand\n')

    await startInProcess(['--ticket', 'EUDPA-500'], {})

    expect(readFileSync(section, 'utf8')).toBe('Edited by hand\n')
  })

  test('Should stop with exit 0 and nothing to do when no repo depends on govuk-frontend', async () => {
    staged = stageStartWorkspace()
    mkdirSync(join(staged.root, 'only-notes', 'notes'), { recursive: true })
    pointReposAt(staged, 'only-notes')

    const run = await startInProcess(['--ticket', 'EUDPA-502'], {})

    expect(run).toEqual({
      exitCode: 0,
      stdout: `PHASE: 1\nRun ID: EUDPA-502\nBranch: chore/EUDPA-502\n\nDiscovered 0 repo(s) consuming govuk-frontend:\n\nWrote: ${join(staged.root, 'workareas/govuk-upgrades/EUDPA-502/.run-meta.json')}\n`,
      stderr: 'No repos depend on govuk-frontend — nothing to do.\n'
    })
  })

  test('Should refuse a workspace whose repos folder is missing', async () => {
    staged = stageStartWorkspace()
    pointReposAt(staged, 'no-repos-here')

    const run = await startInProcess(['--ticket', 'EUDPA-502'], {})

    expect(run).toEqual({
      exitCode: 1,
      stdout: 'PHASE: 1\nRun ID: EUDPA-502\nBranch: chore/EUDPA-502\n\n',
      stderr: `Repos dir not found: ${join(staged.root, 'no-repos-here')}\n`
    })
  })
})

const UNATTENDED_RUN = 'NO_JIRA-govuk-frontend-5.10.0'
const UNATTENDED_BRANCH = `chore/${UNATTENDED_RUN}`

const startUnattended = (args) =>
  startInProcess(args, startEnv(staged), { unattended: true })

const runMeta = (runId) =>
  JSON.parse(
    readFileSync(
      join(staged.root, 'workareas/govuk-upgrades', runId, '.run-meta.json'),
      'utf8'
    )
  )

const branchOf = (repo) =>
  execFileSync('git', ['branch', '--show-current'], {
    cwd: join(staged.root, 'repos', repo),
    encoding: 'utf8'
  }).trim()

describe('#startUpgrade unattended', () => {
  test('Should name the run after the ticket and the latest version, and say so in the header', async () => {
    staged = stageStartWorkspace()
    giveEveryRepoAnOrigin(staged)

    const run = await startUnattended(['--ticket', 'NO_JIRA'])

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toMatch(
      new RegExp(
        `^PHASE: 1\nRun ID: ${UNATTENDED_RUN}\nBranch: ${UNATTENDED_BRANCH}\nTarget: 5\\.10\\.0\nMode: unattended\n\n`
      )
    )
  })

  test('Should record the bare ticket and the unattended mode in .run-meta.json', async () => {
    staged = stageStartWorkspace()
    giveEveryRepoAnOrigin(staged)

    await startUnattended(['--ticket', 'NO_JIRA'])

    expect(runMeta(UNATTENDED_RUN)).toEqual(
      expect.objectContaining({
        ticket: 'NO_JIRA',
        mode: 'unattended',
        branch: UNATTENDED_BRANCH,
        target_version: '5.10.0'
      })
    )
  })

  test('Should create the run branch from origin/main in every repo', async () => {
    staged = stageStartWorkspace()
    giveEveryRepoAnOrigin(staged)

    const branch = 'chore/EUDPA-802-govuk-frontend-5.10.0'

    const run = await startUnattended([
      '--ticket',
      'EUDPA-802',
      '--target',
      '5.10.0'
    ])

    expect(run.stdout).toContain(
      [ADMIN, FRONTEND, INS]
        .map(
          (repo) =>
            `${repo}: created ${branch} from origin/main and switched to it\n`
        )
        .join('')
    )
    expect([ADMIN, FRONTEND, INS].map(branchOf)).toEqual([
      branch,
      branch,
      branch
    ])
  })

  test('Should end by pointing at the skill for planning one version at a time', async () => {
    staged = stageStartWorkspace()
    giveEveryRepoAnOrigin(staged)

    const run = await startUnattended(['--ticket', 'NO_JIRA'])

    expect(run.stdout).toMatch(
      /\nNext: plan one version at a time, as the govuk-upgrade skill's "Unattended mode" says\.\n$/
    )
  })

  test('Should stop before switching any branch when a repo has uncommitted changes', async () => {
    staged = stageStartWorkspace()
    giveEveryRepoAnOrigin(staged)
    writeFileSync(join(staged.root, 'repos', FRONTEND, 'draft.txt'), 'Draft\n')

    const run = await startUnattended(['--ticket', 'NO_JIRA'])

    expect(run.exitCode).toBe(1)
    expect(run.stderr).toBe(
      `Stopped before switching branches: uncommitted changes in ${FRONTEND}\n`
    )
    expect([ADMIN, FRONTEND, INS].map(branchOf)).toEqual([
      'main',
      'main',
      'main'
    ])
  })

  test.each([
    [
      ['--branch', 'chore/EUDPA-802-x', '--target', '6.6.0'],
      '--unattended names its own branch: pass --ticket EUDPA-NNNN or --ticket NO_JIRA, not --branch'
    ],
    [
      ['--ticket', 'ABC-1', '--target', '6.6.0'],
      '--ticket must match EUDPA-NNNN or be NO_JIRA (got: ABC-1)'
    ],
    [
      ['--ticket', 'EUDPA-802', '--target', 'latest'],
      '--target must be X.Y.Z in unattended mode (got: latest)'
    ],
    [
      ['--ticket', 'NO_JIRA', '--target', '6.6.0-beta.1'],
      '--target must be X.Y.Z in unattended mode (got: 6.6.0-beta.1)'
    ]
  ])(
    'Should refuse %o with exit 2 before writing anything',
    async (args, message) => {
      staged = stageStartWorkspace()

      const run = await startUnattended(args)

      expect(run).toEqual({ exitCode: 2, stdout: '', stderr: `${message}\n` })
      expect(existsSync(join(staged.root, 'workareas/govuk-upgrades'))).toBe(
        false
      )
    }
  )

  test('Should still refuse NO_JIRA without --unattended', async () => {
    staged = stageStartWorkspace()

    const run = await startInProcess(['--ticket', 'NO_JIRA'], startEnv(staged))

    expect(run).toEqual({
      exitCode: 2,
      stdout: '',
      stderr: '--ticket must match EUDPA-NNNN (got: NO_JIRA)\n'
    })
  })
})
