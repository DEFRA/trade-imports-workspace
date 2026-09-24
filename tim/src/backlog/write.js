import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync
} from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'
import { TimError } from '../errors.js'
import {
  acquireLock,
  releaseLock,
  lockPathFor,
  LOCK_RETRY_DELAYS_MS
} from './lock.js'
import { findOperation, recordOperation } from './ops-log.js'
import { nonBlankLines } from './lines.js'
import { uniqueTempPathFor } from './tmp-path.js'

/**
 * The hex sha256 of a UTF-8 string. The version a writer checks its change
 * against, and the version it reports having written.
 *
 * @param {string} text
 * @returns {string}
 */
export const sha256Of = (text) =>
  createHash('sha256').update(text, 'utf8').digest('hex')

/**
 * Read a file's exact bytes and their sha256, or say it is absent. The sha
 * is of what was actually read, so it names the version a caller's change
 * is based on.
 *
 * @param {string} path
 * @returns {{exists: boolean, sha256: string|null, text: string|null}}
 */
export const readVersioned = (path) => {
  if (!existsSync(path)) return { exists: false, sha256: null, text: null }
  const text = readFileSync(path, 'utf8')
  return { exists: true, sha256: sha256Of(text), text }
}

/**
 * Parse a whole JSON document, naming the file when it will not parse. The
 * same wording as `io.js`'s `readJsonFile`, so existing PARSE assertions
 * still hold.
 *
 * @param {string} text
 * @param {string} path - Named in the error only
 * @returns {any}
 * @throws {TimError} PARSE
 */
export const parseJsonText = (text, path) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new TimError('PARSE', `${path} is not valid JSON: ${error.message}`)
  }
}

const parseJsonLines = (text, path) =>
  nonBlankLines(text).map(({ lineNumber, text: line }) => {
    try {
      return JSON.parse(line)
    } catch (error) {
      throw new TimError(
        'PARSE',
        `${path}:${lineNumber} is not valid JSON: ${error.message}`
      )
    }
  })

const parseBody = (body, format, path) =>
  format === 'jsonl' ? parseJsonLines(body, path) : parseJsonText(body, path)

/**
 * The one place a canonical write-safety target is replaced: a versioned
 * (optimistic-concurrency) rename under a short exclusive lock, with an
 * idempotent operation log and a validate-before-any-effect parse.
 *
 * The order (DESIGN 4.3): parse and validate the body first — nothing is
 * touched on a failure, not even the folder. Then create the folder, take
 * the lock, check for a replay (`opId`), check the version (`expectedSha`),
 * replace the file, record the operation, release the lock.
 *
 * `result` is the caller's own result shape, without `sha256`/`notes` — this
 * function fills those in (they are only known once the write has actually
 * happened) both on what it returns and on what it records for a replay to
 * return verbatim.
 *
 * @param {object} args
 * @param {string} args.path - The canonical file this write replaces
 * @param {string} args.body - The exact bytes to write
 * @param {'json'|'jsonl'} [args.format='json']
 * @param {(parsed: any) => void} args.validate - Throws when `body` would
 *   not be valid once written; required, so no writer can skip it
 * @param {string} [args.expectedSha] - The version this write is based on;
 *   when it no longer matches the file on disk, the write is refused
 * @param {string} args.command - Named in the lock and the operation log
 * @param {string} [args.opId] - An idempotency key
 * @param {string} [args.fingerprint] - What `opId` is checked against
 * @param {string} [args.opsLogPath] - Required when `opId` is given
 * @param {object} [args.result] - This write's result, without `sha256`/`notes`
 * @param {number[]} [args.retryDelaysMs]
 * @returns {{replayed: false, sha256: string, bytes: number, notes: string[]}
 *   | {replayed: true, result: object}}
 * @throws {TimError} USAGE (no `validate`), PARSE (invalid body), LOST_UPDATE,
 *   LOCKED
 */
