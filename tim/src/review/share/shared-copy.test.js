import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { recordFolderFiles } from '../../test-support/bash-golden-harness.js'
import { copyReviewWithoutClones } from './shared-copy.js'

const folders = []

afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

const folderHolding = (files) => {
  const folder = mkdtempSync(join(tmpdir(), 'tim-shared-copy-'))
  folders.push(folder)
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
  return folder
}

describe('#copyReviewWithoutClones', () => {
  test('Should copy the review without repos/ or .diffs/ at any depth, delete stale files and keep the excluded folders already there', () => {
    const review = folderHolding({
      'items.stub.json': 'items\n',
      'nested/note.md': 'note\n',
      'nested/repos/clone.txt': 'clone\n',
      'repos/stub/README.md': 'clone\n',
      '.diffs/stub.diff': 'diff\n'
    })
    const shared = folderHolding({
      'stale.md': 'stale\n',
      'nested/old.md': 'old\n',
      'items.stub.json': 'old items\n',
      'repos/kept.txt': 'kept\n'
    })

    copyReviewWithoutClones(review, shared)

    expect(recordFolderFiles(shared, review)).toEqual({
      'items.stub.json': 'items\n',
      'nested/note.md': 'note\n',
      'repos/kept.txt': 'kept\n'
    })
  })

  test('Should make the shared folder when it is missing', () => {
    const review = folderHolding({ '.review-meta.json': '{}\n' })
    const shared = join(folderHolding({}), 'shared', 'EUDPA-1')

    copyReviewWithoutClones(review, shared)

    expect(recordFolderFiles(shared, review)).toEqual({
      '.review-meta.json': '{}\n'
    })
  })
})
