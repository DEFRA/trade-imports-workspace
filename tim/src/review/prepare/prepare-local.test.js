import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { prepareLocalReview, preparedLocalReviewText } from './prepare-local.js'

const folders = []

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true }))
})

const workspaceWithPlainFolder = () => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-review-local-'))
  folders.push(workspaceRoot)
  mkdirSync(join(workspaceRoot, 'repos', 'plain'), { recursive: true })
  return workspaceRoot
}

const prepare = (workspaceRoot, named) =>
  prepareLocalReview({
    workspaceRoot,
    now: '2026-11-14T09:00:00Z',
    log: () => {},
    ...named
  })

describe('#prepareLocalReview', () => {
  test('Should refuse no branch with the usage line', async () => {
    await expect(
      prepare(workspaceWithPlainFolder(), { repo: 'plain' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'Usage: tim review prepare --local <repo> <branch> [--files F1,F2,...] [--json]'
    })
  })

  test('Should refuse a folder that is not a git repo', async () => {
    const workspaceRoot = workspaceWithPlainFolder()

    await expect(
      prepare(workspaceRoot, { repo: 'plain', branch: 'main' })
    ).rejects.toMatchObject({
      message: `Not a git repo: ${join(workspaceRoot, 'repos', 'plain')}`
    })
  })
})

describe('#preparedLocalReviewText', () => {
  const summaryFor = (files) =>
    preparedLocalReviewText({
      meta: { id: 'local/r/b', repo: 'r', branch: 'b', files },
      folder: '/w/workareas/reviews/local/r/b',
      createdFiles: files.length
    })

  test('Should say nothing is to review when no file changed', () => {
    expect(summaryFor([]).split('\n').at(-1)).toBe(
      'Note: no changed files found — nothing to review.'
    )
  })

  test('Should name the verify step when files changed', () => {
    expect(summaryFor(['a.js']).split('\n').at(-1)).toBe(
      'Next: review each file, then run tim review verify files local/r/b'
    )
  })
})
