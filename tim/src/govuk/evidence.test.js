import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ABSENT_PATTERN,
  EVIDENCE_REPO,
  EVIDENCE_RUN,
  editEvidenceVersions,
  evidenceStatePath,
  evidenceVersion,
  NEW_CLASS,
  OLD_CLASS,
  stageEvidenceWorkspace,
  writeLayout
} from './__fixtures__/govuk-evidence.js'
import {
  addVersionEvidence,
  checkVersionEvidence,
  refuseUncleanEvidence
} from './evidence.js'
import { findVersion } from './state.js'

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const ids = (version) => ({
  workspaceRoot: staged.root,
  runId: EVIDENCE_RUN,
  repo: EVIDENCE_REPO,
  version
})

const addEvidence = (version, row) =>
  addVersionEvidence({ ...ids(version), ...row })

const applyOldClass = {
  item: 'Remove the service name link class',
  outcome: 'applied',
  pattern: OLD_CLASS
}

const absentNotApplicable = {
  item: 'Deprecate the service navigation slot',
  outcome: 'not-applicable',
  pattern: ABSENT_PATTERN,
  reason: 'We do not use the slot'
}

const acceptedHeaderColour = {
  item: 'Change the header link colour',
  outcome: 'applied',
  reason: 'The new header link colour is taken as it comes',
  acceptedBy: 'Sam Farrington',
  today: '2026-11-25'
}

const headerColourForAPerson = {
  item: acceptedHeaderColour.item,
  outcome: 'needs-a-person',
  reason: 'Check the header against the design'
}

const stateText = () => readFileSync(evidenceStatePath(staged), 'utf8')

const refusalOf = (version) =>
  refuseUncleanEvidence({
    workspaceRoot: staged.root,
    repo: EVIDENCE_REPO,
    version,
    found: findVersion(ids(version))
  })

