import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { renderStartText } from './start.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const WORKAREA = 'shared/programme'

const JIRA_ARGS = [
  '--base',
  'main',
  '--jira-project',
  'EUDPA',
  '--epic',
  'EUDPA-1',
  '--in-dev-status',
  'In Dev',
  '--done-status',
  'Done',
  '--board',
  '13780'
]

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const seedBacklog = (increments) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-start-cli-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'))
  const workarea = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(
    join(workarea, 'backlog.json'),
    JSON.stringify({
      repos: { frontend: { path: 'repos/frontend' } },
      increments
    })
  )
}

// No Jira credentials, so a start that reaches the ticket step fails there
// without a network call.
const runTim = (args) =>
  execa('node', [cliPath, 'build', 'start', ...args, '--workspace', root], {
    reject: false,
    env: {
      TIM_NO_AUTO_PULL: '1',
      JIRA_USER: '',
      JIRA_TOKEN: '',
      JIRA_BASE_URL: ''
    }
  })

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

const todo = {
  id: 'inc-001',
  title: 'Add the origin page',
  detail: 'Why.',
  acceptanceCriteria: ['It saves'],
  dependsOn: [],
  status: 'todo'
}

describe('tim build start', () => {
  test('exits 0 with no id when nothing is buildable', async () => {
    seedBacklog([{ ...todo, status: 'done' }])

    const run = await runTim([WORKAREA, ...JIRA_ARGS, '--json'])

    expect({ exitCode: run.exitCode, envelope: envelopeOf(run) }).toEqual({
      exitCode: 0,
      envelope: expect.objectContaining({
        ok: true,
        errors: [],
        result: expect.objectContaining({ id: null, failedStep: null })
      })
    })
  })

  test('names the ticket step and its reason when Jira cannot be reached', async () => {
    seedBacklog([todo])

    const run = await runTim([WORKAREA, ...JIRA_ARGS, '--json'])

    expect({ exitCode: run.exitCode, envelope: envelopeOf(run) }).toEqual({
      exitCode: 1,
      envelope: expect.objectContaining({
        ok: false,
        errors: [
          {
            code: 'TICKET_FAILED',
            message: 'Set JIRA_USER and JIRA_TOKEN to authenticate with Jira.'
          }
        ],
        result: expect.objectContaining({
          id: 'inc-001',
          failedStep: 'ticket'
        })
      })
    })
  })

  test('refuses to start without the epic', async () => {
    seedBacklog([todo])
    const withoutEpic = JIRA_ARGS.filter(
      (arg, index) => arg !== '--epic' && JIRA_ARGS[index - 1] !== '--epic'
    )

    const run = await runTim([WORKAREA, ...withoutEpic])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr: 'Give --epic, such as EUDPA-20628.'
    })
  })
})

describe('renderStartText', () => {
  test('says what each step did', () => {
    expect(
      renderStartText({
        id: 'inc-001',
        repeat: false,
        ticket: { key: 'EUDPA-5', created: true, status: 'In Dev' },
        warnings: [],
        branched: [
          {
            repo: 'frontend',
            branch: 'feat/EUDPA-5-x',
            head: 'abc1234',
            cut: true,
            from: 'origin/main'
          }
        ],
        resumeAt: 'build',
        failedStep: null,
        reason: null
      })
    ).toBe(
      [
        'Increment inc-001.',
        'Raised EUDPA-5, now In Dev, on the board.',
        '  frontend  cut feat/EUDPA-5-x from origin/main at abc1234',
        'Resume at build.'
      ].join('\n')
    )
  })

  test('names what the workspace repo carried and which repos need a person’s approval', () => {
    expect(
      renderStartText({
        id: 'inc-002',
        repeat: false,
        ticket: null,
        warnings: [],
        branched: [],
        preexistingDirty: ['README.md', 'workareas/'],
        requireApproval: ['workspace'],
        resumeAt: null,
        failedStep: null,
        reason: null
      })
    ).toBe(
      [
        'Increment inc-002.',
        'The workspace repo carried uncommitted files across the switch, which are not this increment’s: README.md, workareas/.',
        'A person must approve the pull request before it merges in: workspace.'
      ].join('\n')
    )
  })
})
