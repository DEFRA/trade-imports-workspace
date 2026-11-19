import { describe, expect, test } from 'vitest'
import {
  commentsMarkdown,
  confluenceLinksIn,
  refinementFieldsOf,
  reviewStub
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
