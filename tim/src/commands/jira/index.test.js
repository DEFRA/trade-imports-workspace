import { describe, test, expect } from 'vitest'
import { renderTicket, renderComments } from './index.js'

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
