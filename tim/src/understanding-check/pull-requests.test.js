import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  rawFolder,
  readPullRequests,
  selectedText,
  selectPullRequests
} from './pull-requests.js'

const pullRequest = (repo, number, state, createdAt) => ({
  number,
  repository: { name: repo },
  state,
  createdAt
})

const withCheckFolder = (prsText, assertions) => {
  const folder = mkdtempSync(join(tmpdir(), 'tim-uc-prs-'))
  try {
    if (prsText !== undefined) {
      mkdirSync(rawFolder(folder))
      writeFileSync(join(rawFolder(folder), 'prs.json'), prsText)
    }
    return assertions(folder)
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

describe('#selectPullRequests', () => {
  test('Should keep one pull request per repo, in repo-name order', () => {
    const selected = selectPullRequests([
      pullRequest('zeta', 1, 'MERGED', '2026-01-01T00:00:00Z'),
      pullRequest('alpha', 2, 'MERGED', '2026-01-01T00:00:00Z')
    ])

    expect(selected.map(({ number }) => number)).toEqual([2, 1])
  })

  test('Should prefer an open pull request over a newer merged one', () => {
    const selected = selectPullRequests([
      pullRequest('alpha', 1, 'MERGED', '2026-02-01T00:00:00Z'),
      pullRequest('alpha', 2, 'OPEN', '2026-01-01T00:00:00Z')
    ])

    expect(selected.map(({ number }) => number)).toEqual([2])
  })

  test('Should take the newest when no pull request is open', () => {
    const selected = selectPullRequests([
      pullRequest('alpha', 1, 'MERGED', '2026-01-01T00:00:00Z'),
      pullRequest('alpha', 2, 'CLOSED', '2026-03-01T00:00:00Z'),
      pullRequest('alpha', 3, 'MERGED', '2026-02-01T00:00:00Z')
    ])

    expect(selected.map(({ number }) => number)).toEqual([2])
  })

  test('Should take the later-listed of two created at the same time, as jq reverse did', () => {
    const selected = selectPullRequests([
      pullRequest('alpha', 1, 'OPEN', '2026-01-01T00:00:00Z'),
      pullRequest('alpha', 2, 'OPEN', '2026-01-01T00:00:00Z')
    ])

    expect(selected.map(({ number }) => number)).toEqual([2])
  })
})

describe('#readPullRequests', () => {
  test('Should read the pull requests gh saved', () => {
    const saved = [pullRequest('alpha', 1, 'OPEN', '2026-01-01T00:00:00Z')]

    const read = withCheckFolder(`${JSON.stringify(saved)}\n`, (folder) =>
      readPullRequests(folder, 'EUDPA-1')
    )

    expect(read).toEqual(saved)
  })

  test.each([
    ['no file', undefined],
    ['an empty file', ''],
    ['an empty list', '[]\n']
  ])('Should refuse %s as no pull requests found', (_name, prsText) => {
    withCheckFolder(prsText, (folder) =>
      expect(() => readPullRequests(folder, 'EUDPA-1')).toThrow(
        'Error: No PRs found for EUDPA-1 — cannot run understanding-check'
      )
    )
  })

  test('Should refuse a file that is not a list', () => {
    withCheckFolder('{"number": 1}', (folder) =>
      expect(() => readPullRequests(folder, 'EUDPA-1')).toThrow(
        'does not hold a list of pull requests'
      )
    )
  })
})

describe('#selectedText', () => {
  test('Should print each pull request as its repo and number, one a line', () => {
    const text = selectedText([
      pullRequest('alpha', 16, 'OPEN'),
      pullRequest('beta', 9, 'MERGED')
    ])

    expect(text).toBe('alpha 16\nbeta 9')
  })
})
