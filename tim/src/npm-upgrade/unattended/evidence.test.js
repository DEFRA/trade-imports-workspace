import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { TimError } from '../../errors.js'
import { writeJsonAtomic } from '../../review/store.js'
import {
  createEvidenceRepo,
  createDepsWorkspace,
  editEvidenceRepo
} from '../../test-support/deps-workspace.js'
import { packagesPath, runFolder } from '../state.js'
import {
  addPackageEvidence,
  checkPackageEvidence,
  evidencePath,
  readPackageEvidence,
  renderCheckedEvidenceText
} from './evidence.js'

const RUN_ID = 'EUDPA-802-npm'
const REPO = 'trade-imports-animals-frontend'
const PACKAGE = '@eslint/js'
const OLD_RULE = 'no-old-rule'
const CHECKED_AT = new Date('2026-11-14T02:30:00Z')

const workspaces = []

afterEach(() => {
  workspaces
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
})

const stageRun = async ({ target = '10.0.0' } = {}) => {
  const root = createDepsWorkspace({ cloned: [] })
  workspaces.push(root)
  const repoPath = await createEvidenceRepo(root, REPO, {
    tracked: {
      'eslint.config.js': `'${OLD_RULE}': 'error',\n'${OLD_RULE}': 'warn',\n`
    }
  })
  writeJsonAtomic(packagesPath(runFolder(root, RUN_ID), REPO), {
    ticket: RUN_ID,
    repo: REPO,
    packages: [{ package: PACKAGE, current: '9.39.0', target }]
  })
  return { root, repoPath }
}

const ids = (root) => ({
  workspaceRoot: root,
  runId: RUN_ID,
  repo: REPO,
  packageName: PACKAGE
})

const addRenameRow = (root) =>
  addPackageEvidence({
    ...ids(root),
    item: 'Rename no-old-rule to no-new-rule',
    outcome: 'applied',
    pattern: OLD_RULE
  })

describe('#addPackageEvidence', () => {
  test('Should write the row with the hits the pattern has now to the package evidence file', async () => {
    const { root } = await stageRun()

    await addRenameRow(root)

    const written = JSON.parse(readFileSync(evidencePath(ids(root)), 'utf8'))
    expect(written).toEqual({
      package: PACKAGE,
      target: '10.0.0',
      checked_at: null,
      rows: [
        {
          item: 'Rename no-old-rule to no-new-rule',
          pattern: OLD_RULE,
          hitsBefore: 2,
          hitsAfter: null,
          outcome: 'applied',
          reason: ''
        }
      ]
    })
  })

  test('Should say what it recorded', async () => {
    const { root } = await stageRun()

    const { message } = await addRenameRow(root)

    expect(message).toBe(
      `Added evidence for ${PACKAGE} in ${REPO}: applied, pattern "${OLD_RULE}" has 2 hits.`
    )
  })

  test('Should add a second row after the first', async () => {
    const { root } = await stageRun()
    await addRenameRow(root)

    await addPackageEvidence({
      ...ids(root),
      item: 'New flat config option',
      outcome: 'not-applicable',
      reason: 'The repo sets no flat config options.'
    })

    const items = readPackageEvidence(evidencePath(ids(root))).rows.map(
      ({ item }) => item
    )
    expect(items).toEqual([
      'Rename no-old-rule to no-new-rule',
      'New flat config option'
    ])
  })

  test('Should refuse an applied row whose pattern has no hits', async () => {
    const { root } = await stageRun()

    const adding = addPackageEvidence({
      ...ids(root),
      item: 'Rename no-other-rule',
      outcome: 'applied',
      pattern: 'no-other-rule'
    })

    await expect(adding).rejects.toThrow(
      'The pattern "no-other-rule" has no hits, so there is nothing to apply. Record the item as not-applicable.'
    )
  })

  test('Should refuse a package the run does not upgrade', async () => {
    const { root } = await stageRun()

    const adding = addPackageEvidence({
      ...ids(root),
      packageName: 'lodash',
      item: 'Anything',
      outcome: 'needs-a-person',
      reason: 'Read it.'
    })

    await expect(adding).rejects.toThrow(
      new TimError(
        'NOT_FOUND',
        `Can't find lodash in ${packagesPath(runFolder(root, RUN_ID), REPO)}.`
      )
    )
  })

  test('Should refuse more evidence once the run upgrades the package to another version', async () => {
    const { root } = await stageRun()
    await addRenameRow(root)
    writeJsonAtomic(packagesPath(runFolder(root, RUN_ID), REPO), {
      packages: [{ package: PACKAGE, current: '9.39.0', target: '10.1.0' }]
    })

    const adding = addRenameRow(root)

    await expect(adding).rejects.toThrow(
      `The evidence for ${PACKAGE} is for 10.0.0, but the run now upgrades it to 10.1.0. Delete ${evidencePath(ids(root))} and record the evidence again.`
    )
  })
})

