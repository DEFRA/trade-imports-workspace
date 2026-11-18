import { describe, expect, test } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  normaliseRecordedText,
  recordFolderFiles
} from '../test-support/bash-golden-harness.js'
import { mockJiraForEachTest } from '../test-support/jira-mock.js'
import {
  JIRA_ISSUES,
  prepareFolder,
  readPrepareGolden,
  saveGhOutput,
  SPLIT_AT_BYTES,
  stagePrepareWorkspace
} from './__fixtures__/prepare-workspace.js'
import {
  DEFAULT_MAX_DIFF_BYTES,
  maxDiffBytesOf,
  prepareCheck
} from './prepare.js'

const golden = readPrepareGolden()

const jira = mockJiraForEachTest()

const answerTicketFromJira = (ticket) => {
  const scope = jira().get(`/rest/api/2/issue/${ticket}`).query({
    expand: 'renderedFields'
  })
  const issue = JIRA_ISSUES[ticket]
  if (issue) scope.reply(200, issue)
  else scope.reply(404, { errorMessages: ['Issue does not exist'] })
}

const withoutStartLines = (stdout) => stdout.replace(/^MODE: FRESH\n\n/, '')

const runPrepare = async (
  ticket,
  { maxDiffBytes = DEFAULT_MAX_DIFF_BYTES } = {}
) => {
  const staged = stagePrepareWorkspace()
  try {
    saveGhOutput(staged, ticket)
    answerTicketFromJira(ticket)
    const stdout = []
    const stderr = []
    const outcome = await prepareCheck({
      workspaceRoot: staged.root,
      ticket,
      maxDiffBytes,
      now: '2026-11-14T09:00:00Z',
      log: (line) => stdout.push(line),
      warn: (line) => stderr.push(line)
    }).then(
      () => ({ exitCode: 0 }),
      (error) => {
        stderr.push(error.message)
        return { exitCode: 1 }
      }
    )
    const folder = join(staged.root, prepareFolder(ticket))
    const allFiles = recordFolderFiles(folder, staged.home)
    const lines = (entries) =>
      normaliseRecordedText(
        entries.map((line) => `${line}\n`).join(''),
        staged.home
      )
    return {
      run: {
        ...outcome,
        stdout: lines(stdout),
        stderr: lines(stderr),
        files: Object.fromEntries(
          Object.entries(allFiles).filter(([path]) => !path.startsWith('.raw/'))
        )
      },
      rawFolderKept: existsSync(join(folder, '.raw'))
    }
  } finally {
    staged.remove()
  }
}

describe('#prepareCheck matches prepare-check.sh', () => {
  test('Should write the files, progress and redaction count start-check.sh wrote, and remove the raw folder', async () => {
    const expected = golden.startThenResume.fresh

    const { run, rawFolderKept } = await runPrepare('EUDPA-900')

    expect(run).toEqual({
      ...expected,
      stdout: withoutStartLines(expected.stdout)
    })
    expect(rawFolderKept).toBe(false)
  })

  test('Should cut each diff at the byte limit, splitting a character as head -c did, and record the coverage gaps', async () => {
    const { run } = await runPrepare('EUDPA-903', {
      maxDiffBytes: Number(SPLIT_AT_BYTES)
    })

    expect(run).toEqual(golden.textWithCut)
  })

  test('Should return the meta prepare-check.sh printed as JSON', async () => {
    const staged = stagePrepareWorkspace()
    try {
      saveGhOutput(staged, 'EUDPA-903')
      answerTicketFromJira('EUDPA-903')

      const meta = await prepareCheck({
        workspaceRoot: staged.root,
        ticket: 'EUDPA-903',
        maxDiffBytes: Number(SPLIT_AT_BYTES),
        now: '2026-11-14T09:00:00Z',
        log: () => {},
        warn: () => {}
      })

      expect(
        normaliseRecordedText(`${JSON.stringify(meta, null, 2)}\n`, staged.home)
      ).toBe(golden.jsonWithCut.stdout)
    } finally {
      staged.remove()
    }
  })

  test('Should refuse a ticket gh found no pull requests for, after writing ticket.md, and keep the raw folder', async () => {
    const expected = golden.noPullRequests

    const { run, rawFolderKept } = await runPrepare('EUDPA-901')

    expect(run).toEqual({
      ...expected,
      stdout: withoutStartLines(expected.stdout)
    })
    expect(rawFolderKept).toBe(true)
  })

  test('Should refuse a ticket Jira cannot give, writing nothing', async () => {
    const expected = golden.jiraRefuses

    const { run } = await runPrepare('EUDPA-902')

    expect(run).toEqual({
      ...expected,
      stdout: withoutStartLines(expected.stdout)
    })
  })
})

describe('#maxDiffBytesOf', () => {
  test('Should give 200000 bytes when no limit is given', () => {
    expect(maxDiffBytesOf(undefined)).toBe(200000)
  })

  test('Should give the limit given as a whole number', () => {
    expect(maxDiffBytesOf('300')).toBe(300)
  })

  test('Should refuse a limit that is not a whole number of bytes', () => {
    expect(() => maxDiffBytesOf('12kb')).toThrow(
      'Error: --max-diff-bytes must be a whole number of bytes, not 12kb'
    )
  })
})
