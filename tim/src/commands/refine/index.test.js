import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'vitest'
import { execa } from 'execa'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR, OK, USAGE } from '../../constants/exitCodes.js'
import {
  normaliseRecordedText,
  recordFolderFiles,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import { envelopeOf, TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import {
  atlassianEnv,
  startAtlassianFixtureServer
} from './__fixtures__/atlassian-server.js'
import { normaliseRecording } from './__fixtures__/normalise.js'
import {
  finalizeCases,
  prepareCases,
  refinementWorkareaFiles,
  TEMPLATE_PATH
} from './__fixtures__/refinement-workarea.js'
import { renderFinalizedText, renderPreparedText } from './index.js'

const goldenOf = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`./__fixtures__/__golden__/${name}`, import.meta.url),
      'utf8'
    )
  )

const prepareGolden = goldenOf('prepare-refinement.json')
const finalizeGolden = goldenOf('refine-finalize.json')

const commandNamesInsteadOfScripts = [
  ['refine-finalize.sh', 'tim refine finalize'],
  ['prepare-refinement.sh', 'tim refine prepare']
]

const asTimWouldSay = (text) =>
  commandNamesInsteadOfScripts.reduce(
    (changed, [script, command]) => changed.split(script).join(command),
    text
  )

const timExitFor = (bashExitCode, errorExitCode) =>
  bashExitCode === 0 ? OK : errorExitCode

let atlassian
let workspace

beforeAll(async () => {
  atlassian = await startAtlassianFixtureServer()
})

afterAll(() => atlassian.close())

beforeEach(() => {
  workspace = stageBashWorkspace({
    scripts: [],
    files: refinementWorkareaFiles()
  })
  markWorkspaceRoot(workspace.root)
  mkdirSync(join(workspace.root, 'repos'))
})

afterEach(() => workspace.remove())

const runTim = (args, { cwd, env = {}, workspaceFlag = true } = {}) =>
  execa(
    'node',
    [
      TIM_CLI_PATH,
      ...(workspaceFlag ? ['--workspace', workspace.root] : []),
      ...args
    ],
    {
      reject: false,
      cwd,
      env: { TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined, ...env },
      extendEnv: true
    }
  )

const refinementFolder = (ticket) =>
  join(workspace.root, 'workareas', 'ticket-refinement', ticket)

const recordTimRun = (run, ticket) =>
  normaliseRecording(
    {
      exitCode: run.exitCode,
      stdout: normaliseRecordedText(run.stdout, workspace.home),
      stderr: normaliseRecordedText(run.stderr, workspace.home),
      files: recordFolderFiles(refinementFolder(ticket), workspace.home)
    },
    { base: atlassian.base }
  )

describe('tim refine prepare matches prepare-refinement.sh', () => {
  test.each(
    prepareCases.map((prepareCase, index) => ({ ...prepareCase, index }))
  )(
    'Should give the recorded output, exit and files for $name',
    async ({ index, name, ticket }) => {
      const recorded = prepareGolden[index]

      const run = await runTim(['refine', 'prepare', ticket], {
        env: atlassianEnv(atlassian.base)
      })

      expect(recorded.case).toBe(name)
      const { exitCode, stdout, stderr, files } = recordTimRun(run, ticket)
      expect(exitCode).toBe(timExitFor(recorded.exitCode, USAGE))
      expect(stdout).toBe(asTimWouldSay(recorded.stdout))
      expect(stderr).toBe(recorded.stderr)
      expect(files).toEqual(recorded.files)
    },
    20_000
  )
})

describe('tim refine prepare --json', () => {
  test('Should report the folder, the meta and the links it could not read', async () => {
    const run = await runTim(['refine', 'prepare', 'EUDPA-101', '--json'], {
      env: atlassianEnv(atlassian.base)
    })

    expect(run.exitCode).toBe(OK)
    const { result } = envelopeOf(run)
    expect(result.directory).toBe(refinementFolder('EUDPA-101'))
    expect(result.meta).toEqual(
      JSON.parse(
        readFileSync(join(result.directory, '.refinement-meta.json'), 'utf8')
      )
    )
    expect(result.reviewKept).toBe(false)
    expect(result.skipped.map(({ source }) => source)).toEqual([
      `${atlassian.base}/wiki/spaces/EUDP/overview`,
      `${atlassian.base}/wiki/spaces/EUDP/pages/333/Gone`
    ])
  })

  test('Should list the comments it could not read as skipped', async () => {
    const run = await runTim(['refine', 'prepare', 'EUDPA-103', '--json'], {
      env: atlassianEnv(atlassian.base)
    })

    expect(envelopeOf(run).result.skipped.map(({ source }) => source)).toEqual([
      'comments on EUDPA-103'
    ])
  })

  test('Should print one error envelope and no progress for a ticket Jira does not have', async () => {
    const run = await runTim(['refine', 'prepare', 'EUDPA-404', '--json'], {
      env: atlassianEnv(atlassian.base)
    })

    expect(run.exitCode).toBe(USAGE)
    expect(envelopeOf(run).errors).toEqual([
      { code: 'NOT_FOUND', message: 'Error: Failed to fetch ticket EUDPA-404' }
    ])
  })
})

