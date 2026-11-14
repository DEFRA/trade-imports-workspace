import { describe, expect, test } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stageInterviewWorkspace } from './__fixtures__/interview-workspace.js'
import { addQuestion, removeQuestion, replaceQuestion } from './questions.js'

const NOW = '2026-11-14T10:00:00Z'

const withStaged = (run) => {
  const staged = stageInterviewWorkspace()
  try {
    return run(staged.root)
  } finally {
    staged.remove()
  }
}

const questionsPath = (workspaceRoot, ticket) =>
  join(
    workspaceRoot,
    'workareas',
    'understanding-checks',
    ticket,
    'questions.json'
  )

const questionsIn = (workspaceRoot, ticket) =>
  JSON.parse(readFileSync(questionsPath(workspaceRoot, ticket), 'utf8'))

const writeNullQuestions = (workspaceRoot, ticket) =>
  writeFileSync(
    questionsPath(workspaceRoot, ticket),
    JSON.stringify({ ticket, questions: null })
  )

const given = (workspaceRoot, ticket, overrides = {}) => ({
  workspaceRoot,
  ticket,
  category: 'implementation',
  prompt: 'Why?',
  anchorFile: 'src/a.js',
  anchorLines: '1-2',
  expectedConcepts: 'one, two',
  rubricPass: 'Names both',
  rubricPartial: 'Names one',
  rubricFail: 'Neither',
  now: NOW,
  ...overrides
})

describe('#addQuestion', () => {
  test('Should start questions.json with the ticket and time, and number the first question Q1', () =>
    withStaged((root) => {
      const added = addQuestion(given(root, 'EUDPA-200'))

      expect(added).toEqual({ id: 'Q1' })
      expect(questionsIn(root, 'EUDPA-200')).toEqual({
        ticket: 'EUDPA-200',
        generated_at: NOW,
        questions: [
          {
            id: 'Q1',
            category: 'implementation',
            prompt: 'Why?',
            anchorEvidence: { file: 'src/a.js', lines: '1-2' },
            expectedConcepts: ['one', 'two'],
            rubric: {
              PASS: 'Names both',
              PARTIAL: 'Names one',
              FAIL: 'Neither'
            }
          }
        ]
      })
    }))

  test('Should refuse a PASS clause with no categorical verb and show it', () =>
    withStaged((root) => {
      expect(() =>
        addQuestion(given(root, 'EUDPA-200', { rubricPass: 'shows it' }))
      ).toThrow(
        "Error: --rubric-pass must contain one of: names | identifies | explains | describes | cites | distinguishes | contrasts | enumerates\nGot: 'shows it'"
      )
    }))

  test('Should refuse a thirteenth question', () =>
    withStaged((root) => {
      expect(() => addQuestion(given(root, 'EUDPA-201'))).toThrow(
        'Error: question cap (12) already reached'
      )
    }))
})

describe('#replaceQuestion', () => {
  test('Should replace the question in place, keeping its id', () =>
    withStaged((root) => {
      replaceQuestion(given(root, 'EUDPA-202', { id: 'Q2', prompt: 'New?' }))

      expect(
        questionsIn(root, 'EUDPA-202').questions.map(({ id, prompt }) => [
          id,
          prompt
        ])
      ).toEqual([
        ['Q1', 'Why does Q1 matter?'],
        [undefined, 'No id here'],
        ['Q2', 'New?'],
        ['Q3', 'Why does Q3 matter?']
      ])
    }))

  test('Should refuse a missing id before anything else after the ticket', () =>
    withStaged((root) => {
      expect(() =>
        replaceQuestion(given(root, 'EUDPA-202', { category: undefined }))
      ).toThrow('Error: missing required arg ID')
    }))
})

describe('#removeQuestion', () => {
  test('Should remove the question and number the rest from Q1', () =>
    withStaged((root) => {
      removeQuestion({ workspaceRoot: root, ticket: 'EUDPA-202', id: 'Q1' })

      expect(
        questionsIn(root, 'EUDPA-202').questions.map(({ id }) => id)
      ).toEqual(['Q1', 'Q2', 'Q3'])
    }))

  test('Should refuse an id that is not there', () =>
    withStaged((root) => {
      expect(() =>
        removeQuestion({ workspaceRoot: root, ticket: 'EUDPA-202', id: 'Q9' })
      ).toThrow('Error: question Q9 not found')
    }))
})

describe('questions that are not a list', () => {
  test('Should refuse a replace and leave questions.json as it was', () =>
    withStaged((root) => {
      writeNullQuestions(root, 'EUDPA-202')

      expect(() =>
        replaceQuestion(given(root, 'EUDPA-202', { id: 'Q1' }))
      ).toThrow(
        `Error: ${questionsPath(root, 'EUDPA-202')} questions is not a list`
      )
      expect(questionsIn(root, 'EUDPA-202')).toEqual({
        ticket: 'EUDPA-202',
        questions: null
      })
    }))

  test('Should refuse a remove', () =>
    withStaged((root) => {
      writeNullQuestions(root, 'EUDPA-202')

      expect(() =>
        removeQuestion({ workspaceRoot: root, ticket: 'EUDPA-202', id: 'Q1' })
      ).toThrow(
        `Error: ${questionsPath(root, 'EUDPA-202')} questions is not a list`
      )
    }))

  test('Should add to null questions as Q1', () =>
    withStaged((root) => {
      writeNullQuestions(root, 'EUDPA-202')

      expect(addQuestion(given(root, 'EUDPA-202'))).toEqual({ id: 'Q1' })
    }))
})