describe('#checkPackageEvidence', () => {
  test('Should find every row clean once the change removes the pattern', async () => {
    const { root, repoPath } = await stageRun()
    await addRenameRow(root)
    editEvidenceRepo(repoPath, {
      'eslint.config.js': "'no-new-rule': 'error',\n"
    })

    const checked = await checkPackageEvidence({
      ...ids(root),
      now: CHECKED_AT
    })

    expect(checked).toEqual(
      expect.objectContaining({ allClean: true, rowCount: 1, notCleanCount: 0 })
    )
  })

  test('Should write the hits after the change and when it checked them', async () => {
    const { root, repoPath } = await stageRun()
    await addRenameRow(root)
    editEvidenceRepo(repoPath, {
      'eslint.config.js': `'${OLD_RULE}': 'error',\n`
    })

    await checkPackageEvidence({ ...ids(root), now: CHECKED_AT })

    const evidence = readPackageEvidence(evidencePath(ids(root)))
    expect({
      checkedAt: evidence.checked_at,
      hitsAfter: evidence.rows[0].hitsAfter
    }).toEqual({ checkedAt: '2026-11-14T02:30:00Z', hitsAfter: 1 })
  })

  test('Should say which rows are not clean and why', async () => {
    const { root } = await stageRun()
    await addRenameRow(root)

    const text = renderCheckedEvidenceText(
      await checkPackageEvidence({ ...ids(root), now: CHECKED_AT })
    )

    expect(text).toBe(
      [
        `1 of 1 evidence rows for ${PACKAGE} in ${REPO} are not clean:`,
        '- Rename no-old-rule to no-new-rule: The pattern still has 2 hits.'
      ].join('\n')
    )
  })

  test('Should refuse a package with no evidence recorded', async () => {
    const { root } = await stageRun()

    const checking = checkPackageEvidence(ids(root))

    await expect(checking).rejects.toThrow(
      new TimError(
        'NOT_FOUND',
        `No evidence is recorded for ${PACKAGE} in ${REPO}. Record each changelog item with tim npm packages add-evidence.`
      )
    )
  })
})

describe('#readPackageEvidence', () => {
  test('Should give null when no evidence is recorded', async () => {
    const { root } = await stageRun()

    expect(readPackageEvidence(evidencePath(ids(root)))).toBeNull()
  })

  test('Should refuse an evidence file whose row has an unknown outcome', async () => {
    const { root } = await stageRun()
    await addRenameRow(root)
    const path = evidencePath(ids(root))
    const evidence = JSON.parse(readFileSync(path, 'utf8'))
    writeFileSync(
      path,
      JSON.stringify({
        ...evidence,
        rows: [{ ...evidence.rows[0], outcome: 'done' }]
      })
    )

    const reading = () => readPackageEvidence(path)

    expect(reading).toThrow(/^.+: rows\.0\.outcome /)
  })
})

describe('#evidencePath', () => {
  test("Should give a scoped package a file named with its slash replaced, in the repo's evidence folder", () => {
    const path = evidencePath(ids('/workspace'))

    expect(path).toBe(
      `${runFolder('/workspace', RUN_ID)}/${REPO}/evidence/@eslint__js.json`
    )
  })
})
