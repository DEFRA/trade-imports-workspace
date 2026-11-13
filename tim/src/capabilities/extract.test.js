import { describe, expect, test } from 'vitest'
import {
  nameOfCell,
  parseCapabilityMap,
  renderList,
  renderRefusal,
  renderTsv
} from './extract.js'

const table = (...rows) =>
  ['| Code | Status | Capability |', '|---|---|---|', ...rows].join('\n')

describe('#parseCapabilityMap', () => {
  test('Should read the code, status, name and line of a canonical row', () => {
    const map = table('| CAP-0.4 | STATUS: NOT STARTED | **Commodity** |')

    const parsed = parseCapabilityMap(map)

    expect(parsed).toEqual({
      rows: [
        {
          code: 'CAP-0.4',
          status: 'NOT STARTED',
          name: 'Commodity',
          verdict: 'ok',
          line: 3
        }
      ],
      violations: []
    })
  })

  test('Should anchor only on a line that starts with a pipe and a capability code', () => {
    const map = [
      'Prose about CAP-0.1 is not a row.',
      '| CAP-0.2 | STATUS: COMPLETE | **No-break space before the code** |',
      '|\tCAP-0.3 | STATUS: COMPLETE | **Tab before the code** |'
    ].join('\n')

    const parsed = parseCapabilityMap(map)

    expect(parsed.rows.map(({ code }) => code)).toEqual(['CAP-0.3'])
  })

  test('Should keep a no-break space, which is not whitespace to the parser', () => {
    const map = table('| CAP-1.8 | STATUS: COMPLETE | **Name** |')

    const parsed = parseCapabilityMap(map)

    expect(parsed.rows[0]).toEqual({
      code: 'CAP-1.8',
      status: ' COMPLETE',
      name: 'Name',
      verdict: 'id-not-clean',
      line: 3
    })
  })

  test('Should take the code alone from an ID cell that runs into the status', () => {
    const map = table('| CAP-01.1STATUS: NOT STARTED | | **Name** |')

    const parsed = parseCapabilityMap(map)

    expect(parsed.violations).toEqual([
      {
        line: 3,
        code: 'CAP-01.1',
        rule: 'id-has-status',
        detail: 'CAP-01.1STATUS: NOT STARTED'
      }
    ])
  })

  test('Should name every rule a row breaks, in rule order', () => {
    const map = table('| CORE-CAP-1.1 EXTERNAL STATUS: X | **Name** | |')

    const parsed = parseCapabilityMap(map)

    expect(parsed.rows[0].verdict).toBe(
      'id-has-status,id-has-external,status-column-missing,name-empty'
    )
  })

  test('Should name the status and external labels in an ID cell whatever their case', () => {
    const map = table(
      '| CAP-4.1 status: x | | **Name** |',
      '| CAP-4.2 External | | **Name** |'
    )

    const parsed = parseCapabilityMap(map)

    expect(parsed.rows.map(({ verdict }) => verdict)).toEqual([
      'id-has-status',
      'id-has-external'
    ])
  })

  test('Should refuse a status split across lines', () => {
    const map = table('| CAP-2.6 | STATUS: NOT\nSTARTED | **Name** |')

    const parsed = parseCapabilityMap(map)

    expect(parsed.rows[0].verdict).toBe('status-cell-invalid')
  })

  test('Should report a row with fewer than three cells as a violation but not a row', () => {
    const map = table('| CAP-9.9 | STATUS: COMPLETE')

    const parsed = parseCapabilityMap(map)

    expect(parsed).toEqual({
      rows: [],
      violations: [
        {
          line: 3,
          code: '?',
          rule: 'row-truncated',
          detail: 'row has fewer than three cells'
        }
      ]
    })
  })
})

describe('#nameOfCell', () => {
  test('Should join every bold run and drop the space before punctuation', () => {
    const name = nameOfCell(' **Documents ,** **certificates\n;** notes ')

    expect(name).toBe('Documents, certificates;')
  })

  test('Should use the whole cell when it has no bold run', () => {
    const name = nameOfCell('  Plain   name  ')

    expect(name).toBe('Plain name')
  })
})

describe('#renderList', () => {
  test('Should print the status in brackets only when there is one', () => {
    const rows = [
      { code: 'COMMON-CAP-00.1', status: '', name: 'Sign in' },
      { code: 'CAP-0.4', status: 'COMPLETE', name: 'Commodity' }
    ]

    const text = renderList({ rows })

    expect(text).toBe(
      'COMMON-CAP-00.1 — Sign in\nCAP-0.4 — Commodity [COMPLETE]'
    )
  })

  test('Should print nothing for a map with no rows', () => {
    expect(renderList({ rows: [] })).toBeNull()
  })
})

describe('#renderTsv', () => {
  test('Should replace a tab or newline inside a field with a space', () => {
    const rows = [
      {
        code: 'CAP-1.3',
        status: 'IN\tPROGRESS',
        name: 'Two\nlines',
        verdict: 'ok',
        line: 9
      }
    ]

    const text = renderTsv({ rows })

    expect(text).toBe('CAP-1.3\tIN PROGRESS\tTwo lines\tok\t9')
  })
})

describe('#renderRefusal', () => {
  test('Should show the ID cell only for an ID or missing-status-column rule', () => {
    const parsed = {
      rows: [{}, {}],
      violations: [
        { line: 4, code: 'CAP-1.1', rule: 'name-empty', detail: 'CAP-1.1' },
        {
          line: 12345,
          code: 'CAP-1.2',
          rule: 'name-empty,status-column-missing',
          detail: 'CAP-1.2'
        }
      ]
    }

    const report = renderRefusal(parsed)

    expect(report).toBe(
      [
        'Capability map is not canonical - refusing to emit a partial list.',
        '',
        '  line 4     CAP-1.1            name-empty',
        '  line 12345 CAP-1.2            name-empty,status-column-missing',
        '                           ID cell reads: CAP-1.2',
        '',
        '2 of 2 rows violate the canonical shape.',
        'Run tools/ticket-creator/check-capabilities.sh for the full picture.'
      ].join('\n')
    )
  })
})
