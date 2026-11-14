import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { stageBashWorkspace } from '../test-support/bash-golden-harness.js'
import { ledgerFiles, ticketReviewId } from './__fixtures__/review-ledger.js'
import {
  addFileReviewTodo,
  initFileReview,
  nextIdAfter,
  parseJsonOption,
  setFileReviewVerdict
} from './file-review.js'

const backendNotification = {
  repo: 'trade-imports-animals-backend',
  file: 'src/main/java/Notification.java'
}

let staged

beforeEach(() => {
  staged = stageBashWorkspace({ scripts: [], files: ledgerFiles })
})

afterEach(() => staged.remove())

describe('#nextIdAfter', () => {
  test('Should give 1 when there are no entries', () => {
    expect(nextIdAfter([])).toBe(1)
  })

  test('Should give the id after the highest, not after the count', () => {
    expect(nextIdAfter([{ id: 1 }, { id: 4 }])).toBe(5)
  })
})

describe('#parseJsonOption', () => {
  test('Should give the number a line names', () => {
    expect(parseJsonOption('--line', '41')).toBe(41)
  })

  test('Should refuse text that is not JSON, naming the option', () => {
    expect(() => parseJsonOption('--pr', 'none')).toThrow(
      'Invalid --pr: none (must be a number)'
    )
  })
})

describe('#initFileReview', () => {
  test('Should write an empty review with a null PR when none is given', () => {
    const { path, review } = initFileReview({
      workspaceRoot: staged.root,
      reviewId: ticketReviewId,
      repo: 'trade-imports-stub',
      file: 'src/a/B.java',
      commit: 'abc1234',
      mode: 'FRESH'
    })

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(review)
    expect(review).toEqual({
      file: 'src/a/B.java',
      repo: 'trade-imports-stub',
      commit: 'abc1234',
      pr: null,
      mode: 'FRESH',
      reviewed_at: null,
      verdict: null,
      verdict_reason: null,
      todos: []
    })
  })

  test('Should refuse the first missing option by its name', () => {
    expect(() =>
      initFileReview({
        workspaceRoot: staged.root,
        reviewId: ticketReviewId,
        repo: 'trade-imports-stub',
        mode: 'FRESH'
      })
    ).toThrow('Missing FILE')
  })
})

describe('#addFileReviewTodo', () => {
  test('Should store the line as a number and leave out an empty best practice', () => {
    const { todo } = addFileReviewTodo({
      workspaceRoot: staged.root,
      reviewId: ticketReviewId,
      ...backendNotification,
      line: '41',
      severity: 'Minor',
      category: 'naming',
      issue: 'Vague name',
      fix: 'Rename it'
    })

    expect(todo).toEqual({
      id: 5,
      line: 41,
      severity: 'Minor',
      category: 'naming',
      issue: 'Vague name',
      fix: 'Rename it'
    })
  })
})

describe('#setFileReviewVerdict', () => {
  test('Should store an empty reason when none is given, and the time to the second', () => {
    const { review } = setFileReviewVerdict({
      workspaceRoot: staged.root,
      reviewId: ticketReviewId,
      ...backendNotification,
      verdict: 'SAFE',
      now: () => new Date('2026-11-14T09:08:07.654Z')
    })

    expect(review).toMatchObject({
      verdict: 'SAFE',
      verdict_reason: '',
      reviewed_at: '2026-11-14T09:08:07Z'
    })
  })
})
