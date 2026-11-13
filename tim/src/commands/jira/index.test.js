import { describe, test, expect, vi, afterEach } from 'vitest'
import { Command } from 'commander'
import { renderTicket, renderComments, register } from './index.js'
import {
  mockJiraForEachTest,
  loadJiraFixture
} from '../../test-support/jira-mock.js'
import { captureProcessOutput } from '../../test-support/process-output.js'

describe('tim jira ticket', () => {
  const jira = mockJiraForEachTest()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderedIssue = loadJiraFixture('issue-rendered-with-links.json')
  const plainIssue = Object.fromEntries(
    Object.entries(renderedIssue).filter(([key]) => key !== 'renderedFields')
  )
  const renderedHtml = renderedIssue.renderedFields.description

  const servesTicketRecordingQuery = (issue) => {
    const sent = { query: null }
    jira()
      .get('/rest/api/2/issue/EUDPA-713')
      .query((query) => {
        sent.query = query
        return true
      })
      .reply(200, issue)
    return sent
  }

  const runTim = async (...args) => {
    const captured = captureProcessOutput()
    const program = new Command().option('--json').exitOverride()
    register(program, { timVersion: '1.0.0' })

    await program.parseAsync(['node', 'tim', ...args])

    return captured
  }

  test('asks Jira for rendered fields with --rendered and returns renderedDescription in --json', async () => {
    const sent = servesTicketRecordingQuery(renderedIssue)

    const { stdout, exitCode } = await runTim(
      'jira',
      'ticket',
      'EUDPA-713',
      '--rendered',
      '--json'
    )

    expect(sent.query).toEqual({ expand: 'renderedFields' })
    expect(JSON.parse(stdout).result.renderedDescription).toBe(renderedHtml)
    expect(exitCode).toBe(0)
  })

  test('shows the rendered HTML description in the text body with --rendered', async () => {
    servesTicketRecordingQuery(renderedIssue)

    const { stdout } = await runTim('jira', 'ticket', 'EUDPA-713', '--rendered')

    expect(stdout.split('\n')[9]).toBe(renderedHtml.split('\n')[0])
  })

  test('sends no expand query and returns no renderedDescription without --rendered', async () => {
    const sent = servesTicketRecordingQuery(plainIssue)

    const { stdout } = await runTim('jira', 'ticket', 'EUDPA-713', '--json')

    expect(sent.query).toEqual({})
    expect(Object.keys(JSON.parse(stdout).result)).not.toContain(
      'renderedDescription'
    )
  })

  test('shows the raw description in the text body without --rendered', async () => {
    servesTicketRecordingQuery(plainIssue)

    const { stdout } = await runTim('jira', 'ticket', 'EUDPA-713')

    expect(stdout.split('\n')[9]).toBe(
      '*As* a trader acting for an organisation,'
    )
  })
})

describe('renderTicket', () => {
  test('formats a ticket with all fields present', () => {
    const text = renderTicket({
      id: 'EUDPA-200',
      summary: 'Build the CLI',
      status: 'In Dev',
      type: 'Story',
      assignee: 'Sam',
      priority: 'High',
      description: 'Body'
    })
    expect(text).toContain('EUDPA-200  Build the CLI')
    expect(text).toContain('Status:    In Dev')
    expect(text).toContain('Assignee:  Sam')
    expect(text).toContain('Priority:  High')
    expect(text).toContain('Body')
  })

  test('handles unassigned and missing fields gracefully', () => {
    const text = renderTicket({
      id: 'EUDPA-1',
      summary: 'x',
      status: null,
      type: null,
      assignee: null,
      priority: null,
      description: ''
    })
    expect(text).toContain('Assignee:  unassigned')
    expect(text).toContain('Status:    ?')
  })

  const linkedTicket = {
    id: 'EUDPA-713',
    summary: 'Own notifications',
    status: 'Done',
    type: 'Story',
    assignee: 'Martyn Nevers',
    priority: 'Medium',
    parent: 'EUDPA-133',
    labels: ['COMMON-CAP-0.2', 'plants'],
    updated: '2026-11-13T15:43:59.072+0000',
    description: '*As* a trader',
    renderedDescription: '<p><b>As</b> a trader</p>',
    subtasks: [
      { key: 'EUDPA-801', status: 'In Dev', summary: 'Hot reload' },
      { key: 'EUDPA-1002', status: 'To Do', summary: 'Docs' }
    ],
    links: [
      {
        id: '432588',
        type: 'Relates',
        direction: 'inward',
        relation: 'relates to',
        otherKey: 'EUDPA-715',
        otherStatus: 'Done',
        otherSummary: 'Plants notifications'
      },
      {
        id: '432589',
        type: 'Blocks',
        direction: 'outward',
        relation: 'blocks',
        otherKey: 'EUDPA-714',
        otherStatus: 'In Dev',
        otherSummary: 'INS dashboard notifications'
      }
    ]
  }

  test('shows the parent, labels, update time, raw description, subtasks and links in aligned columns', () => {
    const text = renderTicket(linkedTicket)

    expect(text).toBe(
      [
        'EUDPA-713  Own notifications',
        'Status:    Done',
        'Type:      Story',
        'Assignee:  Martyn Nevers',
        'Priority:  Medium',
        'Parent:    EUDPA-133',
        'Labels:    COMMON-CAP-0.2, plants',
        'Updated:   2026-11-13T15:43:59.072+0000',
        '',
        '*As* a trader',
        '',
        '=== Subtasks (2) ===',
        'EUDPA-801   In Dev  Hot reload',
        'EUDPA-1002  To Do   Docs',
        '',
        '=== Linked Issues (2) ===',
        'EUDPA-715  relates to  Done    Plants notifications',
        'EUDPA-714  blocks      In Dev  INS dashboard notifications'
      ].join('\n')
    )
  })

  test('shows the rendered HTML description with rendered set', () => {
    const text = renderTicket(linkedTicket, { rendered: true })

    expect(text.split('\n')[9]).toBe('<p><b>As</b> a trader</p>')
  })

  test('says none for a missing parent and no labels, and leaves out empty sections', () => {
    const text = renderTicket({
      ...linkedTicket,
      parent: null,
      labels: [],
      subtasks: [],
      links: []
    })

    expect(text.split('\n').slice(5)).toEqual([
      'Parent:    none',
      'Labels:    none',
      'Updated:   2026-11-13T15:43:59.072+0000',
      '',
      '*As* a trader'
    ])
  })
})

describe('renderComments', () => {
  test('returns "(no comments)" for an empty list', () => {
    expect(renderComments([])).toBe('(no comments)')
  })

  test('formats one block per comment with author and timestamp header', () => {
    const text = renderComments([
      { author: 'Sam', createdAt: '2026-06-08T10:00:00.000Z', body: 'first' },
      { author: 'Pat', createdAt: '2026-06-08T11:00:00.000Z', body: 'second' }
    ])
    expect(text).toContain('--- Sam on 2026-06-08T10:00:00.000Z')
    expect(text).toContain('first')
    expect(text).toContain('--- Pat on 2026-06-08T11:00:00.000Z')
    expect(text).toContain('second')
  })
})
