import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { freshStartText, reviewStartMode, startFreshReview } from './start.js'

const folders = []

const workspace = () => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-review-start-'))
  folders.push(workspaceRoot)
  return workspaceRoot
}

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true }))
})

describe('#reviewStartMode', () => {
  test('Should start a review with an index as a refresh', () => {
    const workspaceRoot = workspace()
    const folder = join(workspaceRoot, 'workareas', 'reviews', 'EUDPA-1')
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, 'review-index.md'), '# Index\n')

    expect(reviewStartMode({ workspaceRoot, ticket: 'EUDPA-1' })).toBe(
      'REFRESH'
    )
  })

  test('Should start a review with no index fresh', () => {
    expect(
      reviewStartMode({ workspaceRoot: workspace(), ticket: 'EUDPA-1' })
    ).toBe('FRESH')
  })

  test('Should refuse no ticket with the usage line', () => {
    expect(() => reviewStartMode({ workspaceRoot: workspace() })).toThrow(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})

describe('#startFreshReview', () => {
  test('Should make the raw folder and name the search that fills it', () => {
    const workspaceRoot = workspace()

    const started = startFreshReview({ workspaceRoot, ticket: 'EUDPA-1' })

    const folder = join(workspaceRoot, 'workareas', 'reviews', 'EUDPA-1')
    expect(existsSync(join(folder, '.raw'))).toBe(true)
    expect(freshStartText(started)).toBe(
      `Review folder: ${folder}\nRaw folder: ${folder}/.raw\n\nSave the pull requests into the raw folder with gh, then run tim review prepare (see the review skill, Step 1):\n  gh search prs EUDPA-1 --owner DEFRA --json number,title,repository,url,state,createdAt > ${folder}/.raw/prs.json`
    )
  })
})
