import { describe, test, expect, afterEach } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { countPatternHits, evidenceRepoPath } from './count.js'
import {
  OLD_HEADER_CLASS,
  createDepsWorkspace,
  createHeaderEvidenceWorkspace,
  editEvidenceRepo,
  layoutUsing
} from '../../test-support/deps-workspace.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

describe('#countPatternHits', () => {
  test('Should count tracked lines, not untracked files or any package-lock.json', async () => {
    const workspace = await createHeaderEvidenceWorkspace()
    root = workspace.root

    expect(await countPatternHits(workspace.repoPath, OLD_HEADER_CLASS)).toBe(2)
  })

  test('Should count 0 for a pattern with no hits', async () => {
    const workspace = await createHeaderEvidenceWorkspace()
    root = workspace.root

    expect(
      await countPatternHits(workspace.repoPath, 'govukServiceNavigation')
    ).toBe(0)
  })

  test('Should count uncommitted edits to tracked files', async () => {
    const workspace = await createHeaderEvidenceWorkspace()
    root = workspace.root
    editEvidenceRepo(workspace.repoPath, {
      'src/layout.njk': layoutUsing('govuk-service-navigation__link')
    })

    expect(await countPatternHits(workspace.repoPath, OLD_HEADER_CLASS)).toBe(0)
  })

  test('Should match the pattern as a fixed string, not a regular expression', async () => {
    const workspace = await createHeaderEvidenceWorkspace()
    root = workspace.root

    expect(await countPatternHits(workspace.repoPath, 'govuk-.*')).toBe(0)
  })

  test('Should refuse a folder outside a git work tree as not found', async () => {
    root = createDepsWorkspace()

    await expect(
      countPatternHits(
        join(root, 'repos', 'trade-imports-animals-frontend'),
        OLD_HEADER_CLASS
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('Should refuse an empty pattern as a usage error', async () => {
    root = createDepsWorkspace()

    await expect(countPatternHits(root, '')).rejects.toMatchObject({
      code: 'USAGE',
      message: 'Give a pattern to count.'
    })
  })
})

describe('#evidenceRepoPath', () => {
  test('Should point a repo name at its clone under repos/', () => {
    root = createDepsWorkspace()

    expect(evidenceRepoPath(root, 'trade-imports-animals-frontend')).toBe(
      join(root, 'repos', 'trade-imports-animals-frontend')
    )
  })

  test("Should point tim at the workspace's tim folder", () => {
    root = createDepsWorkspace()
    mkdirSync(join(root, 'tim'))

    expect(evidenceRepoPath(root, 'tim')).toBe(join(root, 'tim'))
  })

  test('Should refuse a repo that is not cloned as not found', () => {
    root = createDepsWorkspace()

    expect(() => evidenceRepoPath(root, 'trade-imports-gone')).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Can't find trade-imports-gone at ${join(root, 'repos', 'trade-imports-gone')}.`
      })
    )
  })
})
