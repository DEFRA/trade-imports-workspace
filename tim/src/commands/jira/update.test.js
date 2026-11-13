import { describe, test, expect } from 'vitest'
import { execa } from 'execa'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  loadJiraFixture,
  mockJiraForEachTest
} from '../../test-support/jira-mock.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import {
  runUpdate,
  renderUpdateResult,
  changedFields,
  jiraFieldsOf,
  parseUpdateOptions
} from './update.js'

const bashPayloads = loadJiraFixture('update-bash-payloads.json')

const ISSUE_PATH = '/rest/api/2/issue/EUDPA-200'

const TICKET = {
  id: 'EUDPA-200',
  summary: 'The old title',
  status: 'To Do',
  type: 'Story',
  assignee: null,
  priority: 'Medium',
  parent: null,
  labels: [],
  updated: null,
  description: 'The old description',
  subtasks: [],
  links: []
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
          priority: ticket.priority ? { name: ticket.priority } : null,
          parent: ticket.parent ? { key: ticket.parent } : null,
          labels: ticket.labels,
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

const BASH_BEFORE = {
  ...TICKET,
  parent: 'EUDPA-100',
  labels: ['existing-b', 'existing-a']
}

const ticketAfterWrite = (before, sentFields) => ({
  ...before,
  ...sentFields,
  ...(sentFields.priority ? { priority: sentFields.priority.name } : {}),
  ...('parent' in sentFields ? { parent: sentFields.parent?.key ?? null } : {})
})

describe('runUpdate sends the recorded Jira payload for each option', () => {
  test.each([
    ['summary', { summary: 'New summary' }],
    ['description', { description: 'New description' }],
    ['priority', { priority: 'High' }],
    ['parent', { parent: 'EUDPA-215' }],
    ['parentNone', { parent: 'none' }],
    ['labels', { labels: 'alpha,beta' }],
    ['addLabel', { addLabel: ['urgent', 'existing-b'] }],
    ['labelsAndAddLabel', { labels: 'alpha', addLabel: ['urgent'] }]
  ])('%s', async (bashCase, options) => {
    const golden = bashPayloads[bashCase].put
    ticketReads(BASH_BEFORE, ticketAfterWrite(BASH_BEFORE, golden.fields))
    const sent = acceptsUpdate()

    await runUpdate({ key: 'EUDPA-200', ...options, confirm: true })

    expect(sent.body).toEqual(golden)
  })
})

describe('runUpdate with priority, parent and labels', () => {
  test('a dry run reports the merged labels and sends no write', async () => {
    ticketReads(BASH_BEFORE)

    const result = await runUpdate({
      key: 'EUDPA-200',
      addLabel: ['urgent'],
      confirm: false
    })

    expect(result).toEqual({
      mode: 'dry-run',
      key: 'EUDPA-200',
      fields: { labels: ['existing-a', 'existing-b', 'urgent'] },
      before: BASH_BEFORE
    })
  })

  test('leaves labels that differ only in order alone', async () => {
    ticketReads(BASH_BEFORE)

    const result = await runUpdate({
      key: 'EUDPA-200',
      labels: 'existing-a,existing-b',
      confirm: true
    })

    expect(result.mode).toBe('unchanged')
  })

  test('leaves a ticket with no parent alone when asked to take the parent away', async () => {
    ticketReads(TICKET)

    const result = await runUpdate({
      key: 'EUDPA-200',
      parent: 'none',
      confirm: true
    })

    expect(result.mode).toBe('unchanged')
  })

  test('fails when the read-back still shows the old parent', async () => {
    ticketReads(BASH_BEFORE, BASH_BEFORE)
    acceptsUpdate()

    await expect(
      runUpdate({ key: 'EUDPA-200', parent: 'EUDPA-215', confirm: true })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the update, but EUDPA-200 still shows the old parent. Check the ticket in Jira.'
    })
  })

  test('refuses an empty list of labels', async () => {
    await expect(
      runUpdate({ key: 'EUDPA-200', labels: '', confirm: false })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'The list of labels is empty. Give some text.'
    })
  })
})

describe('jiraFieldsOf', () => {
  test('sends a priority by name, a parent by key and no parent as null', () => {
    expect([
      jiraFieldsOf({ priority: 'High', labels: ['a'] }),
      jiraFieldsOf({ parent: 'EUDPA-215' }),
      jiraFieldsOf({ parent: null })
    ]).toEqual([
      { priority: { name: 'High' }, labels: ['a'] },
      { parent: { key: 'EUDPA-215' } },
      { parent: null }
    ])
  })
})

describe('parseUpdateOptions', () => {
  test('refuses a priority Jira does not have', () => {
    expect(() => parseUpdateOptions({ priority: 'Urgent' })).toThrowError(
      'Give a priority of Lowest, Low, Medium, High or Highest.'
    )
  })

  test('refuses a parent that is neither a key nor none', () => {
    expect(() => parseUpdateOptions({ parent: 'eudpa-1' })).toThrowError(
      'Give the parent as a Jira ticket key, for example EUDPA-215, or none to take the parent away.'
    )
  })

  test('accepts --add-label on its own', () => {
    expect(parseUpdateOptions({ addLabel: ['urgent'] })).toEqual({
      addLabel: ['urgent'],
      confirm: false
    })
  })

  test('refuses a call that changes nothing', () => {
    expect(() => parseUpdateOptions({ confirm: false })).toThrowError(
      'Give something to change: --summary, --description, --description-file, --priority, --parent, --labels or --add-label.'
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

  test('renders a dry run that takes the parent away and sets labels', () => {
    expect(
      renderUpdateResult({
        mode: 'dry-run',
        key: 'EUDPA-200',
        fields: { parent: null, labels: ['alpha', 'beta'] },
        before: BASH_BEFORE
      })
    ).toBe(
      [
        'Would change the parent and labels on EUDPA-200:',
        '',
        'parent:',
        'none',
        '',
        'labels:',
        'alpha, beta',
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

  test('emits a USAGE envelope for a priority Jira does not have', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'jira',
        'update',
        'EUDPA-200',
        '--priority',
        'Urgent',
        '--json'
      ],
      { reject: false }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 2,
      payload: {
        ok: false,
        errors: [
          {
            code: 'USAGE',
            message: 'Give a priority of Lowest, Low, Medium, High or Highest.'
          }
        ]
      }
    })
  })

  test('gets past option checks to the Jira sign-in with only repeated --add-label', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [
        TIM_CLI_PATH,
        'jira',
        'update',
        'EUDPA-200',
        '--add-label',
        'urgent',
        '--add-label',
        'triage',
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
