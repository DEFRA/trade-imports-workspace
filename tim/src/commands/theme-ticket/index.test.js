import { execa } from 'execa'
import { createServer } from 'node:http'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
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
