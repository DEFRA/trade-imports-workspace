import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
  readdirSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonFile, writeJsonAtomic, sha256File } from './io.js'

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-parity-io-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('readJsonFile', () => {
  test('names the file when it is absent', () => {
    expect(() => readJsonFile(join(dir, 'nope.json'))).toThrow(/nope\.json/)
  })

  test('names the file when it will not parse', () => {
    const path = join(dir, 'bad.json')
    writeFileSync(path, '{ not json')
    expect(() => readJsonFile(path)).toThrow(/bad\.json is not valid JSON/)
  })

  test('returns the parsed value', () => {
    const path = join(dir, 'ok.json')
    writeFileSync(path, '{"a":1}')
    expect(readJsonFile(path)).toEqual({ a: 1 })
  })
})

describe('writeJsonAtomic', () => {
  test('writes pretty-printed JSON with a trailing newline', () => {
    const path = join(dir, 'out.json')
    writeJsonAtomic(path, { a: 1 })
    expect(readFileSync(path, 'utf8')).toBe('{\n  "a": 1\n}\n')
  })

  test('leaves no temp file behind', () => {
    const path = join(dir, 'out.json')
    writeJsonAtomic(path, { a: 1 })
    expect(readdirSync(dir)).toEqual(['out.json'])
  })

  test('reports the hash and size of what it wrote', () => {
    const path = join(dir, 'out.json')
    const result = writeJsonAtomic(path, { a: 1 })
    expect(result.bytes).toBe(readFileSync(path).length)
    expect(result.sha256).toBe(sha256File(path))
  })

  test('replaces an existing file in one step', () => {
    const path = join(dir, 'out.json')
    writeJsonAtomic(path, { a: 1 })
    writeJsonAtomic(path, { b: 2 })
    expect(readJsonFile(path)).toEqual({ b: 2 })
  })
})
