import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir, hostname } from 'node:os'
import { execa } from 'execa'
import { sha256Of, readVersioned, commitWrite } from './write.js'

let dir

const FAST_RETRY = { retryDelaysMs: [1, 1, 1] }

const acceptAnyBody = () => {}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-write-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('readVersioned', () => {
  test('an absent file gives exists: false and null sha and text', () => {
    expect(readVersioned(join(dir, 'nope.json'))).toEqual({
      exists: false,
      sha256: null,
      text: null
    })
  })

  test('a present file gives its exact bytes and their sha256', () => {
    const path = join(dir, 'out.json')
    writeFileSync(path, '{"a":1}')

    const versioned = readVersioned(path)

    expect(versioned.exists).toBe(true)
    expect(versioned.text).toBe('{"a":1}')
    expect(versioned.sha256).toBe(sha256Of('{"a":1}'))
  })
})

describe('commitWrite', () => {
  test('writes the bytes and returns replayed: false, the sha256 and no notes, with no temp or lock file left', () => {
    const path = join(dir, 'out.json')
    const body = '{"a":1}\n'

    const result = commitWrite({
      path,
      body,
      validate: acceptAnyBody,
      command: 'test',
      ...FAST_RETRY
    })

    expect(result).toEqual({
      replayed: false,
      sha256: sha256Of(body),
      bytes: Buffer.byteLength(body),
      notes: []
    })
    expect(readFileSync(path, 'utf8')).toBe(body)
    expect(readdirSync(dir)).toEqual(['out.json'])
  })

  test('an older expectedSha is refused with LOST_UPDATE, and the file and lock folder are untouched', () => {
    const path = join(dir, 'out.json')
    commitWrite({
      path,
      body: '{"a":1}\n',
      validate: acceptAnyBody,
      command: 'test',
      ...FAST_RETRY
    })
    const staleSha = 'a'.repeat(64)

    expect(() =>
      commitWrite({
        path,
        body: '{"a":2}\n',
        validate: acceptAnyBody,
        expectedSha: staleSha,
        command: 'test',
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'LOST_UPDATE' }))
    expect(readFileSync(path, 'utf8')).toBe('{"a":1}\n')
    expect(readdirSync(dir)).toEqual(['out.json'])
  })

  test('expectedSha: null over a file that now exists throws LOST_UPDATE', () => {
    const path = join(dir, 'out.json')
    commitWrite({
      path,
      body: '{"a":1}\n',
      validate: acceptAnyBody,
      command: 'test',
      ...FAST_RETRY
    })

    expect(() =>
      commitWrite({
        path,
        body: '{"a":2}\n',
        validate: acceptAnyBody,
        expectedSha: null,
        command: 'test',
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'LOST_UPDATE' }))
  })

  test('a replay (matching opId and fingerprint) returns the recorded result and writes nothing new', () => {
    const path = join(dir, 'out.json')
    const opsLogPath = join(dir, 'ops.jsonl')
    commitWrite({
      path,
      body: '{"a":1}\n',
      validate: acceptAnyBody,
      command: 'test',
      opId: 'op-1',
      fingerprint: 'fp-1',
      opsLogPath,
      result: { label: 'first' },
      ...FAST_RETRY
    })

    const replay = commitWrite({
      path,
      body: '{"a":1}\n',
      validate: acceptAnyBody,
      command: 'test',
      opId: 'op-1',
      fingerprint: 'fp-1',
      opsLogPath,
      result: { label: 'second' },
      ...FAST_RETRY
    })

    expect(replay.replayed).toBe(true)
    expect(replay.result.label).toBe('first')
    expect(readFileSync(path, 'utf8')).toBe('{"a":1}\n')
    expect(readFileSync(opsLogPath, 'utf8').trim().split('\n')).toHaveLength(1)
  })

  test('a new opId writes and appends exactly one operation entry, carrying opId, fingerprint, path, sha256 and result', () => {
    const path = join(dir, 'out.json')
    const opsLogPath = join(dir, 'ops.jsonl')

    const result = commitWrite({
      path,
      body: '{"a":1}\n',
      validate: acceptAnyBody,
      command: 'test',
      opId: 'op-1',
      fingerprint: 'fp-1',
      opsLogPath,
      result: { label: 'first' },
      ...FAST_RETRY
    })

    const lines = readFileSync(opsLogPath, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    const entry = JSON.parse(lines[0])
    expect(entry).toMatchObject({
      opId: 'op-1',
      fingerprint: 'fp-1',
      path,
      sha256: result.sha256,
      result: { label: 'first', sha256: result.sha256, notes: [] }
    })
  })

  test('a validate that throws refuses the write with no target, folder, temp or lock created', () => {
    const path = join(dir, 'nested', 'not-yet', 'out.json')
    const validate = () => {
      throw new Error('bad body')
    }

    expect(() =>
      commitWrite({
        path,
        body: '{}',
        validate,
        command: 'test',
        ...FAST_RETRY
      })
    ).toThrow(/bad body/)
    expect(readdirSync(dir)).toEqual([])
  })

  test('calling it without validate throws USAGE', () => {
    const path = join(dir, 'out.json')

    expect(() =>
      commitWrite({ path, body: '{}', command: 'test', ...FAST_RETRY })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
    expect(readdirSync(dir)).toEqual([])
  })

  test('a body that is not JSON (format: json) is refused with PARSE and nothing is written', () => {
    const path = join(dir, 'out.json')

    expect(() =>
      commitWrite({
        path,
        body: '{ not json',
        validate: acceptAnyBody,
        command: 'test',
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'PARSE' }))
    expect(readdirSync(dir)).toEqual([])
  })

  test('a bad line in a jsonl body is refused naming its line number', () => {
    const path = join(dir, 'out.jsonl')
    const body = '{"a":1}\n{ not json\n'

    expect(() =>
      commitWrite({
        path,
        body,
        format: 'jsonl',
        validate: acceptAnyBody,
        command: 'test',
        ...FAST_RETRY
      })
    ).toThrow(/:2 is not valid JSON/)
  })

  test('a live lock (held by this process, this host) throws LOCKED, leaving the file unchanged and the foreign lock in place', () => {
    const path = join(dir, 'out.json')
    writeFileSync(path, '{"a":1}\n')
    const lockPath = join(dir, '.out.lock')
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        host: hostname(),
        command: 'other',
        at: new Date().toISOString()
      })
    )

    expect(() =>
      commitWrite({
        path,
        body: '{"a":2}\n',
        validate: acceptAnyBody,
        command: 'test',
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'LOCKED' }))
    expect(readFileSync(path, 'utf8')).toBe('{"a":1}\n')
    expect(JSON.parse(readFileSync(lockPath, 'utf8')).command).toBe('other')
  })

  test('an opId with no opsLogPath throws USAGE and writes nothing', () => {
    const path = join(dir, 'out.json')

    expect(() =>
      commitWrite({
        path,
        body: '{"a":1}\n',
        validate: acceptAnyBody,
        command: 'test',
        opId: 'op-1',
        fingerprint: 'fp-1',
        ...FAST_RETRY
      })
    ).toThrowError(expect.objectContaining({ code: 'USAGE' }))
    expect(readdirSync(dir)).toEqual([])
  })
})

describe('the write-safety core, end to end with mkdtempSync directories', () => {
  test('writes into a not-yet-existing directory', () => {
    const path = join(dir, 'brand-new', 'nested', 'out.json')

    commitWrite({
      path,
      body: '{"a":1}\n',
      validate: acceptAnyBody,
      command: 'test',
      ...FAST_RETRY
    })

    expect(readFileSync(path, 'utf8')).toBe('{"a":1}\n')
  })

  test('the notes a broken stale lock leaves come back on commitWrite', async () => {
    const path = join(dir, 'out.json')
    const lockPath = join(dir, '.out.lock')
    const child = execa('node', ['-e', ''])
    const deadPid = child.pid
    await child
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: deadPid,
        host: hostname(),
        command: 'stale-holder',
        at: new Date().toISOString()
      })
    )

    const result = commitWrite({
      path,
      body: '{"a":1}\n',
      validate: acceptAnyBody,
      command: 'test',
      ...FAST_RETRY
    })

    expect(result.notes).toHaveLength(1)
    expect(result.notes[0]).toMatch(/Broke a stale lock/)
  })
})
