import { describe, test, expect, vi, afterEach } from 'vitest'
import { register } from './index.js'
import {
  mockJiraForEachTest,
  loadJiraFixture
} from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import { timMessageFor } from '../../test-support/bash-message.js'

const goldens = loadJiraFixture('detach-unlink-bash-goldens.json')
const attachments = loadJiraFixture('issue-attachments-duplicates.json')

const jira = mockJiraForEachTest()

afterEach(() => {
  vi.restoreAllMocks()
})

const runTim = (...args) => runRegisteredCommand(register, ...args)

const servesAttachments = (key, issue) =>
  jira()
    .get(`/rest/api/2/issue/${key}`)
    .query({ fields: 'attachment' })
    .reply(200, issue)

const acceptsDeleteOf = (attachmentId, status = 204) =>
  jira().delete(`/rest/api/2/attachment/${attachmentId}`).reply(status)

describe('tim jira detach --list', () => {
  test("prints the ticket's attachments byte for byte as the Bash script did", async () => {
    servesAttachments('EUDPA-1', attachments)

    const { stdout, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-1',
      '--list'
    )

    expect(stdout).toBe(`${goldens['detach-list'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test('says the ticket has no attachments, as the Bash script did', async () => {
    servesAttachments('EUDPA-2', { key: 'EUDPA-2', fields: { attachment: [] } })

    const { stdout, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-2',
      '--list'
    )

    expect(stdout).toBe(`${goldens['detach-list-empty'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test("gives Jira's reason in the Bash script words and exits 1 when Jira cannot find the ticket", async () => {
    jira()
      .get('/rest/api/2/issue/EUDPA-9')
      .query({ fields: 'attachment' })
      .reply(404, { errorMessages: ['Issue does not exist'] })

    const { stdout, stderr, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-9',
      '--list'
    )

    expect(stdout).toBe('')
    expect(stderr).toBe(
      `${timMessageFor(goldens['detach-list-unknown-issue'])}\n`
    )
    expect(exitCode).toBe(goldens['detach-list-unknown-issue'].exitCode)
  })
})

describe('tim jira detach by filename', () => {
  test('sends no DELETE without --confirm and says what it would delete', async () => {
    servesAttachments('EUDPA-1', attachments)
    const deletion = acceptsDeleteOf('503')

    const { stdout, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-1',
      'notes.md'
    )

    expect(deletion.isDone()).toBe(false)
    expect(stdout).toBe(
      'Would delete: notes.md (id 503)\nThis is a dry run. Nothing has been deleted. Add --confirm to delete for real.\n'
    )
    expect(exitCode).toBe(0)
  })

  test('deletes the one attachment with the filename and prints what the Bash script printed', async () => {
    servesAttachments('EUDPA-1', attachments)
    const deletion = acceptsDeleteOf('503')

    const { stdout, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-1',
      'notes.md',
      '--confirm'
    )

    expect(deletion.isDone()).toBe(true)
    expect(stdout).toBe(`${goldens['detach-unique'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test('refuses a filename that several attachments share, lists them as the Bash script did and exits 2', async () => {
    servesAttachments('EUDPA-1', attachments)
    const deletion = acceptsDeleteOf('501')

    const { stdout, stderr, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-1',
      'diagram.svg',
      '--confirm'
    )

    expect(deletion.isDone()).toBe(false)
    expect(stdout).toBe('')
    expect(stderr).toBe(`${timMessageFor(goldens['detach-ambiguous'])}\n`)
    expect(exitCode).toBe(2)
  })

  test('deletes every attachment with the filename with --all and prints what the Bash script printed', async () => {
    servesAttachments('EUDPA-1', attachments)
    const firstDeletion = acceptsDeleteOf('501')
    const secondDeletion = acceptsDeleteOf('502')

    const { stdout, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-1',
      'diagram.svg',
      '--all',
      '--confirm'
    )

    expect([firstDeletion.isDone(), secondDeletion.isDone()]).toEqual([
      true,
      true
    ])
    expect(stdout).toBe(`${goldens['detach-all'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test('prints the attachments it deleted to stdout and the failed delete to stderr, with no URL, and exits 1', async () => {
    servesAttachments('EUDPA-1', attachments)
    acceptsDeleteOf('501')
    acceptsDeleteOf('502', 403)

    const { stdout, stderr, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-1',
      'diagram.svg',
      '--all',
      '--confirm'
    )

    expect(stdout).toBe('Deleted: diagram.svg (id 501)\n')
    expect(stderr).toBe(
      `${timMessageFor({ stderr: 'Error: not permitted to delete attachment 502' })}\n`
    )
    expect(exitCode).toBe(1)
  })

  test('says no attachment has the filename, in the Bash script words, and exits 1', async () => {
    servesAttachments('EUDPA-1', attachments)

    const { stderr, exitCode } = await runTim(
      'jira',
      'detach',
      'EUDPA-1',
      'missing.png',
      '--confirm'
    )

    expect(stderr).toBe(`${timMessageFor(goldens['detach-no-match'])}\n`)
    expect(exitCode).toBe(goldens['detach-no-match'].exitCode)
  })
})

describe('tim jira detach --id', () => {
  test('sends no DELETE without --confirm', async () => {
    const deletion = acceptsDeleteOf('501')

    const { stdout, exitCode } = await runTim('jira', 'detach', '--id', '501')

    expect(deletion.isDone()).toBe(false)
    expect(stdout).toBe(
      'Would delete: attachment (id 501)\nThis is a dry run. Nothing has been deleted. Add --confirm to delete for real.\n'
    )
    expect(exitCode).toBe(0)
  })

  test('deletes the attachment and prints what the Bash script printed', async () => {
    const deletion = acceptsDeleteOf('501')

    const { stdout, exitCode } = await runTim(
      'jira',
      'detach',
      '--id',
      '501',
      '--confirm'
    )

    expect(deletion.isDone()).toBe(true)
    expect(stdout).toBe(`${goldens['detach-id'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test.each([
    ['detach-id-forbidden', '700', 403],
    ['detach-id-missing', '701', 404],
    ['detach-id-server-error', '702', 500]
  ])(
    'reports %s in the Bash script words with its exit code',
    async (golden, attachmentId, status) => {
      acceptsDeleteOf(attachmentId, status)

      const { stderr, exitCode } = await runTim(
        'jira',
        'detach',
        '--id',
        attachmentId,
        '--confirm'
      )

      expect(stderr).toBe(`${timMessageFor(goldens[golden])}\n`)
      expect(exitCode).toBe(goldens[golden].exitCode)
    }
  )

  test('refuses an id that is not a number and exits 1', async () => {
    const { stderr, exitCode } = await runTim(
      'jira',
      'detach',
      '--id',
      '../issue/EUDPA-1'
    )

    expect(stderr).toBe(
      "Give the attachment's numeric id, for example 479899.\n"
    )
    expect(exitCode).toBe(1)
  })
})

describe('tim jira detach with nothing to do', () => {
  test.each([
    ['detach-no-key', []],
    ['detach-no-filename', ['EUDPA-1']]
  ])(
    'refuses %s in the Bash script words with its exit code',
    async (golden, args) => {
      const { stderr, exitCode } = await runTim('jira', 'detach', ...args)

      expect(stderr).toBe(`${timMessageFor(goldens[golden])}\n`)
      expect(exitCode).toBe(goldens[golden].exitCode)
    }
  )
})
