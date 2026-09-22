import { writeFileSync, linkSync, unlinkSync, readFileSync } from 'node:fs'
import { hostname } from 'node:os'
import { dirname, join, basename } from 'node:path'
import { TimError } from '../errors.js'
import { uniqueTempPathFor } from './tmp-path.js'

const ERR_EEXIST = 'EEXIST'
const ERR_ENOENT = 'ENOENT'
const GUARD_SUFFIX = '.break'

/**
 * How many guards deep a stale file is broken: the lock's guard, and that
 * guard's own guard. A stale guard at the deepest level means two breakers
 * crashed in a row; it is refused with a message rather than broken.
 */
const MAX_GUARD_DEPTH = 2

/**
 * Three retries with back-off (DESIGN 4.3: "a committed tool polling, not
 * an agent sleeping"), before a held lock is refused.
 */
export const LOCK_RETRY_DELAYS_MS = [100, 200, 400]

/** The exact bytes this process wrote for each lock it holds, by lock path. */
const heldLocks = new Map()

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

const guardPathFor = (path) => `${path}${GUARD_SUFFIX}`

const readRaw = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

const parseContent = (raw) => {
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const readLockContent = (path) => parseContent(readRaw(path))

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

/**
 * Create `path` holding `raw`, only if nothing is there. A hard link from a
 * fully written temp file, so no reader ever sees a half-written file.
 *
 * @returns {boolean} `false` when something was already at `path`
 */
const createExclusively = (path, raw) => {
  const tmp = uniqueTempPathFor(path)
  writeFileSync(tmp, raw, 'utf8')
  try {
    linkSync(tmp, path)
    return true
  } catch (error) {
    if (error.code !== ERR_EEXIST) throw error
    return false
  } finally {
    unlinkSync(tmp)
  }
}

const guardContent = () =>
  JSON.stringify({
    pid: process.pid,
    host: hostname(),
    at: new Date().toISOString()
  })

const takeGuard = (guardPath, depth) => {
  if (createExclusively(guardPath, guardContent())) return true
  if (depth >= MAX_GUARD_DEPTH) return false
  const guardRaw = readRaw(guardPath)
  if (!isStale(parseContent(guardRaw))) return false
  const cleared = removeIfUnchanged({
    path: guardPath,
    expectedRaw: guardRaw,
    depth: depth + 1
  })
  return cleared && createExclusively(guardPath, guardContent())
}

/**
 * Delete `path` only if it still holds exactly `expectedRaw`, deciding
 * under an exclusive guard file (`<path>.break`). Call it only with content
 * already proven stale: a stale file's holder is dead and never removes it,
 * and only a guard holder removes a stale file, so once the guarded re-read
 * matches, nothing else can change `path` before the unlink. A guard left by
 * a dead breaker is itself cleared the same way, one level deeper.
 *
 * Never moves or deletes anything it has not proven to be `expectedRaw`.
 *
 * @param {object} args
 * @param {string} args.path
 * @param {string} args.expectedRaw - The stale bytes read from `path` earlier
 * @param {number} [args.depth=1] - Guard level; callers leave it out
 * @returns {boolean} `true` when this call deleted `path`; `false` when the
 *   guard is held elsewhere or `path` no longer holds `expectedRaw`
 */
export const removeIfUnchanged = ({ path, expectedRaw, depth = 1 }) => {
  const guardPath = guardPathFor(path)
  if (!takeGuard(guardPath, depth)) return false
  try {
    if (readRaw(path) !== expectedRaw) return false
    unlinkSync(path)
    return true
  } finally {
    unlinkSync(guardPath)
  }
}

const brokeNote = (lockPath, stale) =>
  `Broke a stale lock on ${lockPath} left by pid ${stale.pid} (${stale.command}) at ${stale.at}.`

const attemptAcquire = ({ lockPath, raw }) => {
  if (createExclusively(lockPath, raw)) return { acquired: true, notes: [] }
  const existingRaw = readRaw(lockPath)
  const existing = parseContent(existingRaw)
  if (!isStale(existing)) return { acquired: false, notes: [] }
  if (!removeIfUnchanged({ path: lockPath, expectedRaw: existingRaw })) {
    return { acquired: false, notes: [] }
  }
  return {
    acquired: createExclusively(lockPath, raw),
    notes: [brokeNote(lockPath, existing)]
  }
}

const lockAndGuardPathsFor = (lockPath) =>
  Array.from(
    { length: MAX_GUARD_DEPTH + 1 },
    (_, depth) => `${lockPath}${GUARD_SUFFIX.repeat(depth)}`
  )

const isStuckBehindDeadGuards = (lockPath) =>
  lockAndGuardPathsFor(lockPath).every((path) => isStale(readLockContent(path)))

const lockedMessage = (lockPath) => {
  if (isStuckBehindDeadGuards(lockPath)) {
    const stuckGuardPath = lockAndGuardPathsFor(lockPath).at(-1)
    return `${lockPath} cannot be unlocked: a process stopped while clearing a stale lock and left ${stuckGuardPath}. Nothing changed. Delete ${stuckGuardPath} and run the same command again.`
  }
  const existing = readLockContent(lockPath)
  return existing
    ? `${lockPath} is held by pid ${existing.pid} on ${existing.host} (${existing.command}) since ${existing.at}. Nothing changed. Run the same command again.`
    : `${lockPath} is locked. Nothing changed. Run the same command again.`
}

/**
 * Take the write-safety lock for one target, waiting out a live holder and
 * breaking a stale one, race-safely (DESIGN 4.3). A live lock is only ever
 * read, never moved; a stale one is broken under a guard (see
 * {@link removeIfUnchanged}), so exactly one racer breaks it.
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
  const raw = JSON.stringify({
    pid: process.pid,
    host: hostname(),
    command,
    opId,
    at: new Date().toISOString()
  })

  let notes = []
  for (const delayMs of [0, ...retryDelaysMs]) {
    if (delayMs > 0) sleepMs(delayMs)
    const result = attemptAcquire({ lockPath, raw })
    notes = [...notes, ...result.notes]
    if (result.acquired) {
      heldLocks.set(lockPath, raw)
      return { notes }
    }
  }

  throw new TimError('LOCKED', lockedMessage(lockPath))
}

/**
 * Release the lock this process took on `lockPath`. Deletes it only while
 * it still holds the exact content this process wrote; a lock this process
 * does not hold is left alone. Idempotent: releasing twice, or releasing an
 * already-gone lock, is not an error.
 *
 * @param {object} args
 * @param {string} args.lockPath
 */
export const releaseLock = ({ lockPath }) => {
  const heldRaw = heldLocks.get(lockPath)
  heldLocks.delete(lockPath)
  if (heldRaw === undefined || readRaw(lockPath) !== heldRaw) return
  try {
    unlinkSync(lockPath)
  } catch (error) {
    if (error.code !== ERR_ENOENT) throw error
  }
}