describe('tim refine prepare without credentials', () => {
  test('Should refuse with the bash message and exit 1', async () => {
    const run = await runTim(['refine', 'prepare', 'EUDPA-101'], {
      env: { JIRA_USER: '', JIRA_TOKEN: '', JIRA_BASE_URL: atlassian.base }
    })

    expect(run.exitCode).toBe(ERROR)
    expect(run.stderr).toBe('Error: Failed to fetch ticket EUDPA-101')
  })
})

describe('tim refine prepare with no review template', () => {
  test('Should write ticket.md and the meta, then refuse naming the template path', async () => {
    const templatePath = join(workspace.root, TEMPLATE_PATH)
    rmSync(templatePath)

    const run = await runTim(['refine', 'prepare', 'EUDPA-102'], {
      env: atlassianEnv(atlassian.base)
    })

    expect(run.exitCode).toBe(ERROR)
    expect(run.stderr).toBe(
      `Error: Refinement template not found at ${templatePath}`
    )
    expect(
      Object.keys(
        recordFolderFiles(refinementFolder('EUDPA-102'), workspace.home)
      )
    ).toEqual(['.refinement-meta.json', 'ticket.md'])
  })
})

describe('tim refine prepare from a second clone', () => {
  test('Should write into the clone it runs in when no workspace is named', async () => {
    const run = await runTim(['refine', 'prepare', 'EUDPA-102'], {
      cwd: join(workspace.root, 'repos'),
      env: atlassianEnv(atlassian.base),
      workspaceFlag: false
    })

    expect(run.exitCode).toBe(OK)
    expect(
      Object.keys(
        recordFolderFiles(refinementFolder('EUDPA-102'), workspace.home)
      )
    ).toEqual(['.refinement-meta.json', 'review.md', 'ticket.md'])
  })
})

describe('tim refine finalize matches refine-finalize.sh', () => {
  test.each(
    finalizeCases.map((finalizeCase, index) => ({ ...finalizeCase, index }))
  )(
    'Should give the recorded output, exit and meta for $name',
    async ({ index, name, ticket, args }) => {
      const recorded = finalizeGolden[index]

      const run = await runTim(['refine', 'finalize', ticket, ...args])

      expect(recorded.case).toBe(name)
      const { exitCode, stdout, stderr, files } = recordTimRun(run, ticket)
      expect(exitCode).toBe(timExitFor(recorded.exitCode, USAGE))
      expect(stdout).toBe(recorded.stdout)
      expect(stderr).toBe(asTimWouldSay(recorded.stderr))
      expect(files).toEqual(recorded.files)
    }
  )
})

describe('tim refine finalize', () => {
  test('Should stamp completed_at as UTC to the second', async () => {
    await runTim(['refine', 'finalize', 'EUDPA-202', '--verdict', 'READY'])

    const meta = JSON.parse(
      readFileSync(
        join(refinementFolder('EUDPA-202'), '.refinement-meta.json'),
        'utf8'
      )
    )
    expect(meta.completed_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
  })

  test('Should return the updated meta in the --json envelope', async () => {
    const run = await runTim([
      'refine',
      'finalize',
      'EUDPA-202',
      '--verdict',
      'NEEDS WORK',
      '--reason',
      'No AC',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual(
      expect.objectContaining({
        ticket: 'EUDPA-202',
        verdict: 'NEEDS WORK',
        reason: 'No AC',
        meta: expect.objectContaining({
          verdict: 'NEEDS WORK',
          verdict_reason: 'No AC'
        })
      })
    )
  })

  test('Should refuse a run with no --verdict', async () => {
    const run = await runTim(['refine', 'finalize', 'EUDPA-202'])

    expect(run.exitCode).toBe(ERROR)
    expect(run.stderr).toContain(
      "required option '--verdict <verdict>' not specified"
    )
  })
})

describe('renderPreparedText', () => {
  test('Should name the ticket, its folder and the finalize command to run next', () => {
    const text = renderPreparedText({
      directory: '/w/workareas/ticket-refinement/EUDPA-1',
      meta: { ticket: 'EUDPA-1', type: 'Bug', summary: 'Fix it' }
    })

    expect(text.split('\n')).toEqual([
      '',
      '=== Refinement Workspace Ready ===',
      'Ticket: EUDPA-1 (Bug)',
      'Summary: Fix it',
      'Directory: /w/workareas/ticket-refinement/EUDPA-1',
      '',
      'Created:',
      '  ✓ ticket.md',
      '  ✓ .refinement-meta.json (verdict: null)',
      '  ✓ review.md (stub from template)',
      '',
      'Next: fill review.md, then run tim refine finalize EUDPA-1 --verdict {READY|NEEDS WORK|SPIKE REQUIRED}'
    ])
  })
})

describe('renderFinalizedText', () => {
  test('Should leave out the reason line when there is no reason', () => {
    const text = renderFinalizedText({
      ticket: 'EUDPA-1',
      verdict: 'READY',
      reason: null,
      metaPath: '/m.json'
    })

    expect(text).toBe('Verdict recorded for EUDPA-1: READY\nMeta: /m.json')
  })
})
