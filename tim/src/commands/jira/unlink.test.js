import { describe, test, expect, vi, afterEach } from 'vitest'
import { register } from './index.js'
import {
  mockJiraForEachTest,
  loadJiraFixture
} from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import { timMessageFor } from '../../test-support/bash-message.js'

const goldens = loadJiraFixture('detach-unlink-bash-goldens.json')

const jira = mockJiraForEachTest()

afterEach(() => {
  vi.restoreAllMocks()
})

const runTim = (...args) => runRegisteredCommand(register, ...args)

const servesLinks = (key, issue) =>
  jira()
    .get(`/rest/api/2/issue/${key}`)
    .query({ fields: 'issuelinks' })
    .reply(200, issue)

const acceptsDeleteOf = (linkId, status = 204) =>
  jira().delete(`/rest/api/2/issueLink/${linkId}`).reply(status)

describe('tim jira unlink --list', () => {
  test("prints the ticket's links in both directions byte for byte as the Bash script did", async () => {
    servesLinks('EUDPA-1', loadJiraFixture('issue-links-both-directions.json'))

    const { stdout, exitCode } = await runTim(
      'jira',
      'unlink',
      'EUDPA-1',
      '--list'
    )

    expect(stdout).toBe(`${goldens['unlink-list'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test('says the ticket has no issue links, as the Bash script did', async () => {
    servesLinks('EUDPA-2', { key: 'EUDPA-2', fields: { issuelinks: [] } })

    const { stdout, exitCode } = await runTim(
      'jira',
      'unlink',
      'EUDPA-2',
      '--list'
    )

    expect(stdout).toBe(`${goldens['unlink-list-empty'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test("gives Jira's reason in the Bash script words and exits 1 when Jira cannot find the ticket", async () => {
    jira()
      .get('/rest/api/2/issue/EUDPA-9')
      .query({ fields: 'issuelinks' })
      .reply(404, { errorMessages: ['Issue does not exist'] })

    const { stdout, stderr, exitCode } = await runTim(
      'jira',
      'unlink',
      'EUDPA-9',
      '--list'
    )

    expect(stdout).toBe('')
    expect(stderr).toBe(
      `${timMessageFor(goldens['unlink-list-unknown-issue'])}\n`
    )
    expect(exitCode).toBe(goldens['unlink-list-unknown-issue'].exitCode)
  })
})

describe('tim jira unlink --id', () => {
  test('sends no DELETE without --confirm', async () => {
    const deletion = acceptsDeleteOf('601')

    const { stdout, exitCode } = await runTim('jira', 'unlink', '--id', '601')

    expect(deletion.isDone()).toBe(false)
    expect(stdout).toBe(
      'Would delete: issue link id 601\nThis is a dry run. Nothing has been deleted. Add --confirm to delete for real.\n'
    )
    expect(exitCode).toBe(0)
  })

  test('deletes the link and prints what the Bash script printed', async () => {
    const deletion = acceptsDeleteOf('601')

    const { stdout, exitCode } = await runTim(
      'jira',
      'unlink',
      '--id',
      '601',
      '--confirm'
    )

    expect(deletion.isDone()).toBe(true)
    expect(stdout).toBe(`${goldens['unlink-id'].stdout}\n`)
    expect(exitCode).toBe(0)
  })

  test('returns the deleted link id in --json', async () => {
    acceptsDeleteOf('601')

    const { stdout } = await runTim(
      'jira',
      'unlink',
      '--id',
      '601',
      '--confirm',
      '--json'
    )

    expect(JSON.parse(stdout)).toMatchObject({
      ok: true,
      result: { mode: 'deleted', id: '601' }
    })
  })

  test.each([
    ['unlink-id-forbidden', '700', 403],
    ['unlink-id-missing', '701', 404],
    ['unlink-id-server-error', '702', 500]
  ])(
    'reports %s in the Bash script words with its exit code',
    async (golden, linkId, status) => {
      acceptsDeleteOf(linkId, status)

      const { stderr, exitCode } = await runTim(
        'jira',
        'unlink',
        '--id',
        linkId,
        '--confirm'
      )

      expect(stderr).toBe(`${timMessageFor(goldens[golden])}\n`)
      expect(exitCode).toBe(goldens[golden].exitCode)
    }
  )
})

describe('tim jira unlink with nothing to do', () => {
  test.each([
    ['unlink-no-key', []],
    ['unlink-key-without-list', ['EUDPA-1']]
  ])(
    'refuses %s in the Bash script words with its exit code',
    async (golden, args) => {
      const { stderr, exitCode } = await runTim('jira', 'unlink', ...args)

      expect(stderr).toBe(`${timMessageFor(goldens[golden])}\n`)
      expect(exitCode).toBe(goldens[golden].exitCode)
    }
  )
})
