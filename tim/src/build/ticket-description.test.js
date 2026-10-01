import { describe, test, expect } from 'vitest'
import {
  ticketDescription,
  ticketSummary,
  wikiInline
} from './ticket-description.js'

const ROW = {
  id: 'inc-003',
  title: 'Run the k6 smoke against the INS frontend',
  detail:
    'Operators need a smoke run.\n## Why\n- It catches a dead `/health` route\n- It proves the [stub] answers',
  acceptanceCriteria: [
    '- `npm run smoke` exits 0 against the stack (confluence:65 §3)',
    '* The report names every {scenario}'
  ],
  sources: [
    { source: 'trace:iuu', ref: 'pages/transport-details.json' },
    'ruling: keep it under a minute'
  ]
}

describe('ticketDescription', () => {
  test('lays the row out as Jira wiki markup, never markdown', () => {
    expect(
      ticketDescription({
        workarea: 'shared/ins-performance-testing',
        row: ROW
      })
    ).toBe(
      [
        'h2. Increment',
        '',
        '{{inc-003}} from the {{shared/ins-performance-testing}} backlog: Run the k6 smoke against the INS frontend',
        '',
        'h2. What and why',
        '',
        'Operators need a smoke run.',
        '*Why*',
        '* It catches a dead {{/health}} route',
        '* It proves the \\[stub\\] answers',
        '',
        'h2. Acceptance criteria',
        '',
        '* {{npm run smoke}} exits 0 against the stack (confluence:65 §3)',
        '* The report names every \\{scenario}',
        '',
        'h2. Sources',
        '',
        '* source: {{trace:iuu}}, ref: {{pages/transport-details.json}}',
        '* ruling: keep it under a minute',
        '',
        'h2. Backlog',
        '',
        '{{workareas/shared/ins-performance-testing/backlog.json}}',
        ''
      ].join('\n')
    )
  })

  test('leaves out the sources heading when the row has none', () => {
    const text = ticketDescription({
      workarea: 'shared/x',
      row: { ...ROW, sources: undefined }
    })

    expect(text).not.toContain('h2. Sources')
  })
})

describe('wikiInline', () => {
  test('turns markdown bold into wiki bold', () => {
    expect(wikiInline('this is **important**')).toBe('this is *important*')
  })

  test('escapes braces inside a code span so the monospace survives', () => {
    expect(wikiInline('set `{"a":1}` first')).toBe('set {{\\{"a":1\\}}} first')
  })
})

describe('ticketSummary', () => {
  test('puts the increment id before its title', () => {
    expect(ticketSummary(ROW)).toBe(
      'inc-003 — Run the k6 smoke against the INS frontend'
    )
  })

  test('cuts a long title to Jira’s 255-character limit', () => {
    const summary = ticketSummary({ id: 'inc-003', title: 'word '.repeat(80) })

    expect({ length: summary.length, end: summary.at(-1) }).toEqual({
      length: 255,
      end: '…'
    })
  })
})
