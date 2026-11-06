import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import {
  runUpdate,
  renderUpdateResult,
  changedFields,
  parseUpdateOptions
} from './update.js'

const ISSUE_PATH = '/rest/api/2/issue/EUDPA-200'

const TICKET = {
  id: 'EUDPA-200',
  summary: 'The old title',
  status: 'To Do',
  type: 'Story',
  assignee: null,
  priority: 'Medium',
  description: 'The old description'
}

const jira = mockJiraForEachTest()

const ticketReads = (...tickets) =>
  tickets.forEach((ticket) =>
    jira()
      .get(ISSUE_PATH)
      .reply(200, {
        key: ticket.id,
        fields: {
          summary: ticket.summary,
          status: { name: ticket.status },
          issuetype: { name: ticket.type },
          priority: { name: ticket.priority },
          description: ticket.description
        }
      })
  )

const acceptsUpdate = () => {
  const sent = { body: null }
  jira()
    .put(ISSUE_PATH, (body) => {
      sent.body = body
      return true
    })
    .reply(204)
  return sent
}

const writtenToFile = async (text) => {
  const dir = await mkdtemp(join(tmpdir(), 'tim-jira-update-'))
  const path = join(dir, 'description.txt')
  await writeFile(path, text, 'utf8')
  return path
}

describe('changedFields', () => {
  test('keeps only the fields whose value differs', () => {
    expect(
      changedFields(
        { summary: 'Same', description: 'Old' },
        { summary: 'Same', description: 'New' }
      )
    ).toEqual({ description: 'New' })
  })

  test('ignores a field that was not given', () => {
    expect(
      changedFields({ summary: 'Same', description: 'Old' }, { summary: 'New' })
    ).toEqual({ summary: 'New' })
  })

  test('compares the description against the trimmed stored value', () => {
    expect(
      changedFields(
        { summary: 'Same', description: '  Old  \n' },
        { description: 'Old' }
      )
    ).toEqual({})
  })
})

