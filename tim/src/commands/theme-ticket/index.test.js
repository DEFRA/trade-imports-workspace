import { execa } from 'execa'
import { createServer } from 'node:http'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'vitest'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TIM_CLI_PATH,
  createCliWorkspace,
  runTim as runTimWithoutWorkspace,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import {
  JIRA_UPDATED,
  playThemeTicketSteps,
  readThemeTicketGolden,
  withHomeMarked,
  writtenOut
} from '../../theme-ticket/__fixtures__/theme-ticket-workspace.js'

const RENAMED_IN_MESSAGES = [
  [/^start-theme-ticket:/gm, 'tim theme-ticket start:'],
  [/^derive-scenarios:/gm, 'tim theme-ticket derive:'],
  [/^check-stale:/gm, 'tim theme-ticket stale:'],
  [/^push-description:/gm, 'tim theme-ticket push:'],
  [
    'Add them to SPEC_AREA_DOMAIN in derive-scenarios.mjs',
    'Add them to SPEC_AREA_DOMAIN in tim/src/theme-ticket/derive.js'
  ],
  [
    'usage: derive-scenarios.sh --workarea <path under workareas/> --theme <id> [--workspace <dir>]',
    'Usage: tim theme-ticket derive --workarea <path under workareas/> --theme <id>'
  ]
]

const DRY_RUN_NOTICE = [
  /^Dry run\. Nothing sent\.$/m,
  'Dry run. Nothing sent. Add --confirm to send it.'
]

const START_REPORTS_THE_BACKLOG_TICKET = [
  /(\n {2}"theme": [^\n]*\n)( {2}"branch")/g,
  '$1  "ticket": null,\n$2'
]

const OFFSET_COMPARED_AS_INSTANTS = {
  'stale: every verdict': [
    [
      'f-offset               EUDPA-5      2026-04-01T10:00:00    2026-04-01T09:30:00    STALE — regenerate',
      'f-offset               EUDPA-5      2026-04-01T10:00:00    2026-04-01T09:30:00    current'
    ],
    ['5 ticket(s) compared, 2 stale.', '5 ticket(s) compared, 1 stale.']
  ]
}

const replaceAll = (text, replacements) =>
  replacements.reduce((result, [from, to]) => result.replace(from, to), text)

const asTimSaysIt = (recording) => ({
  ...recording,
  stdout: replaceAll(recording.stdout, [
    DRY_RUN_NOTICE,
    START_REPORTS_THE_BACKLOG_TICKET,
    ...(OFFSET_COMPARED_AS_INSTANTS[recording.case] ?? [])
  ]),
  stderr: replaceAll(recording.stderr, RENAMED_IN_MESSAGES)
})

