import { describe, expect, test } from 'vitest'
import {
  commentsMarkdown,
  confluenceLinksIn,
  refinementFieldsOf,
  reviewStub,
  ticketMarkdown
} from './ticket-markdown.js'

describe('#reviewStub', () => {
  const template =
    '# Review: EUDPA-XXXXX\n**Summary:** [Ticket summary]\n**Date:** [Date]\n**Type:** [Story/Bug/Task] [Priority]\n'

  test('Should put an ampersand, a backslash and a dollar in the summary in literally', () => {
    const stub = reviewStub(template, {
      key: 'EUDPA-7',
      summary: 'Tom & Jerry \\n $& [Date]',
      today: '2026-11-13',
      type: 'Bug',
      priority: 'Major'
    })

    expect(stub).toBe(
      '# Review: EUDPA-7\n**Summary:** Tom & Jerry \\n $& [Date]\n**Date:** 2026-11-13\n**Type:** Bug Major\n'
    )
  })

  test('Should end a template with no final newline with one', () => {
    expect(
      reviewStub('[Priority]', {
        key: 'K',
        summary: 'S',
        today: 'D',
        type: 'T',
        priority: 'P'
      })
    ).toBe('P\n')
  })
})

describe('#confluenceLinksIn', () => {
  test('Should match the base literally, so a dot in it matches only a dot', () => {
    const description =
      'https://example.atlassian.net/wiki/spaces/A/pages/1 https://exampleXatlassian.net/wiki/spaces/B/pages/2'

    expect(
      confluenceLinksIn(description, 'https://example.atlassian.net')
    ).toEqual(['https://example.atlassian.net/wiki/spaces/A/pages/1'])
  })
})

describe('#commentsMarkdown', () => {
  test('Should give nothing for no comments', () => {
    expect(commentsMarkdown([])).toBe('')
  })

  test('Should show null for a comment with no author', () => {
    expect(
      commentsMarkdown([
        { author: null, createdAt: '2025-01-02T03:04:05.000+0000', body: 'Hi' }
      ])
    ).toBe('### null (2025-01-02)\nHi')
  })
})

describe('#refinementFieldsOf', () => {
  test('Should keep an empty rendered description empty rather than say there is none', () => {
    expect(
      refinementFieldsOf({ id: 'K', summary: 'S', renderedDescription: '' })
        .description
    ).toBe('')
  })
})

describe('#ticketMarkdown', () => {
  const fields = refinementFieldsOf({
    id: 'EUDPA-7',
    summary: 'Tidy the logs',
    type: 'Task',
    status: 'To Do',
    renderedDescription: '<p>Quieter logs.</p>'
  })
  const base = { fields, commentCount: 0, comments: '', confluence: '' }

  test('Should give the metadata, description and empty comment and Confluence sections when given nothing more', () => {
    expect(ticketMarkdown(base)).toBe(
      [
        '# EUDPA-7: Tidy the logs',
        '',
        '## Metadata',
        '- **Type:** Task',
        '- **Status:** To Do',
        '- **Priority:** None',
        '- **Labels:** ',
        '- **Parent:** None',
        '- **Assignee:** Unassigned',
        '',
        '## Description',
        '',
        '<p>Quieter logs.</p>',
        '',
        '## Acceptance Criteria',
        '',
        '<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->',
        '',
        '## Comments (0)',
        '',
        '',
        '',
        '## Confluence References',
        '',
        '\n'
      ].join('\n')
    )
  })

  test('Should add the parent, links, subtasks and attachments, each in its own section', () => {
    const markdown = ticketMarkdown({
      ...base,
      parent: {
        key: 'EUDPA-1',
        summary: 'The epic',
        status: 'In Progress',
        description: '<p>Epic words.</p>\n'
      },
      links: [
        {
          relation: 'is blocked by',
          otherKey: 'EUDPA-2',
          otherStatus: 'Done',
          otherSummary: 'The blocker'
        }
      ],
      subtasks: [{ key: 'EUDPA-8', status: 'To Do', summary: 'The subtask' }],
      attachments: [
        {
          filename: 'mock.png',
          mimeType: 'image/png',
          savedAs: 'workareas/shared/x/sources/attachments/mock.png'
        },
        {
          filename: 'notes.docx',
          mimeType: 'application/msword',
          notSavedBecause: 'only images and PDFs are saved'
        }
      ]
    })

    expect(markdown).toContain(
      '## Parent\n\n### EUDPA-1: The epic (In Progress)\n\n<p>Epic words.</p>\n\n## Linked tickets\n\n- is blocked by EUDPA-2 (Done): The blocker\n\n## Subtasks\n\n- EUDPA-8 (To Do): The subtask\n\n## Acceptance Criteria'
    )
    expect(
      markdown.endsWith(
        '## Attachments\n\n- mock.png (image/png): saved as workareas/shared/x/sources/attachments/mock.png\n- notes.docx (application/msword): not saved, only images and PDFs are saved\n'
      )
    ).toBe(true)
  })

  test('Should leave out a section whose list is empty', () => {
    const markdown = ticketMarkdown({
      ...base,
      links: [],
      subtasks: [],
      attachments: []
    })

    expect(markdown).toBe(ticketMarkdown(base))
  })
})
