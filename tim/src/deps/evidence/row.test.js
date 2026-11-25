import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  evidenceRowVerdict,
  evidenceRowsVerdict,
  loadEvidenceRows,
  parseEvidenceRows
} from './row.js'

const PATTERN = 'govuk-header__link--service-name'

describe('#evidenceRowVerdict', () => {
  test('Should make an applied row with hits left not clean', () => {
    const row = {
      item: 'Remove the header link class',
      pattern: PATTERN,
      hitsBefore: 2,
      hitsAfter: 2,
      outcome: 'applied',
      reason: ''
    }

    expect(evidenceRowVerdict(row)).toEqual({
      clean: false,
      problem: 'The pattern still has 2 hits.'
    })
  })

  test('Should make an applied row with no hits left clean', () => {
    const row = {
      item: 'Remove the header link class',
      pattern: PATTERN,
      hitsBefore: 2,
      hitsAfter: 0,
      outcome: 'applied',
      reason: ''
    }

    expect(evidenceRowVerdict(row)).toEqual({ clean: true, problem: null })
  })

  test('Should make an applied row not yet counted after the change not clean', () => {
    const row = {
      item: 'Remove the header link class',
      pattern: PATTERN,
      hitsBefore: 2,
      hitsAfter: null,
      outcome: 'applied',
      reason: ''
    }

    expect(evidenceRowVerdict(row)).toEqual({
      clean: false,
      problem: 'The pattern has not been counted since the change.'
    })
  })

  test('Should make an applied row with no pattern and no acceptance not clean', () => {
    const row = { item: 'Rename a macro', outcome: 'applied', reason: 'Done' }

    expect(evidenceRowVerdict(row)).toEqual({
      clean: false,
      problem:
        'An applied row needs a pattern to search for, or who accepted it with no code change and when.'
    })
  })

  test('Should make an applied row with no pattern clean when it names who accepted it, when and what', () => {
    const row = {
      item: 'Give every date input item an error state',
      outcome: 'applied',
      reason: 'The red border on the dashboard dates is taken as it comes',
      acceptedBy: 'Sam Farrington',
      acceptedOn: '2026-11-25'
    }

    expect(evidenceRowVerdict(row)).toEqual({ clean: true, problem: null })
  })

  test('Should make an applied row with no pattern not clean when it names who accepted it but not when', () => {
    const row = {
      item: 'Give every date input item an error state',
      outcome: 'applied',
      reason: 'Taken as it comes',
      acceptedBy: 'Sam Farrington'
    }

    expect(evidenceRowVerdict(row).clean).toBe(false)
  })

  test('Should make an accepted applied row with no reason not clean', () => {
    const row = {
      item: 'Give every date input item an error state',
      outcome: 'applied',
      reason: ' ',
      acceptedBy: 'Sam Farrington',
      acceptedOn: '2026-11-25'
    }

    expect(evidenceRowVerdict(row)).toEqual({
      clean: false,
      problem:
        'An applied row a person accepted needs a reason: what they accepted.'
    })
  })

  test('Should make a not-applicable row whose pattern still has no hits clean', () => {
    const row = {
      item: 'Deprecate the service navigation slot',
      pattern: 'govukServiceNavigation',
      hitsBefore: 0,
      hitsAfter: 0,
      outcome: 'not-applicable',
      reason: 'The repo does not use service navigation.'
    }

    expect(evidenceRowVerdict(row)).toEqual({ clean: true, problem: null })
  })

  test('Should make a not-applicable row whose pattern now appears not clean', () => {
    const row = {
      item: 'Deprecate the service navigation slot',
      pattern: 'govukServiceNavigation',
      hitsBefore: 0,
      hitsAfter: 1,
      outcome: 'not-applicable',
      reason: 'The repo does not use service navigation.'
    }

    expect(evidenceRowVerdict(row)).toEqual({
      clean: false,
      problem: 'The pattern now has 1 hit, so the item does apply.'
    })
  })

  test('Should make a not-applicable row with a reason and no pattern clean', () => {
    const row = {
      item: 'Fix focus style in accordion JavaScript',
      outcome: 'not-applicable',
      reason: 'The repo has no accordion.'
    }

    expect(evidenceRowVerdict(row)).toEqual({ clean: true, problem: null })
  })

  test('Should make a not-applicable row with a blank reason not clean', () => {
    const row = {
      item: 'Fix focus style in accordion JavaScript',
      outcome: 'not-applicable',
      reason: '  '
    }

    expect(evidenceRowVerdict(row)).toEqual({
      clean: false,
      problem: 'A not-applicable row needs a reason.'
    })
  })

  test('Should never make a needs-a-person row clean', () => {
    const row = {
      item: 'Change the link colour in the header',
      pattern: PATTERN,
      hitsBefore: 0,
      hitsAfter: 0,
      outcome: 'needs-a-person',
      reason: 'Visual change: check the header against the design.'
    }

    expect(evidenceRowVerdict(row)).toEqual({
      clean: false,
      problem: 'A person needs to decide this item.'
    })
  })
})