const startJiraServer = async () => {
  const server = createServer((request, response) => {
    const key = decodeURIComponent(request.url.split('/').at(-1))
    const updated = JIRA_UPDATED[key]
    response.setHeader('content-type', 'application/json')
    if (!updated) {
      response.statusCode = 404
      response.end(JSON.stringify({ errorMessages: ['Issue does not exist'] }))
      return
    }
    response.end(JSON.stringify({ key, fields: { summary: key, updated } }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return server
}

const startCommentJira = async () => {
  const comments = []
  const writes = []
  const server = createServer((request, response) => {
    let text = ''
    request.on('data', (chunk) => (text += chunk))
    request.on('end', () => {
      response.setHeader('content-type', 'application/json')
      if (request.method === 'POST') {
        const { body } = JSON.parse(text)
        writes.push({ method: 'POST', body: { body } })
        const created = {
          id: '10500',
          author: { displayName: 'Sam' },
          created: '2026-11-01T09:00:00.000+0000',
          body
        }
        comments.push(created)
        response.statusCode = 201
        response.end(JSON.stringify(created))
        return
      }
      response.end(JSON.stringify({ comments }))
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, writes }
}

const derivedTwoDomains = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        '../../theme-ticket/__fixtures__/derived-two-domains.json',
        import.meta.url
      )
    ),
    'utf8'
  )
)

const commentWorkspaces = []

afterEach(() => {
  commentWorkspaces.forEach((root) =>
    rmSync(root, { recursive: true, force: true })
  )
  commentWorkspaces.length = 0
})

const commentWorkspace = (derivedContent) => {
  const root = createCliWorkspace('tim-theme-ticket-comment-')
  commentWorkspaces.push(root)
  const workarea = join(root, 'workareas', 'shared', 'eudpa-9')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(
    join(workarea, 'backlog.json'),
    JSON.stringify({ ticket: 'EUDPA-9', repos: {} })
  )
  const derived = join(workarea, 'derived.json')
  writeFileSync(derived, JSON.stringify(derivedContent))
  return { root, derived }
}

let jiraServer

beforeAll(async () => {
  jiraServer = await startJiraServer()
})

afterAll(() => new Promise((resolve) => jiraServer.close(resolve)))

const runTim = async (staged, { command, args }) => {
  const result = await execa(
    'node',
    [
      TIM_CLI_PATH,
      '--workspace',
      staged.root,
      'theme-ticket',
      command,
      ...args
    ],
    {
      cwd: staged.root,
      reject: false,
      stripFinalNewline: false,
      env: {
        TIM_NO_AUTO_PULL: '1',
        TIM_WORKSPACE: undefined,
        JIRA_USER: 'sam',
        JIRA_TOKEN: 'token',
        JIRA_BASE_URL: `http://127.0.0.1:${jiraServer.address().port}`
      },
      extendEnv: true
    }
  )
  return {
    exitCode: result.exitCode,
    stdout: withHomeMarked(result.stdout, staged.home),
    stderr: withHomeMarked(result.stderr, staged.home),
    ...writtenOut(staged, args)
  }
}

describe('tim theme-ticket matches tools/theme-ticket', () => {
  test('Should print, write and exit as the Bash recorded on every case, with the renamed messages, the dry-run notice and the offset-aware stale verdict', async () => {
    const recordings = await playThemeTicketSteps({ runCommand: runTim })

    expect(recordings).toEqual(readThemeTicketGolden().map(asTimSaysIt))
  }, 180_000)
})

describe('tim theme-ticket derive --out', () => {
  test('Should make the folder it writes into when the folder is not there yet', async () => {
    const outFile = 'workareas/release/not-made-yet/derived.json'
    const recordings = await playThemeTicketSteps({
      runCommand: async (staged, step) =>
        step.name === 'written to a file'
          ? runTim(staged, {
              ...step,
              args: [...step.args.slice(0, -1), outFile]
            })
          : {}
    })
    const run = recordings.find(
      (each) => each.case === 'derive: written to a file'
    )

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toBe(`Wrote ${outFile}\n`)
    expect(JSON.parse(run.out)).toEqual(
      expect.objectContaining({ theme: 'arrival' })
    )
  }, 180_000)
})

describe('tim theme-ticket comment', () => {
  test('shows its dry-run and --confirm examples in --help', async () => {
    const { stdout } = await runTimWithoutWorkspace([
      'theme-ticket',
      'comment',
      '--help'
    ])

    expect(stdout).toContain(
      [
        'Examples:',
        '  tim theme-ticket comment --workarea shared/eudpa-832 --derived workareas/shared/eudpa-832/tickets/derived.json',
        '  tim theme-ticket comment --workarea shared/eudpa-832 --derived workareas/shared/eudpa-832/tickets/derived.json --confirm'
      ].join('\n')
    )
  })

  test('emits an AUTH envelope when no Jira credentials are set', async () => {
    const { root, derived } = commentWorkspace({ domains: {} })

    const { stdout, exitCode } = await runTimInWorkspace(
      root,
      [
        'theme-ticket',
        'comment',
        '--workarea',
        'shared/eudpa-9',
        '--derived',
        derived,
        '--json'
      ],
      { env: { JIRA_USER: '', JIRA_TOKEN: '', JIRA_BASE_URL: '' } }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 1,
      payload: { ok: false, errors: [{ code: 'AUTH' }] }
    })
  })

  describe('against a Jira that records its comment writes', () => {
    let commentJira

    beforeEach(async () => {
      commentJira = await startCommentJira()
    })

    afterEach(() => new Promise((resolve) => commentJira.server.close(resolve)))

    const runComment = async (extraArgs) => {
      const { root, derived } = commentWorkspace(derivedTwoDomains)
      const { stdout, exitCode } = await runTimInWorkspace(
        root,
        [
          'theme-ticket',
          'comment',
          '--workarea',
          'shared/eudpa-9',
          '--derived',
          derived,
          '--json',
          ...extraArgs
        ],
        {
          env: {
            JIRA_USER: 'sam',
            JIRA_TOKEN: 'token',
            JIRA_BASE_URL: `http://127.0.0.1:${commentJira.server.address().port}`
          }
        }
      )
      return { exitCode, payload: JSON.parse(stdout.trim()) }
    }

    test('a dry run names both domains in the comment and writes nothing', async () => {
      const { exitCode, payload } = await runComment([])

      expect({
        exitCode,
        mode: payload.result.mode,
        body: payload.result.body,
        writes: commentJira.writes
      }).toEqual({
        exitCode: 0,
        mode: 'dry-run',
        body: expect.stringMatching(
          /Live animals journey[\s\S]*High-risk plants journey/
        ),
        writes: []
      })
    })

    test('--confirm sends the rendered comment to the ticket', async () => {
      const { exitCode, payload } = await runComment(['--confirm'])

      expect({
        exitCode,
        mode: payload.result.mode,
        writes: commentJira.writes
      }).toEqual({
        exitCode: 0,
        mode: 'commented',
        writes: [{ method: 'POST', body: { body: payload.result.body } }]
      })
    })
  })
})

describe('tim theme-ticket --json', () => {
  test('Should wrap the start payload in the envelope', async () => {
    const recordings = await playThemeTicketSteps({
      runCommand: async (staged, step) =>
        step.name === '--mode WRITE'
          ? runTim(staged, { ...step, args: [...step.args, '--json'] })
          : {}
    })
    const run = recordings.find((each) => each.case === 'start: --mode WRITE')

    expect(JSON.parse(run.stdout)).toEqual(
      expect.objectContaining({
        ok: true,
        result: expect.objectContaining({
          mode: 'WRITE',
          theme: 'arrival',
          branch: 'main',
          workareaDir:
            '<HOME>/git/defra/trade-imports-workspace/workareas/release'
        })
      })
    )
  }, 180_000)
})
