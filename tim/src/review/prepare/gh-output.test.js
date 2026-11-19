import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  rawFolder,
  readPullRequestView,
  readSearchedPullRequests,
  searchCommand
} from './gh-output.js'

const folders = []

const reviewFolderHolding = (files = {}) => {
  const reviewFolder = mkdtempSync(join(tmpdir(), 'tim-gh-output-'))
  folders.push(reviewFolder)
  mkdirSync(rawFolder(reviewFolder))
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(rawFolder(reviewFolder), name), text)
  }
  return reviewFolder
}

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true }))
})

describe('#readSearchedPullRequests', () => {
  test('Should read the pull requests gh search saved', () => {
    const reviewFolder = reviewFolderHolding({
      'prs.json': '[{"number":7,"repository":{"name":"repo"}}]\n'
    })

    expect(
      readSearchedPullRequests({ reviewFolder, ticket: 'EUDPA-1' })
    ).toEqual([{ number: 7, repository: { name: 'repo' } }])
  })

  test('Should read an empty file as no pull requests', () => {
    const reviewFolder = reviewFolderHolding({ 'prs.json': '\n' })

    expect(
      readSearchedPullRequests({ reviewFolder, ticket: 'EUDPA-1' })
    ).toEqual([])
  })

  test('Should refuse a missing file, naming the branch search to run', () => {
    const reviewFolder = reviewFolderHolding()

    expect(() =>
      readSearchedPullRequests({ reviewFolder, branch: 'feat/x' })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Error: Can't find the pull requests gh found. Save them with:\n  gh search prs head:feat/x --owner DEFRA --json number,title,repository,url,state > ${join(reviewFolder, '.raw', 'prs.json')}`
      })
    )
  })

  test('Should refuse a file that does not hold a list', () => {
    const reviewFolder = reviewFolderHolding({ 'prs.json': '{"number":7}' })

    expect(() =>
      readSearchedPullRequests({ reviewFolder, ticket: 'EUDPA-1' })
    ).toThrow(expect.objectContaining({ code: 'PARSE' }))
  })
})

describe('#readPullRequestView', () => {
  test('Should read what gh pr view saved for a repo', () => {
    const reviewFolder = reviewFolderHolding({
      'repo.json': '{"headRefOid":"abc"}'
    })

    expect(readPullRequestView(reviewFolder, 'repo')).toEqual({
      headRefOid: 'abc'
    })
  })

  test.each([
    ['nothing saved', {}],
    ['a file that is not JSON', { 'repo.json': 'gh: not found' }],
    ['a file holding null', { 'repo.json': 'null' }]
  ])('Should give null for %s', (_, files) => {
    const reviewFolder = reviewFolderHolding(files)

    expect(readPullRequestView(reviewFolder, 'repo')).toBeNull()
  })
})

describe('#searchCommand', () => {
  test('Should name the ticket search, saving into the raw folder', () => {
    expect(searchCommand({ reviewFolder: '/r', ticket: 'EUDPA-1' })).toBe(
      'gh search prs EUDPA-1 --owner DEFRA --json number,title,repository,url,state,createdAt > /r/.raw/prs.json'
    )
  })
})
