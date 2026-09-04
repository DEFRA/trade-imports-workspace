import { describe, test, expect } from 'vitest'
import { ladderLine } from './index.js'

describe('ladderLine', () => {
  test('names the rungs in the order they run', () => {
    expect(ladderLine(['unit', 'format', 'lint', 'e2e', 'stack-e2e'])).toBe(
      'ladder: unit → format → lint → e2e → stack-e2e'
    )
  })

  // A backlog with no rungs reads exactly like a healthy one, right up to the
  // red pull request, so the empty case has to say what will happen instead.
  test('says what an empty ladder will cost and how to fix it', () => {
    const line = ladderLine([])

    expect(line).toContain('No verification ladder')
    expect(line).toContain('crossRepoLadder')
    expect(line).not.toContain('ladder:')
  })
})
