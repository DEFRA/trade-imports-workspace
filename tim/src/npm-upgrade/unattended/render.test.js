import { rmSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { TimError } from '../../errors.js'
import { writeJsonAtomic } from '../../review/store.js'
import { createDepsWorkspace } from '../../test-support/deps-workspace.js'
import { packagesPath, runFolder } from '../state.js'
import { evidencePath } from './evidence.js'
import { renderRunEvidence } from './render.js'

const RUN_ID = 'EUDPA-802-npm'
const REPO = 'trade-imports-animals-frontend'

const workspaces = []

afterEach(() => {
  workspaces
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
})

const CI_IS_ENOUGH = {
  policy: 'ci-is-enough',
  set: null,
  set_scope: null,
  policy_reason: 'lodash is in no set, and a patch upgrade needs only green CI.'
}

const CHANGELOG_DRIVEN = {
  policy: 'changelog-driven',
  set: 'eslint',
  set_scope: 'repo',
  policy_reason: '9.39.0 to 10.0.0 is a major upgrade.'
}

const upgraded = (name, current, target, policy, fields = {}) => ({
  package: name,
  current,
  target,
  classification: 'auto',
  implementation_status: 'done',
  failure_reason: null,
  ...policy,
  ...fields
})

const cleanRow = {
  item: 'Rename no-old-rule to no-new-rule',
  pattern: 'no-old-rule',
  hitsBefore: 2,
  hitsAfter: 0,
  outcome: 'applied',
  reason: ''
}

const stageRun = ({ packages, evidence = {} }) => {
  const root = createDepsWorkspace({ cloned: [] })
  workspaces.push(root)
  writeJsonAtomic(packagesPath(runFolder(root, RUN_ID), REPO), {
    ticket: RUN_ID,
    repo: REPO,
    packages
  })
  for (const [packageName, file] of Object.entries(evidence)) {
    writeJsonAtomic(
      evidencePath({
        workspaceRoot: root,
        runId: RUN_ID,
        repo: REPO,
        packageName
      }),
      { package: packageName, checked_at: '2026-11-14T02:30:00Z', ...file }
    )
  }
  return root
}

const render = (root) =>
  renderRunEvidence({ workspaceRoot: root, runId: RUN_ID })

const problemsOf = (rendered) =>
  rendered.repos[0].packages.map(({ package: name, problems }) => [
    name,
    problems
  ])

describe('#renderRunEvidence', () => {
  test('Should render a clean run as the package table and each changelog-driven package evidence', () => {
    const root = stageRun({
      packages: [
        upgraded('lodash', '4.17.20', '4.17.21', CI_IS_ENOUGH),
        upgraded('eslint', '9.39.0', '10.0.0', CHANGELOG_DRIVEN, {
          classification: 'manual'
        })
      ],
      evidence: { eslint: { target: '10.0.0', rows: [cleanRow] } }
    })

    const rendered = render(root)

    expect(rendered.markdown).toBe(
      [
        '## Packages and changelog evidence',
        '',
        '### `trade-imports-animals-frontend`',
        '',
        '| Package | From | To | Policy | Set | Outcome |',
        '|---|---|---|---|---|---|',
        '| `lodash` | 4.17.20 | 4.17.21 | ci-is-enough | - | Upgraded |',
        '| `eslint` | 9.39.0 | 10.0.0 | changelog-driven | eslint | Upgraded |',
        '',
        '#### `eslint` 9.39.0 to 10.0.0',
        '',
        '| Changelog item | Outcome | Evidence |',
        '|---|---|---|',
        '| Rename no-old-rule to no-new-rule | Applied | `no-old-rule`: 2 hits before, 0 after. |',
        '',
        'Every row is clean.',
        '',
        'Every package is clean.'
      ].join('\n')
    )
  })

  test('Should call a run clean when every package is', () => {
    const root = stageRun({
      packages: [upgraded('lodash', '4.17.20', '4.17.21', CI_IS_ENOUGH)]
    })

    expect(render(root).clean).toBe(true)
  })

  test('Should not call a changelog-driven package with no evidence clean', () => {
    const root = stageRun({
      packages: [upgraded('eslint', '9.39.0', '10.0.0', CHANGELOG_DRIVEN)]
    })

    const rendered = render(root)

    expect({
      clean: rendered.clean,
      evidence: rendered.repos[0].packages[0].evidence
    }).toEqual({
      clean: false,
      evidence: expect.objectContaining({ allClean: false, rowCount: 0 })
    })
  })

  test('Should not call a package clean when an evidence row is not', () => {
    const root = stageRun({
      packages: [upgraded('eslint', '9.39.0', '10.0.0', CHANGELOG_DRIVEN)],
      evidence: {
        eslint: { target: '10.0.0', rows: [{ ...cleanRow, hitsAfter: 1 }] }
      }
    })

    expect(render(root).repos[0].clean).toBe(false)
  })

  test('Should say what a person needs to look at for each package that is not clean', () => {
    const root = stageRun({
      packages: [
        upgraded('date-fns', '4.1.0', '4.1.1', {}, { classification: null }),
        upgraded('braces', '3.0.2', '3.0.3', CI_IS_ENOUGH, {
          implementation_status: 'failed',
          failure_reason: 'npm test failed'
        }),
        upgraded('chalk', '5.3.0', '5.4.0', CI_IS_ENOUGH, {
          implementation_status: null
        }),
        upgraded('eslint', '9.39.0', '10.0.0', CHANGELOG_DRIVEN)
      ],
      evidence: { eslint: { target: '9.40.0', rows: [cleanRow] } }
    })

    expect(problemsOf(render(root))).toEqual([
      [
        'date-fns',
        [
          'The planner has not classified it.',
          'No policy is recorded. Run tim npm packages set-policy.'
        ]
      ],
      ['braces', ['It was not upgraded: npm test failed.']],
      [
        'chalk',
        ['It is not upgraded yet: phase 2 or its implementer has not finished.']
      ],
      ['eslint', ['Its evidence is for 9.40.0, not 10.0.0.']]
    ])
  })

  test('Should list the problems under the tables and count the packages that are not clean', () => {
    const root = stageRun({
      packages: [
        upgraded('lodash', '4.17.20', '4.17.21', CI_IS_ENOUGH),
        upgraded('braces', '3.0.2', '3.0.3', CI_IS_ENOUGH, {
          implementation_status: 'failed',
          failure_reason: 'npm test failed'
        })
      ]
    })

    const tail = render(root).markdown.split('\n').slice(-5)

    expect(tail).toEqual([
      '**Needs a person:**',
      '',
      '- `braces`: It was not upgraded: npm test failed.',
      '',
      '**1 of 2 packages are not clean.**'
    ])
  })

  test('Should refuse a run with no packages file for the repo asked for', () => {
    const root = stageRun({ packages: [] })

    const rendering = () =>
      renderRunEvidence({
        workspaceRoot: root,
        runId: RUN_ID,
        repo: 'trade-imports-schemas'
      })

    expect(rendering).toThrow(
      new TimError(
        'NOT_FOUND',
        `Can't find a packages file for trade-imports-schemas in ${runFolder(root, RUN_ID)}.`
      )
    )
  })
})