describe('runUpdate', () => {
  test('a dry run reads the ticket, reports the changes and sends no write', async () => {
    ticketReads(TICKET)

    const result = await runUpdate({
      key: 'EUDPA-200',
      summary: 'A clearer title',
      confirm: false
    })

    expect(result).toEqual({
      mode: 'dry-run',
      key: 'EUDPA-200',
      fields: { summary: 'A clearer title' },
      before: TICKET
    })
  })

  test('--confirm writes only the changed fields and reads the ticket back', async () => {
    const changed = {
      ...TICKET,
      summary: 'A clearer title',
      description: 'A clearer description'
    }
    ticketReads(TICKET, changed)
    const sent = acceptsUpdate()

    const result = await runUpdate({
      key: 'EUDPA-200',
      summary: 'A clearer title',
      description: 'A clearer description',
      confirm: true
    })

    expect({ result, sent: sent.body }).toEqual({
      result: {
        mode: 'updated',
        key: 'EUDPA-200',
        url: 'https://example.atlassian.net/browse/EUDPA-200',
        fields: {
          summary: 'A clearer title',
          description: 'A clearer description'
        },
        before: TICKET,
        after: changed
      },
      sent: {
        fields: {
          summary: 'A clearer title',
          description: 'A clearer description'
        }
      }
    })
  })

  test('reads the description from a file', async () => {
    const path = await writtenToFile('  From a file\n')
    ticketReads(TICKET)

    const result = await runUpdate({
      key: 'EUDPA-200',
      descriptionFile: path,
      confirm: false
    })

    expect(result.fields).toEqual({ description: 'From a file' })
  })

  test('leaves a ticket that already holds those values alone, even with --confirm', async () => {
    ticketReads(TICKET)

    const result = await runUpdate({
      key: 'EUDPA-200',
      summary: TICKET.summary,
      description: TICKET.description,
      confirm: true
    })

    expect(result).toEqual({
      mode: 'unchanged',
      key: 'EUDPA-200',
      fields: {},
      before: TICKET
    })
  })

  test('fails when Jira accepts the update but the read-back still shows the old value', async () => {
    ticketReads(TICKET, TICKET)
    acceptsUpdate()

    await expect(
      runUpdate({ key: 'EUDPA-200', summary: 'A clearer title', confirm: true })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the update, but EUDPA-200 still shows the old summary. Check the ticket in Jira.'
    })
  })

  test('refuses a key that is not a Jira key', async () => {
    await expect(
      runUpdate({ key: 'eudpa 200', summary: 'A title', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a Jira ticket key, for example EUDPA-200.'
    })
  })

  test('refuses an empty summary', async () => {
    await expect(
      runUpdate({ key: 'EUDPA-200', summary: '   ', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'The summary is empty. Give some text.'
    })
  })

  test('refuses an empty description', async () => {
    await expect(
      runUpdate({ key: 'EUDPA-200', description: '\n\n', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'The description is empty. Give some text.'
    })
  })

  test('names the file it cannot read', async () => {
    await expect(
      runUpdate({
        key: 'EUDPA-200',
        descriptionFile: '/no/such/description.txt',
        confirm: false
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringContaining("Can't read /no/such/description.txt")
    })
  })
})

describe('parseUpdateOptions', () => {
  test('refuses a call that changes nothing', () => {
    expect(() => parseUpdateOptions({ confirm: false })).toThrowError(
      'Give something to change: --summary, --description or --description-file.'
    )
  })

  test('refuses both description sources at once', () => {
    expect(() =>
      parseUpdateOptions({ description: 'Text', descriptionFile: 'file.txt' })
    ).toThrowError(
      'Give the description with --description or --description-file, not both.'
    )
  })

  test('defaults confirm to a dry run', () => {
    expect(parseUpdateOptions({ summary: 'A title' })).toEqual({
      summary: 'A title',
      confirm: false
    })
  })
})

describe('renderUpdateResult', () => {
  test('renders a dry run with each new value', () => {
    expect(
      renderUpdateResult({
        mode: 'dry-run',
        key: 'EUDPA-200',
        fields: { summary: 'A clearer title' },
        before: TICKET
      })
    ).toBe(
      [
        'Would change the summary on EUDPA-200:',
        '',
        'summary:',
        'A clearer title',
        '',
        'This is a dry run. No request has been sent. Add --confirm to write it for real.'
      ].join('\n')
    )
  })

  test('renders an update with the fields it changed and the ticket link', () => {
    expect(
      renderUpdateResult({
        mode: 'updated',
        key: 'EUDPA-200',
        url: 'https://example.atlassian.net/browse/EUDPA-200',
        fields: { summary: 'A clearer title', description: 'New' },
        before: TICKET,
        after: TICKET
      })
    ).toBe(
      'Changed the summary and description on EUDPA-200. Checked on Jira. https://example.atlassian.net/browse/EUDPA-200'
    )
  })

  test('says nothing changed for a ticket that already holds those values', () => {
    expect(
      renderUpdateResult({
        mode: 'unchanged',
        key: 'EUDPA-200',
        fields: {},
        before: TICKET
      })
    ).toBe('EUDPA-200 already holds those values. Nothing changed.')
  })
})

describe('tim jira update (spawn)', () => {
  test('emits an AUTH envelope when no Jira credentials are set', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'jira',
        'update',
        'EUDPA-200',
        '--summary',
        'A clearer title',
        '--json'
      ],
      {
        reject: false,
        env: {
          ...process.env,
          JIRA_USER: '',
          JIRA_TOKEN: '',
          JIRA_BASE_URL: ''
        }
      }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 1,
      payload: { ok: false, errors: [{ code: 'AUTH' }] }
    })
  })

  test('shows the dry-run and --confirm forms in --help', async () => {
    const { stdout } = await execa('node', [
      TIM_CLI_PATH,
      'jira',
      'update',
      '--help'
    ])

    expect(stdout).toContain(
      [
        'Examples:',
        '  tim jira update EUDPA-200 --summary "A clearer title" --json',
        '  tim jira update EUDPA-200 --description-file description.txt --confirm --json'
      ].join('\n')
    )
  })
})
