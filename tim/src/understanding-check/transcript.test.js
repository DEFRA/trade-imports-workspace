import { describe, expect, test } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { stageInterviewWorkspace } from './__fixtures__/interview-workspace.js'
import { addScore, recordAnswer } from './transcript.js'

const NOW = '2026-11-14T10:00:00Z'

const withStaged = (run) => {
  const staged = stageInterviewWorkspace()
  try {
    return run(staged.root)
  } finally {
    staged.remove()
  }
}

const checkFile = (workspaceRoot, ticket, name) =>
  join(workspaceRoot, 'workareas', 'understanding-checks', ticket, name)

const readCheckFile = (workspaceRoot, ticket, name) =>
  JSON.parse(readFileSync(checkFile(workspaceRoot, ticket, name), 'utf8'))

describe('#recordAnswer', () => {
  test('Should record the answer without its trailing newlines and count its characters', () =>
    withStaged((root) => {
      const recorded = recordAnswer({
        workspaceRoot: root,
        ticket: 'EUDPA-230',
        questionId: 'Q1',
        answerFile: join(root, 'answers', 'multi-line.txt'),
        now: NOW
      })

      expect(recorded).toEqual({
        questionId: 'Q1',
        skipped: false,
        characters: 38
      })
      expect(readCheckFile(root, 'EUDPA-230', 'transcript.json')).toEqual({
        ticket: 'EUDPA-230',
        entries: [
          {
            question_id: 'Q1',
            answered_at: NOW,
            answer: 'First line.\n\n  Indented second | line.',
            skipped: false,
            score: null
          }
        ]
      })
    }))

  test('Should start transcript.json before refusing a missing answer file', () =>
    withStaged((root) => {
      expect(() =>
        recordAnswer({
          workspaceRoot: root,
          ticket: 'EUDPA-231',
          questionId: 'Q1',
          now: NOW
        })
      ).toThrow('Error: --answer-file required unless --skipped')
      expect(readCheckFile(root, 'EUDPA-231', 'transcript.json')).toEqual({
        ticket: 'EUDPA-231',
        entries: []
      })
    }))

  test('Should record a skip for an answer file of newlines', () =>
    withStaged((root) => {
      const recorded = recordAnswer({
        workspaceRoot: root,
        ticket: 'EUDPA-230',
        questionId: 'Q2',
        answerFile: join(root, 'answers', 'newlines.txt'),
        now: NOW
      })

      expect(recorded.skipped).toBe(true)
    }))
})

const scoreGiven = (root, overrides = {}) => ({
  workspaceRoot: root,
  ticket: 'EUDPA-240',
  questionId: 'Q1',
  verdict: 'PARTIAL',
  rubricMatch: 'Names the Q1 reason but not the budget',
  missedConcepts: 'retry budget',
  evidenceCited: 'src/a.js:1-4',
  followUp: '',
  now: NOW,
  ...overrides
})

describe('#addScore', () => {
  test('Should record the verdict when the match quotes the rubric', () =>
    withStaged((root) => {
      const scored = addScore(scoreGiven(root))

      expect(scored).toEqual({
        questionId: 'Q1',
        verdict: 'PARTIAL',
        unscorable: false,
        warning: ''
      })
      expect(
        readCheckFile(root, 'EUDPA-240', 'transcript.json').entries[0].score
      ).toEqual({
        verdict: 'PARTIAL',
        rubric_match: 'Names the Q1 reason but not the budget',
        missed_concepts: ['retry budget'],
        evidence_cited: [{ file: 'src/a.js', lines: '1-4' }],
        follow_up: null,
        scored_at: NOW
      })
    }))

  test('Should record FAIL as unscorable, warn and add a coverage gap when the match quotes nothing', () =>
    withStaged((root) => {
      const scored = addScore(
        scoreGiven(root, {
          verdict: 'PASS',
          rubricMatch: 'something the rubric never says'
        })
      )

      expect(scored).toEqual({
        questionId: 'Q1',
        verdict: 'FAIL',
        unscorable: true,
        warning:
          "Warning: --rubric-match does not overlap any clause in Q1's rubric; recording as unscorable."
      })
      expect(
        readCheckFile(root, 'EUDPA-240', 'transcript.json').entries[0].score
      ).toMatchObject({
        verdict: 'FAIL',
        rubric_match: '<unscorable>',
        missed_concepts: ['unscorable']
      })
      expect(
        readCheckFile(root, 'EUDPA-240', '.interview-meta.json').coverage_gaps
      ).toEqual([{ kind: 'unscorable', question_id: 'Q1' }])
    }))

  test('Should record an empty match as unscorable without a warning and write no meta when there is none', () =>
    withStaged((root) => {
      const scored = addScore(
        scoreGiven(root, { ticket: 'EUDPA-241', rubricMatch: '' })
      )

      expect(scored.warning).toBe('')
      expect(
        existsSync(checkFile(root, 'EUDPA-241', '.interview-meta.json'))
      ).toBe(false)
    }))

  test('Should refuse a verdict that is not PASS, PARTIAL or FAIL', () =>
    withStaged((root) => {
      expect(() => addScore(scoreGiven(root, { verdict: 'pass' }))).toThrow(
        'Error: --verdict must be PASS|PARTIAL|FAIL'
      )
    }))
})