describe('#evidenceRowsVerdict', () => {
  const cleanRow = {
    item: 'Internal build changes',
    outcome: 'not-applicable',
    reason: 'Build only.'
  }

  test('Should be all clean when every row is clean', () => {
    expect(evidenceRowsVerdict([cleanRow])).toEqual({
      allClean: true,
      rowCount: 1,
      notCleanCount: 0,
      rows: [
        {
          item: 'Internal build changes',
          outcome: 'not-applicable',
          clean: true,
          problem: null
        }
      ]
    })
  })

  test('Should count the rows that are not clean', () => {
    const needsAPerson = {
      item: 'Header layout changes',
      outcome: 'needs-a-person',
      reason: 'Visual change to every page.'
    }

    const { allClean, notCleanCount } = evidenceRowsVerdict([
      cleanRow,
      needsAPerson
    ])

    expect({ allClean, notCleanCount }).toEqual({
      allClean: false,
      notCleanCount: 1
    })
  })

  test('Should not be all clean with no rows', () => {
    expect(evidenceRowsVerdict([]).allClean).toBe(false)
  })
})

describe('#parseEvidenceRows', () => {
  test('Should refuse an unknown outcome, naming the row', () => {
    const raw = [{ item: 'x', outcome: 'maybe', reason: '' }]

    expect(() => parseEvidenceRows(raw, 'rows.json')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringMatching(/^rows\.json: 0\.outcome /)
      })
    )
  })

  test('Should refuse a row with no reason', () => {
    const raw = [{ item: 'x', outcome: 'applied', pattern: 'y' }]

    expect(() => parseEvidenceRows(raw, 'rows.json')).toThrow(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})

describe('#loadEvidenceRows', () => {
  let folder

  afterEach(() => {
    if (folder) rmSync(folder, { recursive: true, force: true })
    folder = undefined
  })

  test('Should refuse a missing file as not found', () => {
    folder = mkdtempSync(join(tmpdir(), 'tim-evidence-'))

    expect(() => loadEvidenceRows(join(folder, 'rows.json'))).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })

  test('Should refuse a file that is not JSON as a usage error', () => {
    folder = mkdtempSync(join(tmpdir(), 'tim-evidence-'))
    writeFileSync(join(folder, 'rows.json'), 'not json')

    expect(() => loadEvidenceRows(join(folder, 'rows.json'))).toThrow(
      expect.objectContaining({ code: 'USAGE' })
    )
  })

  test('Should read the rows a file holds', () => {
    folder = mkdtempSync(join(tmpdir(), 'tim-evidence-'))
    const rows = [
      {
        item: 'Internal build changes',
        outcome: 'not-applicable',
        reason: 'Build only.'
      }
    ]
    writeFileSync(join(folder, 'rows.json'), JSON.stringify(rows))

    expect(loadEvidenceRows(join(folder, 'rows.json'))).toEqual(rows)
  })
})
