import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { recordEvidenceRow, recountEvidenceRows } from './record.js'
import {
  OLD_HEADER_CLASS,
  createHeaderEvidenceWorkspace,
  editEvidenceRepo,
  layoutUsing
} from '../../test-support/deps-workspace.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const headerRepo = async () => {
  const workspace = await createHeaderEvidenceWorkspace()
  root = workspace.root
  return workspace.repoPath
}

describe('#recordEvidenceRow', () => {
  test('Should record the hits before for an applied row', async () => {
    const repoPath = await headerRepo()

    const row = await recordEvidenceRow({
      repoPath,
      item: 'Remove the header link class',
      outcome: 'applied',
      pattern: OLD_HEADER_CLASS
    })

    expect(row).toEqual({
      item: 'Remove the header link class',
      pattern: OLD_HEADER_CLASS,
      hitsBefore: 2,
      hitsAfter: null,
      outcome: 'applied',
      reason: ''
    })
  })

  test('Should record 0 hits for a not-applicable row whose pattern is absent', async () => {
    const repoPath = await headerRepo()

    const row = await recordEvidenceRow({
      repoPath,
      item: 'Deprecate the service navigation slot',
      outcome: 'not-applicable',
      pattern: 'govukServiceNavigation',
      reason: 'The repo does not use service navigation.'
    })

    expect(row.hitsBefore).toBe(0)
  })

  test('Should record no hits for a not-applicable row with no pattern', async () => {
    const repoPath = await headerRepo()

    const row = await recordEvidenceRow({
      repoPath,
      item: 'Fix focus style in accordion JavaScript',
      outcome: 'not-applicable',
      reason: 'The repo has no accordion.'
    })

    expect({ pattern: row.pattern, hitsBefore: row.hitsBefore }).toEqual({
      pattern: null,
      hitsBefore: null
    })
  })

  test('Should refuse an applied row with no pattern', async () => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({ repoPath, item: 'x', outcome: 'applied' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'An applied row needs a pattern: the old form the change removes. For a change a person accepted with no code change, give who accepted it instead.'
    })
  })

  test('Should keep hits counted before the change instead of counting the pattern now', async () => {
    const repoPath = await headerRepo()

    const row = await recordEvidenceRow({
      repoPath,
      item: 'x',
      outcome: 'applied',
      pattern: 'govukServiceNavigation',
      countedBefore: 3
    })

    expect(row.hitsBefore).toBe(3)
  })

  test('Should record who accepted an applied row with no pattern, and when', async () => {
    const repoPath = await headerRepo()

    const row = await recordEvidenceRow({
      repoPath,
      item: 'x',
      outcome: 'applied',
      reason: 'Taken as it comes.',
      acceptedBy: 'Sam Farrington',
      acceptedOn: '2026-11-25'
    })

    expect(row).toEqual({
      item: 'x',
      pattern: null,
      hitsBefore: null,
      hitsAfter: null,
      outcome: 'applied',
      reason: 'Taken as it comes.',
      acceptedBy: 'Sam Farrington',
      acceptedOn: '2026-11-25'
    })
  })

  test.each([
    [
      'with a pattern',
      { outcome: 'applied', pattern: 'govukHeader', reason: 'Taken.' },
      'An applied row a person accepted has no pattern: give --accepted-by or --pattern, not both.'
    ],
    [
      'on a not-applicable row',
      { outcome: 'not-applicable', reason: 'Taken.' },
      'Only an applied row can name who accepted it. Leave out --accepted-by.'
    ],
    [
      'with no reason',
      { outcome: 'applied' },
      'An applied row Sam Farrington accepted needs a reason: what they accepted.'
    ]
  ])('Should refuse an acceptance %s', async (_name, fields, message) => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({
        repoPath,
        item: 'x',
        acceptedBy: 'Sam Farrington',
        acceptedOn: '2026-11-25',
        ...fields
      })
    ).rejects.toMatchObject({ code: 'USAGE', message })
  })

  test('Should refuse an acceptance with no date', async () => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({
        repoPath,
        item: 'x',
        outcome: 'applied',
        reason: 'Taken.',
        acceptedBy: 'Sam Farrington'
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Say when the person accepted it.'
    })
  })

  test('Should refuse an applied row whose pattern the repo does not contain', async () => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({
        repoPath,
        item: 'x',
        outcome: 'applied',
        pattern: 'govukServiceNavigation'
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'The pattern "govukServiceNavigation" has no hits, so there is nothing to apply. Record the item as not-applicable.'
    })
  })

  test('Should refuse a not-applicable row whose pattern the repo contains', async () => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({
        repoPath,
        item: 'x',
        outcome: 'not-applicable',
        pattern: 'govukHeader',
        reason: 'Not used.'
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'The pattern "govukHeader" has 1 hit. Record the item as applied or needs-a-person.'
    })
  })

  test('Should refuse a needs-a-person row with no reason', async () => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({ repoPath, item: 'x', outcome: 'needs-a-person' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'A needs-a-person row needs a reason: what the person has to decide.'
    })
  })

  test('Should refuse a not-applicable row with no reason', async () => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({ repoPath, item: 'x', outcome: 'not-applicable' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'A not-applicable row needs a reason: why the repo is not affected.'
    })
  })

  test('Should refuse an unknown outcome', async () => {
    const repoPath = await headerRepo()

    await expect(
      recordEvidenceRow({ repoPath, item: 'x', outcome: 'maybe', reason: 'y' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'The outcome must be one of applied, not-applicable, needs-a-person. You gave "maybe".'
    })
  })
})

describe('#recountEvidenceRows', () => {
  const recordedRows = (repoPath) =>
    Promise.all([
      recordEvidenceRow({
        repoPath,
        item: 'Remove the header link class',
        outcome: 'applied',
        pattern: OLD_HEADER_CLASS
      }),
      recordEvidenceRow({
        repoPath,
        item: 'Fix focus style in accordion JavaScript',
        outcome: 'not-applicable',
        reason: 'The repo has no accordion.'
      })
    ])

  test('Should count each pattern again as hits after', async () => {
    const repoPath = await headerRepo()
    const rows = await recordedRows(repoPath)

    const recounted = await recountEvidenceRows(repoPath, rows)

    expect(recounted.map(({ hitsAfter }) => hitsAfter)).toEqual([2, null])
  })

  test('Should count 0 after the change removes the pattern', async () => {
    const repoPath = await headerRepo()
    const rows = await recordedRows(repoPath)
    editEvidenceRepo(repoPath, {
      'src/layout.njk': layoutUsing('govuk-service-navigation__link')
    })

    const [applied] = await recountEvidenceRows(repoPath, rows)

    expect({
      hitsBefore: applied.hitsBefore,
      hitsAfter: applied.hitsAfter
    }).toEqual({
      hitsBefore: 2,
      hitsAfter: 0
    })
  })
})