describe('#addVersionEvidence', () => {
  test('Should record the hits in tracked files only, leaving out untracked files and every package-lock.json', async () => {
    staged = stageEvidenceWorkspace()

    const added = await addEvidence('5.5.0', applyOldClass)

    expect(added.row).toEqual({
      ...applyOldClass,
      hitsBefore: 2,
      hitsAfter: null,
      reason: ''
    })
  })

  test('Should add the row to the end of the version evidence in the state file', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', applyOldClass)

    await addEvidence('5.5.0', absentNotApplicable)

    expect(
      evidenceVersion(staged, '5.5.0').evidence.map(({ item }) => item)
    ).toEqual([applyOldClass.item, absentNotApplicable.item])
  })

  test('Should say what it added and how many hits the pattern has', async () => {
    staged = stageEvidenceWorkspace()

    const added = await addEvidence('5.5.0', applyOldClass)

    expect(added.message).toBe(
      `Added evidence for ${EVIDENCE_REPO}@5.5.0: applied, the pattern "${OLD_CLASS}" has 2 hits`
    )
  })

  test('Should record a not-applicable row with an absent pattern as 0 hits', async () => {
    staged = stageEvidenceWorkspace()

    const added = await addEvidence('5.5.0', absentNotApplicable)

    expect(added.row.hitsBefore).toBe(0)
  })

  test('Should record a not-applicable row with no pattern as no hits', async () => {
    staged = stageEvidenceWorkspace()

    const added = await addEvidence('5.6.0', {
      item: 'Fix focus style in accordion JavaScript',
      outcome: 'not-applicable',
      reason: 'We use no accordion'
    })

    expect(added).toEqual(
      expect.objectContaining({
        message: `Added evidence for ${EVIDENCE_REPO}@5.6.0: not-applicable, no pattern`,
        row: expect.objectContaining({ pattern: null, hitsBefore: null })
      })
    )
  })

  test.each([
    ['an applied row with no pattern', { item: 'x', outcome: 'applied' }],
    [
      'an applied row whose pattern the repo does not contain',
      { item: 'x', outcome: 'applied', pattern: ABSENT_PATTERN }
    ],
    [
      'a not-applicable row whose pattern the repo contains',
      {
        item: 'x',
        outcome: 'not-applicable',
        pattern: 'govukHeader',
        reason: 'No'
      }
    ],
    [
      'a needs-a-person row with no reason',
      { item: 'x', outcome: 'needs-a-person' }
    ],
    [
      'an accepted applied row that also gives a pattern',
      { ...acceptedHeaderColour, pattern: OLD_CLASS }
    ],
    [
      'an accepted row that is not applied',
      { ...acceptedHeaderColour, outcome: 'not-applicable' }
    ],
    [
      'an accepted applied row with no reason',
      { ...acceptedHeaderColour, reason: '' }
    ],
    ['an unknown outcome', { item: 'x', outcome: 'maybe' }],
    ['a row with no item', { outcome: 'needs-a-person', reason: 'Look' }]
  ])(
    'Should refuse %s as a usage error and leave the state file alone',
    async (_name, row) => {
      staged = stageEvidenceWorkspace()
      const before = stateText()

      await expect(addEvidence('5.5.0', row)).rejects.toMatchObject({
        code: 'USAGE'
      })

      expect(stateText()).toBe(before)
    }
  )

  test('Should record who accepted an applied row with no pattern, dated today', async () => {
    staged = stageEvidenceWorkspace()

    const added = await addEvidence('5.6.0', acceptedHeaderColour)

    expect(added).toEqual(
      expect.objectContaining({
        message: `Added evidence for ${EVIDENCE_REPO}@5.6.0: applied, accepted by Sam Farrington on 2026-11-25`,
        row: {
          item: acceptedHeaderColour.item,
          pattern: null,
          hitsBefore: null,
          hitsAfter: null,
          outcome: 'applied',
          reason: acceptedHeaderColour.reason,
          acceptedBy: 'Sam Farrington',
          acceptedOn: '2026-11-25'
        }
      })
    )
  })

  test('Should refuse a version the state file does not hold', async () => {
    staged = stageEvidenceWorkspace()

    await expect(addEvidence('4.0.0', applyOldClass)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Version 4.0.0 not found in ${evidenceStatePath(staged)}`
    })
  })

  test('Should refuse a version whose recorded evidence is not valid', async () => {
    staged = stageEvidenceWorkspace()
    editEvidenceVersions(staged, { '5.5.0': { evidence: [{ item: 'x' }] } })

    await expect(addEvidence('5.5.0', applyOldClass)).rejects.toMatchObject({
      code: 'PARSE'
    })
  })
})

describe('#addVersionEvidence with replace', () => {
  test('Should put the row in place of the row for the same item, keeping the others in order', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', headerColourForAPerson)
    await addEvidence('5.5.0', absentNotApplicable)

    const replaced = await addEvidence('5.5.0', {
      ...acceptedHeaderColour,
      replace: true
    })

    expect({
      message: replaced.message,
      replaced: replaced.replaced.outcome,
      rows: evidenceVersion(staged, '5.5.0').evidence.map(
        ({ item, outcome }) => `${item}: ${outcome}`
      )
    }).toEqual({
      message: `Replaced evidence for ${EVIDENCE_REPO}@5.5.0: applied, accepted by Sam Farrington on 2026-11-25`,
      replaced: 'needs-a-person',
      rows: [
        `${acceptedHeaderColour.item}: applied`,
        `${absentNotApplicable.item}: not-applicable`
      ]
    })
  })

  test('Should keep the hits counted before the change when the pattern is the same, so an applied row can follow the change', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', {
      ...applyOldClass,
      outcome: 'needs-a-person',
      reason: 'Check the new link class'
    })
    writeLayout(staged, NEW_CLASS)

    const replaced = await addEvidence('5.5.0', {
      ...applyOldClass,
      replace: true
    })
    const checked = await checkVersionEvidence(ids('5.5.0'))

    expect({
      hitsBefore: replaced.row.hitsBefore,
      allClean: checked.allClean
    }).toEqual({ hitsBefore: 2, allClean: true })
  })

  test('Should count the hits now when the pattern differs from the row it replaces', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', applyOldClass)
    writeLayout(staged, NEW_CLASS)

    await expect(
      addEvidence('5.5.0', {
        ...applyOldClass,
        pattern: `${OLD_CLASS}--wide`,
        replace: true
      })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: `The pattern "${OLD_CLASS}--wide" has no hits, so there is nothing to apply. Record the item as not-applicable.`
    })
  })

  test('Should refuse an item the version has no row for and leave the state file alone', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', absentNotApplicable)
    const before = stateText()

    await expect(
      addEvidence('5.5.0', { ...acceptedHeaderColour, replace: true })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Can't find an evidence row for "${acceptedHeaderColour.item}" in ${EVIDENCE_REPO}@5.5.0. Give the item exactly as its row has it, or leave out --replace to add a row.`
    })
    expect(stateText()).toBe(before)
  })
})

