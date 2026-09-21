import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir, hostname } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execa } from 'execa'
import {
  LOCK_RETRY_DELAYS_MS,
  lockPathFor,
  acquireLock,
  releaseLock
} from './lock.js'

const here = dirname(fileURLToPath(import.meta.url))
const FAST_RETRY_DELAYS_MS = [1, 1, 1]

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-lock-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('lockPathFor', () => {
  test('derives .backlog.lock, .state.lock and .journal.lock from their targets', () => {
    expect(lockPathFor('/a/backlog.json')).toBe('/a/.backlog.lock')
    expect(lockPathFor('/a/build/state.json')).toBe('/a/build/.state.lock')
    expect(lockPathFor('/a/build/journal.jsonl')).toBe('/a/build/.journal.lock')
  })
})

describe('acquireLock / releaseLock', () => {
  test('acquireLock creates the lock with pid, host, command, opId and an ISO at; releaseLock removes it', () => {
    const lockPath = join(dir, '.backlog.lock')

    acquireLock({ lockPath, command: 'backlog ingest', opId: 'op-1' })

    const content = JSON.parse(readFileSync(lockPath, 'utf8'))
    expect(content).toEqual({
      pid: process.pid,
      host: hostname(),
      command: 'backlog ingest',
      opId: 'op-1',
      at: expect.any(String)
    })
    expect(() => new Date(content.at).toISOString()).not.toThrow()

    releaseLock({ lockPath })

    expect(existsSync(lockPath)).toBe(false)
  })

  test('a second acquireLock while the first is held throws LOCKED after the retries, naming the holder', () => {
    const lockPath = join(dir, '.backlog.lock')
    acquireLock({ lockPath, command: 'first-holder' })

    expect(() =>
      acquireLock({
        lockPath,
        command: 'second-caller',
        retryDelaysMs: FAST_RETRY_DELAYS_MS
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'LOCKED',
        message: expect.stringMatching(
          new RegExp(
            `${process.pid}.*first-holder.*Run the same command again`,
            's'
          )
        )
      })
    )
  })

  test('a stale lock (same host, an exited process) is broken: the call succeeds with one note naming the old pid and command', async () => {
    const lockPath = join(dir, '.backlog.lock')
    const child = execa('node', ['-e', ''])
    const deadPid = child.pid
    await child
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: deadPid,
        host: hostname(),
        command: 'dead-holder',
        at: '2026-01-01T00:00:00.000Z'
      })
    )

    const { notes } = acquireLock({ lockPath, command: 'new-holder' })

    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatch(new RegExp(`${deadPid}.*dead-holder`, 's'))
  })

  test('a lock from another host is treated as live: LOCKED', () => {
    const lockPath = join(dir, '.backlog.lock')
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: 999999,
        host: 'elsewhere',
        command: 'remote-holder',
        at: new Date().toISOString()
      })
    )

    expect(() =>
      acquireLock({
        lockPath,
        command: 'caller',
        retryDelaysMs: FAST_RETRY_DELAYS_MS
      })
    ).toThrowError(expect.objectContaining({ code: 'LOCKED' }))
  })

  test('a lock file that is not JSON is treated as live: LOCKED, naming the path', () => {
    const lockPath = join(dir, '.backlog.lock')
    writeFileSync(lockPath, 'not json')

    expect(() =>
      acquireLock({
        lockPath,
        command: 'caller',
        retryDelaysMs: FAST_RETRY_DELAYS_MS
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'LOCKED',
        message: expect.stringContaining(lockPath)
      })
    )
  })

  test('after acquire and release, no .stale or .tmp file is left in the folder', () => {
    const lockPath = join(dir, '.backlog.lock')
    acquireLock({ lockPath, command: 'caller' })
    releaseLock({ lockPath })

    expect(readdirSync(dir)).toEqual([])
  })

  test('the retry waits: with retryDelaysMs [30, 30, 30] against a held lock, the refusal comes after at least their sum', () => {
    const lockPath = join(dir, '.backlog.lock')
    acquireLock({ lockPath, command: 'first-holder' })
    const retryDelaysMs = [30, 30, 30]

    const start = Date.now()
    expect(() =>
      acquireLock({ lockPath, command: 'second-caller', retryDelaysMs })
    ).toThrowError(expect.objectContaining({ code: 'LOCKED' }))

    const totalDelayMs = retryDelaysMs.reduce((total, delay) => total + delay, 0)
    expect(Date.now() - start).toBeGreaterThanOrEqual(totalDelayMs)
  })

  test('two concurrent processes racing to break the same stale lock converge: exactly one breaks it and, once released, the other acquires cleanly, with no leftover .stale or .tmp files', async () => {
    const lockPath = join(dir, '.backlog.lock')
    const child = execa('node', ['-e', ''])
    const deadPid = child.pid
    await child
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: deadPid,
        host: hostname(),
        command: 'stale-holder',
        at: '2026-01-01T00:00:00.000Z'
      })
    )

    const lockModuleUrl = pathToFileURL(join(here, 'lock.js')).href
    const runAcquireThenRelease = (command) =>
      execa(
        'node',
        [
          '-e',
          `import('${lockModuleUrl}').then(({ acquireLock, releaseLock }) => {
            const lockPath = ${JSON.stringify(lockPath)}
            const { notes } = acquireLock({
              lockPath,
              command: '${command}',
              retryDelaysMs: [50, 50, 50]
            })
            releaseLock({ lockPath })
            process.stdout.write(JSON.stringify(notes))
          })`
        ],
        { reject: false }
      )

    const [racerOne, racerTwo] = await Promise.all([
      runAcquireThenRelease('racer-one'),
      runAcquireThenRelease('racer-two')
    ])

    expect(racerOne.exitCode).toBe(0)
    expect(racerTwo.exitCode).toBe(0)
    const notesByRacer = [racerOne, racerTwo].map((racer) =>
      JSON.parse(racer.stdout)
    )
    expect(notesByRacer.filter((notes) => notes.length === 1)).toHaveLength(1)
    expect(
      readdirSync(dir).filter(
        (name) => name.endsWith('.stale') || name.endsWith('.tmp')
      )
    ).toEqual([])
  })
})

describe('LOCK_RETRY_DELAYS_MS', () => {
  test('is three retries with back-off', () => {
    expect(LOCK_RETRY_DELAYS_MS).toEqual([100, 200, 400])
  })
})