export const commitWrite = ({
  path,
  body,
  format = 'json',
  validate,
  expectedSha,
  command,
  opId,
  fingerprint,
  opsLogPath,
  result,
  retryDelaysMs = LOCK_RETRY_DELAYS_MS
}) => {
  if (!validate) {
    throw new TimError('USAGE', 'commitWrite requires a validate function.')
  }
  if (opId && !opsLogPath) {
    throw new TimError(
      'USAGE',
      'commitWrite requires opsLogPath when opId is given.'
    )
  }

  const parsed = parseBody(body, format, path)
  validate(parsed)

  const dir = dirname(path)
  mkdirSync(dir, { recursive: true })
  const lockPath = lockPathFor(path)
  const { notes } = acquireLock({ lockPath, command, opId, retryDelaysMs })

  try {
    if (opId) {
      const found = findOperation({ opsLogPath, opId, fingerprint })
      if (found) return { replayed: true, result: found.result }
    }

    const current = readVersioned(path)
    if (expectedSha !== undefined && current.sha256 !== expectedSha) {
      throw new TimError(
        'LOST_UPDATE',
        `${path} changed since it was read. Nothing changed. Read the current version and try again.`
      )
    }

    const tmp = uniqueTempPathFor(path)
    writeFileSync(tmp, body, 'utf8')
    renameSync(tmp, path)

    const sha256 = sha256Of(body)
    if (opId) {
      recordOperation({
        opsLogPath,
        entry: {
          opId,
          fingerprint,
          command,
          path,
          sha256,
          result: { ...result, sha256, notes },
          at: new Date().toISOString()
        }
      })
    }

    return { replayed: false, sha256, bytes: Buffer.byteLength(body), notes }
  } finally {
    releaseLock({ lockPath })
  }
}

/**
 * The replay-check, read, commit, unwrap sequence every writer that
 * replays by op id runs through `commitWrite`.
 *
 * The op-id replay check runs first, before `args.afterReplayCheck` (e.g. a
 * check that reads other files) — a resumed workflow replaying a call must
 * get its original result back even when the world it read no longer
 * matches what it wrote (DESIGN D7: "Each writer calls findOperation first,
 * before reading anything else").
 *
 * @param {object} args
 * @param {string} args.opsLogPath
 * @param {string} [args.opId]
 * @param {string} [args.fingerprint]
 * @param {string} args.path - The target file this write replaces
 * @param {'json'|'jsonl'} args.format
 * @param {(parsed: any) => void} args.validate
 * @param {string} [args.expectSha]
 * @param {string} args.command
 * @param {() => void} [args.afterReplayCheck] - Runs once, after the op-id
 *   replay check and before the target is read
 * @param {(versioned: {exists: boolean, sha256: string|null, text: string|null}) => {body: string, resultStub: object}} args.buildBody
 * @param {number[]} [args.retryDelaysMs]
 * @returns {object} The replayed result, or the fresh one with `sha256`/`notes` filled in
 * @throws {TimError} USAGE, NOT_FOUND, PARSE, LOST_UPDATE, LOCKED
 */
export const commitWithReplay = ({
  opsLogPath,
  opId,
  fingerprint,
  path,
  format,
  validate,
  expectSha,
  command,
  afterReplayCheck,
  buildBody,
  retryDelaysMs
}) => {
  if (opId) {
    const found = findOperation({ opsLogPath, opId, fingerprint })
    if (found) return found.result
  }

  afterReplayCheck?.()

  const versioned = readVersioned(path)
  const { body, resultStub } = buildBody(versioned)
  const expectedSha = expectSha ?? versioned.sha256

  const commit = commitWrite({
    path,
    body,
    format,
    validate,
    expectedSha,
    command,
    opId,
    fingerprint,
    opsLogPath,
    result: resultStub,
    retryDelaysMs
  })

  if (commit.replayed) return commit.result
  return { ...resultStub, sha256: commit.sha256, notes: commit.notes }
}