describe('#checkVersionEvidence', () => {
  test('Should find an applied row a person accepted clean', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.6.0', acceptedHeaderColour)

    const checked = await checkVersionEvidence(ids('5.6.0'))

    expect(checked.message).toBe(
      `Every evidence row for ${EVIDENCE_REPO}@5.6.0 is clean (1 rows).`
    )
  })

  test('Should find an applied row with hits left not clean, recording the hits after', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', applyOldClass)

    const checked = await checkVersionEvidence(ids('5.5.0'))

    expect(checked).toEqual(
      expect.objectContaining({
        allClean: false,
        message: `1 of 1 evidence rows for ${EVIDENCE_REPO}@5.5.0 are not clean:\n- ${applyOldClass.item}: The pattern still has 2 hits.`
      })
    )
    expect(evidenceVersion(staged, '5.5.0').evidence[0].hitsAfter).toBe(2)
  })

  test('Should find an applied row clean once its pattern has no hits left, counting uncommitted edits', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', applyOldClass)
    await addEvidence('5.5.0', absentNotApplicable)
    writeLayout(staged, NEW_CLASS)

    const checked = await checkVersionEvidence(ids('5.5.0'))

    expect(checked).toEqual(
      expect.objectContaining({
        allClean: true,
        message: `Every evidence row for ${EVIDENCE_REPO}@5.5.0 is clean (2 rows).`
      })
    )
    expect(evidenceVersion(staged, '5.5.0').evidence[0].hitsAfter).toBe(0)
  })

  test('Should find a not-applicable row whose pattern now appears not clean', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', absentNotApplicable)
    writeLayout(staged, NEW_CLASS, `${ABSENT_PATTERN}()`)

    const checked = await checkVersionEvidence(ids('5.5.0'))

    expect(checked.rows).toEqual([
      expect.objectContaining({
        clean: false,
        problem: 'The pattern now has 1 hit, so the item does apply.'
      })
    ])
  })

  test('Should find a version with no rows not clean, since the changelog still needs reading', async () => {
    staged = stageEvidenceWorkspace()

    const checked = await checkVersionEvidence(ids('5.6.0'))

    expect(checked).toEqual(
      expect.objectContaining({
        allClean: false,
        rowCount: 0,
        message: `No evidence rows are recorded for ${EVIDENCE_REPO}@5.6.0, so a person needs to read the changelog.`
      })
    )
  })
})

describe('#refuseUncleanEvidence', () => {
  test('Should refuse a version whose evidence, counted again now, still has hits, without writing them', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', applyOldClass)
    const before = stateText()

    await expect(refusalOf('5.5.0')).rejects.toMatchObject({
      code: 'REFUSED',
      message: `Can't apply ${EVIDENCE_REPO}@5.5.0 unattended: its evidence is not all clean, and govuk-frontend 5.4.0 to 5.5.0 is changelog-driven.\n1 of 1 evidence rows for ${EVIDENCE_REPO}@5.5.0 are not clean:\n- ${applyOldClass.item}: The pattern still has 2 hits.`
    })
    expect(stateText()).toBe(before)
  })

  test('Should pass a version whose pattern has gone since the last check', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', applyOldClass)
    await checkVersionEvidence(ids('5.5.0'))
    writeLayout(staged, NEW_CLASS)

    await expect(refusalOf('5.5.0')).resolves.toBeUndefined()
  })

  test('Should refuse a version with no evidence', async () => {
    staged = stageEvidenceWorkspace()

    await expect(refusalOf('5.6.0')).rejects.toMatchObject({
      code: 'REFUSED'
    })
  })

  test('Should pass a version with no evidence when moving to it is ci-is-enough', async () => {
    staged = stageEvidenceWorkspace()
    const setsPath = join(staged.root, 'config', 'dependency-sets.json')
    const sets = JSON.parse(readFileSync(setsPath, 'utf8'))
    writeFileSync(
      setsPath,
      JSON.stringify({
        ...sets,
        sets: sets.sets.filter(({ name }) => name !== 'govuk-frontend')
      })
    )

    await expect(refusalOf('5.6.0')).resolves.toBeUndefined()
  })

  test('Should refuse a version a hold on the repo covers, even with clean evidence', async () => {
    staged = stageEvidenceWorkspace()
    await addEvidence('5.5.0', absentNotApplicable)
    const setsPath = join(staged.root, 'config', 'dependency-sets.json')
    const sets = JSON.parse(readFileSync(setsPath, 'utf8'))
    writeFileSync(
      setsPath,
      JSON.stringify({
        ...sets,
        holds: [
          {
            package: 'govuk-frontend',
            versions: '5.5.x',
            repos: [EVIDENCE_REPO],
            reason: 'It breaks the header.',
            failingTest: 'FIT header tests',
            since: '2026-11-19'
          }
        ]
      })
    )

    await expect(refusalOf('5.5.0')).rejects.toMatchObject({
      code: 'REFUSED',
      message: `Can't apply ${EVIDENCE_REPO}@5.5.0 unattended: govuk-frontend 5.5.0 is in the range 5.5.x held since 2026-11-19. It breaks the header. Run tim deps holds to see the hold.`
    })
  })
})
