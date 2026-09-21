import {
  writeFileSync,
  linkSync,
  unlinkSync,
  readFileSync,
  renameSync
} from 'node:fs'
import { hostname } from 'node:os'
import { dirname, join, basename } from 'node:path'
import { TimError } from '../errors.js'
import { uniqueSuffix, uniqueTempPathFor } from './tmp-path.js'

const ERR_EEXIST = 'EEXIST'

/**
 * Three retries with back-off (DESIGN 4.3: "a committed tool polling, not
 * an agent sleeping"), before a held lock is refused.
 */
export const LOCK_RETRY_DELAYS_MS = [100, 200, 400]

const stripLockSuffix = (name) => name.replace(/\.jsonl?$/, '')

/**
 * The write-safety lock path derived from a target file — `.backlog.lock`,
 * `.state.lock`, `.journal.lock`, alongside the target, with no extra
 * configuration per target.
 *
 * @param {string} path
 * @returns {string}
 */
export const lockPathFor = (path) =>
  join(dirname(path), `.${stripLockSuffix(basename(path))}.lock`)

const readLockContent = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const isProcessAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // ESRCH: no such process — dead. Anything else (EPERM, say) means tim
    // cannot prove the process gone, so it is treated as alive.
    return error.code !== 'ESRCH'
  }
}

const isStale = (content) =>
  Boolean(content) &&
  content.host === hostname() &&
  !isProcessAlive(content.pid)

const sleepMs = (ms) => {
  const view = new Int32Array(new SharedArrayBuffer(4))
  Atomics.wait(view, 0, 0, ms)
}

const writeLockAtomically = (lockPath, content) => {
  const tmp = uniqueTempPathFor(lockPath)
  writeFileSync(tmp, JSON.stringify(content), 'utf8')
  try {
    linkSync(tmp, lockPath)
  } finally {
    unlinkSync(tmp)
  }
}

/**
 * Put a fresh lock back where a renamed stale copy was, unless a third
 * process has already claimed the path while it was being inspected — a
 * race `linkSync` reports as `EEXIST`. Either way the renamed copy is gone
 * afterwards, and the lock at `lockPath` is left as live.
 */
const restoreOrDropStaleCopy = (lockPath, stalePath) => {
  try {
    linkSync(stalePath, lockPath)
  } catch (error) {
    if (error.code !== ERR_EEXIST) throw error
  } finally {
    unlinkSync(stalePath)
  }
}

/**
 * Break a stale lock, race-safely: rename it aside, confirm nobody replaced
 * it in the gap, then clear it. Returns a note describing what was broken,
 * or `null` when the lock turned out to be live after all (raced) — either
 * because another process replaced it after the rename, or because another
 * process broke it first and `lockPath` was already gone by the time this
 * one tried to rename it.
 *
 * @returns {string|null}
 */
const breakStaleLock = (lockPath, content) => {
  const stalePath = `${lockPath}.${uniqueSuffix()}.stale`
  try {
    renameSync(lockPath, stalePath)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  const reread = readLockContent(stalePath)
  const stillTheSame =
    reread && JSON.stringify(reread) === JSON.stringify(content)
  if (!stillTheSame) {
    restoreOrDropStaleCopy(lockPath, stalePath)
    return null
  }
  unlinkSync(stalePath)
  return `Broke a stale lock on ${lockPath} left by pid ${content.pid} (${content.command}) at ${content.at}.`
}

const attemptAcquire = ({ lockPath, content }) => {
  try {
    writeLockAtomically(lockPath, content)
    return { acquired: true, notes: [] }
  } catch (error) {
    if (error.code !== ERR_EEXIST) throw error
    const existing = readLockContent(lockPath)
    if (!isStale(existing)) return { acquired: false, notes: [] }
    const note = breakStaleLock(lockPath, existing)
    if (!note) return { acquired: false, notes: [] }
    try {
      writeLockAtomically(lockPath, content)
      return { acquired: true, notes: [note] }
    } catch (retryError) {
      if (retryError.code !== ERR_EEXIST) throw retryError
      return { acquired: false, notes: [note] }
    }
  }
}

const lockedMessage = (lockPath, existing) =>
  existing
    ? `${lockPath} is held by pid ${existing.pid} on ${existing.host} (${existing.command}) since ${existing.at}. Nothing changed. Run the same command again.`
    : `${lockPath} is locked. Nothing changed. Run the same command again.`

/**
 * Take the write-safety lock for one target, waiting out a live holder and
 * breaking a stale one, race-safely (DESIGN 4.3).
 *
 * @param {object} args
 * @param {string} args.lockPath
 * @param {string} args.command - Recorded in the lock, for a later holder's message
 * @param {string} [args.opId]
 * @param {number[]} [args.retryDelaysMs=LOCK_RETRY_DELAYS_MS]
 * @returns {{notes: string[]}}
 * @throws {TimError} LOCKED, after every retry is exhausted
 */
export const acquireLock = ({
  lockPath,
  command,
  opId,
  retryDelaysMs = LOCK_RETRY_DELAYS_MS
}) => {
  const content = {
    pid: process.pid,
    host: hostname(),
    command,
    opId,
    at: new Date().toISOString()
  }

  let result = attemptAcquire({ lockPath, content })
  if (result.acquired) return { notes: result.notes }
  let notes = [...result.notes]

  for (const delayMs of retryDelaysMs) {
    sleepMs(delayMs)
    result = attemptAcquire({ lockPath, content })
    notes = [...notes, ...result.notes]
    if (result.acquired) return { notes }
  }

  throw new TimError(
    'LOCKED',
    lockedMessage(lockPath, readLockContent(lockPath))
  )
}

/**
 * Release a lock this process holds. Idempotent: releasing an already-gone
 * lock is not an error.
 *
 * @param {object} args
 * @param {string} args.lockPath
 */
export const releaseLock = ({ lockPath }) => {
  try {
    unlinkSync(lockPath)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
