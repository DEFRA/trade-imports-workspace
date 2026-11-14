import { afterEach, describe, expect, test, vi } from 'vitest'
import { join } from 'node:path'
import {
  normaliseRecordedText,
  recordFolderFiles
} from '../../test-support/bash-golden-harness.js'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import {
  BOARD_MISSING_MESSAGE,
  boardEpicGoldens,
  PREREQS_FOLDER,
  prereqsCases,
  recordedRun,
  stageTimWorkspace
} from '../capabilities/__fixtures__/ticket-creator-scripts.js'
import { register } from './index.js'

const jira = mockJiraForEachTest()
const staged = { current: null }

afterEach(() => {
  staged.current?.remove()
  staged.current = null
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

const caseNamed = (caseName) =>
  prereqsCases.find(({ name }) => name === caseName)

const servesBoard = ({ boardMissing }, board) => {
  const reply = boardMissing
    ? [404, { errorMessages: [BOARD_MISSING_MESSAGE], errors: {} }]
    : [200, boardEpicGoldens().boardEpicResponse]
  jira()
    .get(`/rest/agile/1.0/board/${board}/epic?maxResults=100`)
    .reply(...reply)
}

const servesPage = ({ liveVersion }, capPage) => {
  const reply =
    liveVersion === null
      ? [401, { statusCode: 401, message: 'Unauthorized' }]
      : [200, { id: capPage, title: 'Map', version: { number: liveVersion } }]
  jira()
    .get(new RegExp(`^/wiki/rest/api/content/${capPage}\\?`))
    .reply(...reply)
}

const optionValue = (args, name, fallback) => {
  const at = args.indexOf(name)
  return at === -1 ? fallback : args[at + 1]
}

const runPrereqs = async (theCase, extraArgs = []) => {
  const args = theCase.args ?? []
  if (!theCase.epicsFromTim) {
    servesBoard(theCase, optionValue(args, '--board', '13780'))
  }
  if (!theCase.epicsFromTim && !theCase.boardMissing && theCase.map !== null) {
    servesPage(theCase, optionValue(args, '--cap-page', '6468764101'))
  }
  vi.stubEnv('MIN_CAPABILITIES', undefined)
  for (const [name, value] of Object.entries(theCase.env ?? {})) {
    vi.stubEnv(name, value)
  }
  staged.current = stageTimWorkspace(theCase)
  vi.stubEnv('TIM_WORKSPACE', staged.current.root)
  const { home, root } = staged.current

  const run = await runRegisteredCommand(
    register,
    'jira',
    'prereqs',
    ...args,
    ...extraArgs
  )

  return {
    exitCode: run.exitCode,
    stdout: normaliseRecordedText(run.stdout, home),
    stderr: normaliseRecordedText(run.stderr, home),
    files: recordFolderFiles(join(root, PREREQS_FOLDER), home)
  }
}

const namingTimCheck = (text) =>
  text
    .replaceAll(
      'see tools/ticket-creator/check-capabilities.sh',
      'see tim capabilities check'
    )
    .replaceAll(
      'Run tools/ticket-creator/check-capabilities.sh for',
      'Run tim capabilities check for'
    )

const withoutJqParseError = (text) =>
  text.replace(/^jq: parse error: .*\n/m, '')

const asTimWritesIt = ({ exitCode, stdout, stderr, files }) => ({
  exitCode,
  stdout: namingTimCheck(stdout),
  stderr: withoutJqParseError(namingTimCheck(stderr)),
  files: Object.fromEntries(
    Object.entries(files).map(([path, text]) => [path, namingTimCheck(text)])
  )
})

const recordedOutput = (caseName) => {
  const { exitCode, stdout, stderr, files } = recordedRun('prereqs', caseName)
  return asTimWritesIt({ exitCode, stdout, stderr, files })
}

describe('tim jira prereqs, against what prepare-ticket-creation.sh wrote', () => {
  test.each(prereqsCases.map(({ name }) => name))(
    'Should print the same output, write the same files and exit with the same code for %s',
    async (caseName) => {
      const run = await runPrereqs(caseNamed(caseName))

      expect(run).toEqual(recordedOutput(caseName))
    }
  )
})

describe('tim jira prereqs --json', () => {
  test('Should give the counts, the warnings and the parser report, and exit 1 for a map that is not canonical', async () => {
    const run = await runPrereqs(caseNamed('not canonical, first run'), [
      '--json'
    ])

    const { ok, result } = JSON.parse(run.stdout)
    expect({
      exitCode: run.exitCode,
      ok,
      epicCount: result.epicCount,
      capCount: result.capCount,
      staleWarning: result.staleWarning,
      parseError: result.parseError,
      refusalStart: result.refusal.split('\n')[0]
    }).toEqual({
      exitCode: 1,
      ok: true,
      epicCount: 29,
      capCount: 0,
      staleWarning:
        'Synced capability map is at version 41; live page is at version 42. Re-run tim confluence sync to refresh.',
      parseError:
        'Capability map is not canonical — see tim capabilities check. capabilities.txt left unchanged.',
      refusalStart:
        'Capability map is not canonical - refusing to emit a partial list.'
    })
  })

  test('Should say why the live version could not be read', async () => {
    const run = await runPrereqs(caseNamed('live page unreadable'), ['--json'])

    expect(JSON.parse(run.stdout).result.liveVersionError).toBe(
      'getPage(6468764101): Confluence rejected the credentials. Check JIRA_USER and JIRA_TOKEN.'
    )
  })

  test('Should refuse a board that is not a number before writing anything', async () => {
    staged.current = stageTimWorkspace({ map: null })
    vi.stubEnv('TIM_WORKSPACE', staged.current.root)

    const run = await runRegisteredCommand(
      register,
      'jira',
      'prereqs',
      '--board',
      'abc'
    )

    expect({
      exitCode: run.exitCode,
      stderr: run.stderr,
      files: recordFolderFiles(
        join(staged.current.root, PREREQS_FOLDER),
        staged.current.home
      )
    }).toEqual({
      exitCode: 2,
      stderr: 'Give --board as a number, such as 13780.\n',
      files: {}
    })
  })
})
