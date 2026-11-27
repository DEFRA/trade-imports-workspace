import { describe, test, expect } from 'vitest'
import { evidenceVerdictText, renderEvidenceTable } from './render.js'
import { evidenceRowsVerdict } from './row.js'

const appliedRow = {
  item: 'Remove the govuk-header__link--service-name class',
  pattern: 'govuk-header__link--service-name',
  hitsBefore: 2,
  hitsAfter: 0,
  outcome: 'applied',
  reason: ''
}

const notApplicableRow = {
  item: 'Deprecate the govukServiceNavigation slot',
  pattern: 'govukServiceNavigation',
  hitsBefore: 0,
  hitsAfter: 0,
  outcome: 'not-applicable',
  reason: 'The repo does not use service navigation.'
}

const noPatternRow = {
  item: 'Internal build changes',
  outcome: 'not-applicable',
  reason: 'Build only.'
}

const needsAPersonRow = {
  item: 'Change the link colour | in the header',
  outcome: 'needs-a-person',
  reason: 'Visual change: check the header against the design.'
}

describe('#renderEvidenceTable', () => {
  test('Should render every row under the three column headings', () => {
    const { markdown } = renderEvidenceTable([appliedRow, noPatternRow])

    expect(markdown).toBe(
      [
        '| Changelog item | Outcome | Evidence |',
        '|---|---|---|',
        '| Remove the govuk-header__link--service-name class | Applied | `govuk-header__link--service-name`: 2 hits before, 0 after. |',
        '| Internal build changes | Not applicable | Build only. |',
        '',
        'Every row is clean.'
      ].join('\n')
    )
  })

  test('Should be all clean when every row is applied or not applicable', () => {
    const rendered = renderEvidenceTable([
      appliedRow,
      notApplicableRow,
      noPatternRow
    ])

    expect({
      allClean: rendered.allClean,
      notCleanCount: rendered.notCleanCount
    }).toEqual({ allClean: true, notCleanCount: 0 })
  })

  test('Should not be all clean when a row needs a person, and count the rows', () => {
    const rendered = renderEvidenceTable([
      appliedRow,
      notApplicableRow,
      noPatternRow,
      needsAPersonRow
    ])

    expect({
      allClean: rendered.allClean,
      summary: rendered.markdown.split('\n').at(-1)
    }).toEqual({
      allClean: false,
      summary: '**1 of 4 rows are not clean.**'
    })
  })

  test('Should escape a pipe in a changelog item', () => {
    const { markdown } = renderEvidenceTable([needsAPersonRow])

    expect(markdown).toContain(
      '| Change the link colour \\| in the header | **Needs a person** | Visual change: check the header against the design. |'
    )
  })

  test('Should show why an applied row with hits left is not clean', () => {
    const { markdown } = renderEvidenceTable([{ ...appliedRow, hitsAfter: 2 }])

    expect(markdown).toContain(
      '| **Applied** | `govuk-header__link--service-name`: 2 hits before, 2 after.<br>**Not clean:** The pattern still has 2 hits. |'
    )
  })

  test('Should show who accepted an applied row with no pattern, and when, before what they accepted', () => {
    const rendered = renderEvidenceTable([
      {
        item: 'Give every date input item an error state',
        outcome: 'applied',
        reason: 'The red border is taken as it comes.',
        acceptedBy: 'Sam Farrington',
        acceptedOn: '2026-11-25'
      }
    ])

    expect({
      allClean: rendered.allClean,
      line: rendered.markdown.split('\n')[2]
    }).toEqual({
      allClean: true,
      line: '| Give every date input item an error state | Applied | Accepted by Sam Farrington on 2026-11-25, with no code change.<br>The red border is taken as it comes. |'
    })
  })

  test('Should show an unchecked row as not counted and not clean', () => {
    const rendered = renderEvidenceTable([{ ...appliedRow, hitsAfter: null }])

    expect({
      allClean: rendered.allClean,
      line: rendered.markdown.split('\n')[2]
    }).toEqual({
      allClean: false,
      line: '| Remove the govuk-header__link--service-name class | **Applied** | `govuk-header__link--service-name`: 2 hits before, not counted after.<br>**Not clean:** The pattern has not been counted since the change. |'
    })
  })

  test('Should put a pattern holding a backtick in a double-backtick span', () => {
    const { markdown } = renderEvidenceTable([
      { ...appliedRow, pattern: 'a`b' }
    ])

    expect(markdown).toContain('`` a`b ``: 2 hits before, 0 after.')
  })

  test('Should put a multi-line reason on one line', () => {
    const { markdown } = renderEvidenceTable([
      { ...noPatternRow, reason: 'Build only.\nNo source change.' }
    ])

    expect(markdown).toContain('| Build only. No source change. |')
  })

  test('Should not be clean with no rows, and say the changelog needs reading', () => {
    expect(renderEvidenceTable([])).toEqual({
      markdown:
        '**No changelog evidence is recorded, so a person needs to read the changelog.**',
      allClean: false,
      rowCount: 0,
      notCleanCount: 0
    })
  })
})

describe('#renderEvidenceTable hit counts', () => {
  test('Should say one hit, not one hits, before the change', () => {
    const { markdown } = renderEvidenceTable([{ ...appliedRow, hitsBefore: 1 }])

    expect(markdown).toContain(
      '`govuk-header__link--service-name`: 1 hit before, 0 after.'
    )
  })
})

describe('#evidenceVerdictText', () => {
  test('Should say every row is clean', () => {
    expect(
      evidenceVerdictText(
        evidenceRowsVerdict([appliedRow, noPatternRow]),
        'for eslint'
      )
    ).toBe('Every evidence row for eslint is clean (2 rows).')
  })

  test('Should list each row that is not clean with its problem', () => {
    expect(
      evidenceVerdictText(
        evidenceRowsVerdict([noPatternRow, needsAPersonRow]),
        'for eslint'
      )
    ).toBe(
      [
        '1 of 2 evidence rows for eslint are not clean:',
        '- Change the link colour | in the header: A person needs to decide this item.'
      ].join('\n')
    )
  })

  test('Should say no rows needs a person to read the changelog', () => {
    expect(evidenceVerdictText(evidenceRowsVerdict([]), 'for eslint')).toBe(
      'No evidence rows are recorded for eslint, so a person needs to read the changelog.'
    )
  })
})
