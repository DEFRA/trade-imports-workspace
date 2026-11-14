import { describe, expect, test } from 'vitest'
import {
  advisoriesOf,
  allowlistNotesOf,
  allowlistOf,
  compareAsJq,
  isGhsaId,
  jqText,
  thresholdOf,
  utcDayAfterDays,
  utcDayAfterMonths,
  withAllowlistEntry,
  withAllowlistRecord
} from './audit-rules.js'
import { jqCases } from './__fixtures__/npm-audit-jq-cases.js'
import { readAuditGolden } from './__fixtures__/npm-audit-workspace.js'

const recordedJq = readAuditGolden().jq

const programs = {
  AUDIT_JQ_ADVISORIES: (input) => advisoriesOf(input),
  AUDIT_JQ_ALLOWLIST: (input, args) => allowlistOf(input, args[2]),
  AUDIT_JQ_THRESHOLD: (input) => thresholdOf(input)
}

describe('#jq programs', () => {
  test.each(jqCases.map((jqCase) => [jqCase.name, jqCase]))(
    'Should give what audit-lib.sh gave: %s',
    (name, { program, input, args = [] }) => {
      const recorded = recordedJq.find((row) => row.case === name)

      expect(programs[program](input, args)).toEqual(recorded.output)
    }
  )
})

describe('#utcDayAfterMonths', () => {
  test.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-11-30', 3, '2027-02-28'],
    ['2027-11-30', 3, '2028-02-29'],
    ['2026-11-14', 3, '2027-02-14'],
    ['2026-12-31', 2, '2027-02-28']
  ])(
    'Should give the last day of the month BSD date -v+Nm gives: %s plus %i months is %s',
    (day, months, expected) => {
      expect(utcDayAfterMonths(new Date(`${day}T23:30:00Z`), months)).toBe(
        expected
      )
    }
  )
})

describe('#utcDayAfterDays', () => {
  test('Should count days across a month and a year in UTC', () => {
    expect(utcDayAfterDays(new Date('2026-11-30T23:59:59Z'), 90)).toBe(
      '2027-02-28'
    )
  })
})

describe('#compareAsJq', () => {
  test('Should sort null before booleans, numbers and strings', () => {
    expect(['b', 2, null, true, false, 'a'].sort(compareAsJq)).toEqual([
      null,
      false,
      true,
      2,
      'a',
      'b'
    ])
  })
})

describe('#isGhsaId', () => {
  test.each([
    ['GHSA-c475-qrg2-pj4r', true],
    ['GHSA-C475-QRG2-PJ4R', false],
    ['GHSA-c475-qrg2-pj4', false],
    ['CVE-2024-1', false]
  ])('Should say whether %s is a lower-case GHSA id: %s', (text, expected) => {
    expect(isGhsaId(text)).toBe(expected)
  })
})

describe('#withAllowlistEntry', () => {
  const entry = { 'GHSA-aaaa-aaaa-aaaa': { active: true } }

  test('Should replace every entry for the GHSA, plain or keyed by its lowest key', () => {
    const config = {
      allowlist: [
        'GHSA-aaaa-aaaa-aaaa',
        { 'GHSA-zzzz-zzzz-zzzz': {}, 'GHSA-aaaa-aaaa-aaaa': {} },
        'GHSA-bbbb-bbbb-bbbb'
      ]
    }

    expect(withAllowlistEntry(config, 'GHSA-aaaa-aaaa-aaaa', entry)).toEqual({
      allowlist: [entry, entry, 'GHSA-bbbb-bbbb-bbbb']
    })
  })

  test('Should add the entry at the end when the GHSA has none', () => {
    expect(
      withAllowlistEntry(
        { allowlist: ['GHSA-bbbb-bbbb-bbbb'] },
        'GHSA-aaaa-aaaa-aaaa',
        entry
      )
    ).toEqual({ allowlist: ['GHSA-bbbb-bbbb-bbbb', entry] })
  })
})

describe('#allowlistNotesOf', () => {
  test('Should drop one final full stop from the reason and the parent', () => {
    expect(
      allowlistNotesOf({
        reason: 'Dev only..',
        blockedBy: 'get-uri pins it.',
        owner: 'Sam'
      })
    ).toBe('Dev only.. Fix blocked upstream: get-uri pins it. Owner: Sam')
  })
})

describe('#withAllowlistRecord', () => {
  test('Should keep a prior stage of null on renewal', () => {
    const state = {
      entries: [{ ghsa: 'GHSA-aaaa-aaaa-aaaa', added_at: 'then' }]
    }

    const renewed = withAllowlistRecord(state, {
      ghsa: 'GHSA-aaaa-aaaa-aaaa',
      reason: 'r',
      stamp: 'now',
      stage: '3'
    })

    expect(renewed.entries[0]).toMatchObject({
      added_at: 'then',
      stage: null,
      renewed_at: 'now',
      renewed_stage: 3
    })
  })
})

describe('#jqText', () => {
  test('Should escape DEL as jq does and end with a newline', () => {
    expect(jqText({ notes: 'a\u007fb→' })).toBe(
      '{\n  "notes": "a\\u007fb→"\n}\n'
    )
  })
})
