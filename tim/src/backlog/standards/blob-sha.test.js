import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { gitBlobSha, fileBlobSha } from './blob-sha.js'

describe('#gitBlobSha', () => {
  test('B-1 matches the well-known git blob sha for "hello\\n"', () => {
    const sha = gitBlobSha(Buffer.from('hello\n'))

    expect(sha).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })

  test('B-2 matches the well-known git blob sha for an empty buffer', () => {
    const sha = gitBlobSha(Buffer.alloc(0))

    expect(sha).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
  })
})

describe('#fileBlobSha', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tim-blob-sha-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  test('B-3 returns null for a file that does not exist', () => {
    const sha = fileBlobSha(join(dir, 'does-not-exist.txt'))

    expect(sha).toBeNull()
  })

  test('reads a real file on disk and returns the same sha as gitBlobSha over its bytes', () => {
    const path = join(dir, 'hello.txt')
    writeFileSync(path, 'hello\n')

    const sha = fileBlobSha(path)

    expect(sha).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })

  test('returns null for a path that is a directory', () => {
    const subdir = join(dir, 'a-folder')
    mkdirSync(subdir)

    const sha = fileBlobSha(subdir)

    expect(sha).toBeNull()
  })
})
