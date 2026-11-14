import { afterEach, describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { coverageGapsText, coverageOkText, verifyCoverage } from './verify.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedCheck = (files) => {
  root = mkdtempSync(join(tmpdir(), 'tim-uc-verify-'))
  const folder = join(root, 'workareas', 'understanding-checks', 'EUDPA-5')
  mkdirSync(folder, { recursive: true })
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(join(folder, name), JSON.stringify(value))
  }
}

const scoredEntry = (questionId) => ({
  question_id: questionId,
  score: { verdict: 'PASS' }
})

const sections = (overrides) => ({
  keyDesignDecisions: [],
  edgeCases: [],
  failureModes: [],
  securityRisks: [],
  dataOrApiChanges: [],
  testCoverageNotes: [],
  aiSuspectedRegions: [],
  ...overrides
})

describe('#verifyCoverage', () => {
  test('Should pass a check with every answer scored and every analysis complete with evidence', () => {
    seedCheck({
      '.interview-meta.json': { prs: [{ repo: 'stub' }] },
      'questions.json': { questions: [{ id: 'Q1' }] },
      'transcript.json': { entries: [scoredEntry('Q1')] },
      'analysis.stub.json': sections({
        verdict: 'complete',
        edgeCases: [{ id: 1, evidence: { file: 'a.js', lines: '1' } }]
      })
    })

    expect(verifyCoverage({ workspaceRoot: root, ticket: 'EUDPA-5' })).toEqual({
      ok: true,
      errors: []
    })
  })

  test('Should count a finding with blank evidence and a missing section as findings without evidence', () => {
    const { failureModes: _missing, ...withoutFailureModes } = sections({
      verdict: 'complete',
      edgeCases: [{ id: 1, evidence: { file: 'a.js', lines: '' } }]
    })
    seedCheck({
      '.interview-meta.json': { prs: [{ repo: 'stub' }] },
      'questions.json': { questions: [{ id: 'Q1' }] },
      'transcript.json': { entries: [scoredEntry('Q1')] },
      'analysis.stub.json': withoutFailureModes
    })

    expect(verifyCoverage({ workspaceRoot: root, ticket: 'EUDPA-5' })).toEqual({
      ok: false,
      errors: ['2 finding(s) without evidence in stub']
    })
  })

  test('Should look for the repo null when a PR has no repo or a null one, and skip a blank repo', () => {
    seedCheck({
      '.interview-meta.json': {
        prs: [{ number: 1 }, { repo: null }, { repo: '' }, { repo: 7 }]
      },
      'questions.json': { questions: [{ id: 'Q1' }] },
      'transcript.json': { entries: [scoredEntry('Q1')] }
    })

    expect(verifyCoverage({ workspaceRoot: root, ticket: 'EUDPA-5' })).toEqual({
      ok: false,
      errors: [
        'analysis missing for repo: null',
        'analysis missing for repo: null',
        'analysis missing for repo: 7'
      ]
    })
  })

  test('Should list unanswered questions, then answers with no score', () => {
    seedCheck({
      '.interview-meta.json': { prs: [] },
      'questions.json': {
        questions: [{ id: 'Q1' }, { id: 'Q2' }, { id: 'Q3' }]
      },
      'transcript.json': {
        entries: [{ question_id: 'Q2' }, { question_id: 'Q3', score: null }]
      }
    })

    expect(verifyCoverage({ workspaceRoot: root, ticket: 'EUDPA-5' })).toEqual({
      ok: false,
      errors: ['unanswered questions: Q1', 'unscored answers: Q2,Q3']
    })
  })

  test('Should list only the missing state files when any is missing', () => {
    seedCheck({ 'questions.json': { questions: [{ id: 'Q1' }] } })

    const { errors } = verifyCoverage({
      workspaceRoot: root,
      ticket: 'EUDPA-5'
    })

    expect(errors).toEqual([
      `meta file missing: ${join(root, 'workareas', 'understanding-checks', 'EUDPA-5', '.interview-meta.json')}`,
      'transcript.json missing'
    ])
  })
})

describe('#coverageOkText', () => {
  test('Should say coverage is OK only when there are no gaps', () => {
    expect(coverageOkText('EUDPA-5', { ok: true })).toBe(
      'Coverage OK for EUDPA-5'
    )
    expect(coverageOkText('EUDPA-5', { ok: false })).toBeNull()
  })
})

describe('#coverageGapsText', () => {
  test('Should list each gap under a heading, or nothing when there are none', () => {
    expect(coverageGapsText({ errors: ['a', 'b'] })).toBe(
      'Coverage gaps:\n  - a\n  - b'
    )
    expect(coverageGapsText({ errors: [] })).toBe('')
  })
})
