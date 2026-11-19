import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  EVIDENCE_REPO,
  EVIDENCE_RUN,
  editEvidenceVersions,
  evidenceStatePath,
  OLD_CLASS,
  readEvidenceState,
  stageEvidenceWorkspace
} from './__fixtures__/govuk-evidence.js'
import { renderRunEvidence } from './render-evidence.js'

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const render = () =>
  renderRunEvidence({
    workspaceRoot: staged.root,
    runId: EVIDENCE_RUN,
    repo: EVIDENCE_REPO
  })

const appliedRow = {
  item: 'Remove the service name link class',
  pattern: OLD_CLASS,
  hitsBefore: 2,
  hitsAfter: 0,
  outcome: 'applied',
  reason: ''
}

const notApplicableRow = (item) => ({
  item,
  pattern: null,
  hitsBefore: null,
  hitsAfter: null,
  outcome: 'not-applicable',
  reason: 'Nothing in this repo uses it'
})

const everyVersionDoneAndClean = (staged) => {
  writeFileSync(
    join(
      staged.root,
      'workareas/govuk-upgrades',
      EVIDENCE_RUN,
      EVIDENCE_REPO,
      'version__5.7.0.changelog.md'
    ),
    '## govuk-frontend v5.7.0 — Changelog\n'
  )
  editEvidenceVersions(staged, {
    '5.5.0': { implementation_status: 'done', evidence: [appliedRow] },
    '5.6.0': {
      implementation_status: 'done',
      evidence: [notApplicableRow('Fix the accordion focus style')]
    },
    '5.7.0': {
      implementation_status: 'done',
      evidence: [notApplicableRow('Internal build changes')]
    }
  })
}

const itemsOf = (markdown) =>
  markdown
    .split('\n')
    .filter((line) => line.startsWith('| v'))
    .map((line) => line.split(' | ')[0].slice(2))

describe('#renderRunEvidence', () => {
  test('Should head the table with the repo and its version range', () => {
    staged = stageEvidenceWorkspace()

    expect(render().markdown).toMatch(
      new RegExp(
        `^## Changelog evidence\n\n### \`${EVIDENCE_REPO}\`: govuk-frontend 5\\.4\\.0 to 5\\.7\\.0\n\n\\| Changelog item \\| Outcome \\| Evidence \\|\n`
      )
    )
  })

  test('Should give a needs-a-person row for each planned version not applied and with no evidence, and for the missing changelog section', () => {
    staged = stageEvidenceWorkspace()

    expect(itemsOf(render().markdown)).toEqual([
      'v5.5.0: Not applied',
      'v5.5.0: No evidence recorded',
      'v5.6.0: Not applied',
      'v5.6.0: No evidence recorded',
      'v5.7.0: No changelog section',
      'v5.7.0: Not applied',
      'v5.7.0: No evidence recorded'
    ])
  })

  test('Should give a needs-a-person row for a version nobody planned', () => {
    staged = stageEvidenceWorkspace()
    everyVersionDoneAndClean(staged)
    editEvidenceVersions(staged, {
      '5.6.0': { classification: null, implementation_status: null }
    })

    expect(itemsOf(render().markdown)).toContain('v5.6.0: Version not planned')
  })

  test('Should give a failed apply a needs-a-person row with the failure reason', () => {
    staged = stageEvidenceWorkspace()
    everyVersionDoneAndClean(staged)
    editEvidenceVersions(staged, {
      '5.7.0': {
        implementation_status: 'failed',
        failure_reason: 'npm test failed'
      }
    })

    expect(render().markdown).toContain(
      '| v5.7.0: Apply failed | **Needs a person** | npm test failed |'
    )
  })

  test('Should list the versions in version order, whatever order the state file holds them in', () => {
    staged = stageEvidenceWorkspace()
    everyVersionDoneAndClean(staged)
    const state = readEvidenceState(staged)
    writeFileSync(
      evidenceStatePath(staged),
      JSON.stringify({ ...state, versions: state.versions.toReversed() })
    )

    expect(itemsOf(render().markdown)).toEqual([
      `v5.5.0: ${appliedRow.item}`,
      'v5.6.0: Fix the accordion focus style',
      'v5.7.0: Internal build changes'
    ])
  })

  test('Should be clean when every version is applied and every row is applied or not applicable', () => {
    staged = stageEvidenceWorkspace()
    everyVersionDoneAndClean(staged)

    const rendered = render()

    expect(rendered).toEqual(
      expect.objectContaining({
        repo: EVIDENCE_REPO,
        current: '5.4.0',
        target: '5.7.0',
        allClean: true,
        rowCount: 3,
        notCleanCount: 0
      })
    )
    expect(rendered.markdown).toContain(
      `| v5.5.0: ${appliedRow.item} | Applied | \`${OLD_CLASS}\`: 2 hits before, 0 after. |`
    )
    expect(rendered.markdown.endsWith('\nEvery row is clean.')).toBe(true)
  })

  test('Should count a needs-a-person row as not clean and escape a pipe in its item', () => {
    staged = stageEvidenceWorkspace()
    everyVersionDoneAndClean(staged)
    editEvidenceVersions(staged, {
      '5.6.0': {
        implementation_status: 'done',
        evidence: [
          {
            ...notApplicableRow('Change the link colour | in the header'),
            outcome: 'needs-a-person',
            reason: 'Visual change: check the header against the design'
          }
        ]
      }
    })

    const rendered = render()

    expect(rendered.allClean).toBe(false)
    expect(rendered.markdown).toContain(
      'v5.6.0: Change the link colour \\| in the header'
    )
    expect(rendered.markdown.endsWith('\n**1 of 3 rows are not clean.**')).toBe(
      true
    )
  })

  test('Should refuse a repo with no state file in the run', () => {
    staged = stageEvidenceWorkspace()

    expect(() =>
      renderRunEvidence({
        workspaceRoot: staged.root,
        runId: EVIDENCE_RUN,
        repo: 'trade-imports-stub'
      })
    ).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
  })

  test('Should refuse a missing --repo as a usage error', () => {
    staged = stageEvidenceWorkspace()

    expect(() =>
      renderRunEvidence({ workspaceRoot: staged.root, runId: EVIDENCE_RUN })
    ).toThrow(
      expect.objectContaining({ code: 'USAGE', message: 'Missing --repo' })
    )
  })
})
