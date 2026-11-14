import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { prFactsPath, readPrCurrentPaths, readPrFiles } from './pr-facts.js'

const folders = []

const reviewFolderHolding = (facts) => {
  const reviewFolder = mkdtempSync(join(tmpdir(), 'tim-pr-facts-'))
  folders.push(reviewFolder)
  if (facts !== undefined) {
    mkdirSync(join(reviewFolder, '.prs'))
    writeFileSync(prFactsPath(reviewFolder, 'repo', 7), JSON.stringify(facts))
  }
  return reviewFolder
}

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true }))
})

describe('#readPrFiles', () => {
  test('Should list every page of files, each rename followed by its old path', () => {
    const reviewFolder = reviewFolderHolding([
      [{ filename: 'b.js', previous_filename: 'a.js' }, { filename: 'c.js' }],
      [{ filename: 'd.js', previous_filename: null }]
    ])

    expect(readPrFiles({ reviewFolder, repo: 'repo', pr: 7 })).toEqual([
      'b.js',
      'a.js',
      'c.js',
      'd.js'
    ])
  })

  test('Should read a single page of files', () => {
    const reviewFolder = reviewFolderHolding([{ filename: 'c.js' }])

    expect(readPrFiles({ reviewFolder, repo: 'repo', pr: 7 })).toEqual(['c.js'])
  })

  test('Should refuse a missing facts file, naming the gh command that writes it', () => {
    const reviewFolder = reviewFolderHolding()

    expect(() => readPrFiles({ reviewFolder, repo: 'repo', pr: 7 })).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Can't find the changed files of repo#7. Write them with:\n  gh api repos/DEFRA/repo/pulls/7/files --paginate --slurp > ${prFactsPath(reviewFolder, 'repo', 7)}`
      })
    )
  })

  test('Should refuse a facts file that does not list files', () => {
    const reviewFolder = reviewFolderHolding({ files: [] })

    expect(() => readPrFiles({ reviewFolder, repo: 'repo', pr: 7 })).toThrow(
      expect.objectContaining({ code: 'PARSE' })
    )
  })
})

describe('#readPrCurrentPaths', () => {
  test('Should list each file by the path it has now, across every page', () => {
    const reviewFolder = reviewFolderHolding([
      [{ filename: 'b.js', previous_filename: 'a.js' }, { filename: 'c.js' }],
      [{ filename: 'd.js' }]
    ])

    expect(readPrCurrentPaths({ reviewFolder, repo: 'repo', pr: 7 })).toEqual([
      'b.js',
      'c.js',
      'd.js'
    ])
  })
})
