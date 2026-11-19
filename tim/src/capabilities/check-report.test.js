import { describe, expect, test } from 'vitest'
import {
  checkReportOf,
  renderRowTable,
  renderRuleLines,
  renderUndocumentedStatusLines
} from './check-report.js'

const row = (code, status, name, verdict) => ({
  code,
  status,
  name,
  verdict,
  line: 1
})

describe('#checkReportOf', () => {
  test('Should list the codes breaking each rule in rule then code order', () => {
    const rows = [
      row('CAP-2', '', 'Two', 'name-empty,id-has-status'),
      row('CAP-10', '', 'Ten', 'id-has-status'),
      row('CAP-1', 'COMPLETE', 'One', 'ok')
    ]

    expect(checkReportOf(rows).rules).toEqual([
      { rule: 'id-has-status', codes: ['CAP-10', 'CAP-2'] },
      { rule: 'name-empty', codes: ['CAP-2'] }
    ])
  })

  test('Should count the canonical rows and call the map canonical only when every row is', () => {
    const rows = [
      row('CAP-1', '', 'One', 'ok'),
      row('CAP-2', '', '', 'name-empty')
    ]

    const { total, canonicalCount, canonical } = checkReportOf(rows)

    expect({ total, canonicalCount, canonical }).toEqual({
      total: 2,
      canonicalCount: 1,
      canonical: false
    })
  })

  test('Should not call a map with no rows canonical', () => {
    expect(checkReportOf([]).canonical).toBe(false)
  })

  test('Should list each status outside the documented set, ignoring blank ones', () => {
    const rows = [
      row('CAP-1', 'complete', 'One', 'ok'),
      row('CAP-2', '', 'Two', 'ok'),
      row('CAP-3', 'POST DAY ONE', 'Three', 'ok')
    ]

    expect(checkReportOf(rows).undocumentedStatuses).toEqual([
      { code: 'CAP-1', status: 'complete' }
    ])
  })
})

describe('#renderRowTable', () => {
  test('Should pad each column to its width in bytes and show a blank status as a dash', () => {
    const [, , line] = renderRowTable([row('CAP-1', '', 'Café — menu', 'ok')])

    expect(line).toBe(
      `CAP-1              -              Café — menu${' '.repeat(28)} ok`
    )
  })

  test('Should cut a name over 42 bytes to whole characters within 39 bytes and add dots', () => {
    const name = `${'a'.repeat(38)}— and more`

    const [, , line] = renderRowTable([row('CAP-1', 'COMPLETE', name, 'ok')])

    expect(line).toBe(
      `CAP-1              COMPLETE       ${'a'.repeat(38)}...${' '.repeat(1)} ok`
    )
  })
})

describe('#renderRuleLines', () => {
  test('Should give each rule its count and codes, padded and sorted', () => {
    const lines = renderRuleLines([
      { rule: 'name-empty', codes: ['CAP-2'] },
      { rule: 'id-has-status', codes: ['CAP-10', 'CAP-2'] }
    ])

    expect(lines).toEqual([
      '  id-has-status             2  CAP-10, CAP-2',
      '  name-empty                1  CAP-2'
    ])
  })
})

describe('#renderUndocumentedStatusLines', () => {
  test('Should show the code and the status after two spaces each', () => {
    expect(
      renderUndocumentedStatusLines([{ code: 'CAP-1', status: 'complete' }])
    ).toEqual(['  CAP-1  complete'])
  })
})
