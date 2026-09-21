import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fingerprintOf, findOperation, recordOperation } from './ops-log.js'

let dir
let opsLogPath

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-ops-log-'))
  opsLogPath = join(dir, 'ops.jsonl')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('fingerprintOf', () => {
  test('is stable for the same shape', () => {
    const shape = { verb: 'backlog ingest', programme: 'p' }

    expect(fingerprintOf(shape)).toBe(fingerprintOf({ ...shape }))
  })

  test('differs for a different shape', () => {
    const shape = { verb: 'backlog ingest', programme: 'p' }

    expect(fingerprintOf(shape)).not.toBe(
      fingerprintOf({ ...shape, programme: 'q' })
    )
  })

  test('is the same regardless of key insertion order, at any depth', () => {
    const shape = { verb: 'backlog state set', heads: { a: 1, b: 2 } }
    const reordered = { heads: { b: 2, a: 1 }, verb: 'backlog state set' }

    expect(fingerprintOf(shape)).toBe(fingerprintOf(reordered))
  })
})

describe('findOperation', () => {
  test('an absent log returns null', () => {
    expect(
      findOperation({ opsLogPath, opId: 'op-1', fingerprint: 'fp' })
    ).toBeNull()
  })

  test('no opId returns null without touching the filesystem', () => {
    expect(findOperation({ opsLogPath, fingerprint: 'fp' })).toBeNull()
  })

  test('no opsLogPath returns null', () => {
    expect(findOperation({ opId: 'op-1', fingerprint: 'fp' })).toBeNull()
  })

  test('a recorded entry with the same op id and fingerprint is returned', () => {
    recordOperation({
      opsLogPath,
      entry: { opId: 'op-1', fingerprint: 'fp', result: { a: 1 } }
    })

    expect(
      findOperation({ opsLogPath, opId: 'op-1', fingerprint: 'fp' })
    ).toEqual({
      opId: 'op-1',
      fingerprint: 'fp',
      result: { a: 1 }
    })
  })

  test('the same op id with a different fingerprint throws USAGE, naming the op id and the recorded command', () => {
    recordOperation({
      opsLogPath,
      entry: { opId: 'op-1', fingerprint: 'fp', command: 'backlog ingest' }
    })

    expect(() =>
      findOperation({ opsLogPath, opId: 'op-1', fingerprint: 'different' })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('op-1')
      })
    )
  })

  test('a log line that is not JSON throws PARSE, naming the file and line 2', () => {
    writeFileSync(
      opsLogPath,
      `${JSON.stringify({ opId: 'op-0', fingerprint: 'fp0' })}\nnot json\n`
    )

    expect(() =>
      findOperation({ opsLogPath, opId: 'op-1', fingerprint: 'fp' })
    ).toThrowError(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringContaining(`${opsLogPath}:2`)
      })
    )
  })
})

describe('recordOperation', () => {
  test('appending twice gives two lines, each parseable, in order', () => {
    recordOperation({ opsLogPath, entry: { opId: 'op-1' } })
    recordOperation({ opsLogPath, entry: { opId: 'op-2' } })

    const lines = readFileSync(opsLogPath, 'utf8').trim().split('\n')
    expect(lines.map((line) => JSON.parse(line).opId)).toEqual(['op-1', 'op-2'])
  })
})
