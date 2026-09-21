import { existsSync } from 'node:fs'
import { readJsonFile } from './io.js'
import { TimError } from '../errors.js'
import { readVersioned, parseJsonText, commitWrite } from './write.js'
import { findOperation, fingerprintOf } from './ops-log.js'
import {
  validateState,
  validateJournalEntry,
  SETTABLE_FIELDS
} from './state-schema.js'

const REQUIREMENTS_V2 = 'requirements-v2'
const SET_FIELD_COMMAND = 'backlog state set'
const NOTE_COMMAND = 'backlog state note'

const isStarted = (row) => {
  const attempts = row?.attempts
  if (Array.isArray(attempts)) return attempts.length > 0
  if (typeof attempts === 'number') return attempts >= 1
  return false
}

/**
 * Returns the ids of every increment that `build/state.json` records at
 * least one build attempt against.
 *
 * Reads the one field this increment pins — `increments[<id>].attempts`, an
 * array or a number — and nothing else.
 *
 * @param {string} statePath
 * @returns {Set<string>}
 * @throws {TimError} PARSE, naming the path, when the file is not valid JSON
 */
export const startedIncrementIds = (statePath) => {
  if (!existsSync(statePath)) return new Set()
  const state = readJsonFile(statePath)
  const increments = state.increments ?? {}
  return new Set(
    Object.entries(increments)
      .filter(([, row]) => isStarted(row))
      .map(([id]) => id)
  )
}

const requireRequirementsV2Profile = (profile) => {
  if (profile.profileKey === REQUIREMENTS_V2) return
  throw new TimError(
    'USAGE',
    `"${profile.id}" is a parity-v1 programme. Run state is only kept for requirements-v2 programmes.`
  )
}

const requireKnownIncrementId = ({ profile, id }) => {
  if (!existsSync(profile.paths.backlog)) {
    throw new TimError(
      'NOT_FOUND',
      `"${id}" is not in ${profile.id}'s backlog.json — it has no backlog yet. Run \`tim backlog ingest ${profile.id}\` first.`
    )
  }
  const backlog = readJsonFile(profile.paths.backlog)
  const known = new Set((backlog.increments ?? []).map((row) => row.id))
  if (!known.has(id)) {
    throw new TimError(
      'NOT_FOUND',
      `"${id}" is not in ${profile.id}'s backlog.json.`
    )
  }
}

/**
 * The replay-check, read, commit, unwrap sequence every requirements-v2
 * `build/state.json` / `build/journal.jsonl` writer runs through
 * `write.js`'s `commitWrite` — written once so `setIncrementField` and
 * `appendJournalNote` cannot drift apart.
 *
 * The op-id replay check runs first, before `args.afterReplayCheck` (e.g.
 * `requireKnownIncrementId`, which reads `backlog.json`) — a resumed
 * workflow replaying a call must get its original result back even when
 * the world it read no longer matches what it wrote (DESIGN D7: "Each
 * writer calls findOperation first, before reading anything else").
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
const commitWithReplay = ({
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

/**
 * Set one field on one increment's `build/state.json` entry, through the
 * shared write-safety core (`write.js`).
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.id
 * @param {string} args.field - One of `SETTABLE_FIELDS`
 * @param {any} args.value
 * @param {string} [args.opId]
 * @param {string} [args.expectSha]
 * @param {string} [args.command='backlog state set']
 * @param {number[]} [args.retryDelaysMs]
 * @returns {{path: string, id: string, field: string, before: any, after: any, sha256: string, notes: string[]}}
 * @throws {TimError} USAGE, NOT_FOUND, PARSE, LOST_UPDATE, LOCKED
 */
export const setIncrementField = ({
  profile,
  id,
  field,
  value,
  opId,
  expectSha,
  command = SET_FIELD_COMMAND,
  retryDelaysMs
}) => {
  if (!SETTABLE_FIELDS.includes(field)) {
    throw new TimError(
      'USAGE',
      `"${field}" is not a field state set can write. Allowed: ${SETTABLE_FIELDS.join(', ')}.`
    )
  }
  requireRequirementsV2Profile(profile)

  const statePath = profile.paths.state
  const opsLogPath = profile.paths.opsLog
  const fingerprint = opId
    ? fingerprintOf({
        verb: SET_FIELD_COMMAND,
        programme: profile.id,
        id,
        field,
        value
      })
    : undefined

  return commitWithReplay({
    opsLogPath,
    opId,
    fingerprint,
    path: statePath,
    format: 'json',
    validate: (parsed) => validateState(parsed, statePath),
    expectSha,
    command,
    afterReplayCheck: () => requireKnownIncrementId({ profile, id }),
    buildBody: (versioned) => {
      const state = versioned.exists
        ? parseJsonText(versioned.text, statePath)
        : { increments: {} }
      const before = state.increments?.[id]?.[field]
      const nextState = {
        schemaVersion: 1,
        ...state,
        increments: {
          ...(state.increments ?? {}),
          [id]: { ...(state.increments?.[id] ?? {}), [field]: value }
        }
      }
      return {
        body: `${JSON.stringify(nextState, null, 2)}\n`,
        resultStub: { path: statePath, id, field, before, after: value }
      }
    },
    retryDelaysMs
  })
}

/**
 * Append one entry to `build/journal.jsonl`, through the shared
 * write-safety core (`write.js`). The append-only ledger DESIGN gives the
 * `state` command (D10): earlier lines are never rewritten.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.id
 * @param {string} args.note
 * @param {string} [args.stage]
 * @param {string} [args.by]
 * @param {string} [args.opId]
 * @param {string} [args.expectSha]
 * @param {string} [args.command='backlog state note']
 * @param {number[]} [args.retryDelaysMs]
 * @returns {{path: string, entry: object, sha256: string, notes: string[]}}
 * @throws {TimError} USAGE, NOT_FOUND, PARSE, LOST_UPDATE, LOCKED
 */
export const appendJournalNote = ({
  profile,
  id,
  note,
  stage,
  by,
  opId,
  expectSha,
  command = NOTE_COMMAND,
  retryDelaysMs
}) => {
  requireRequirementsV2Profile(profile)

  const journalPath = profile.paths.journal
  const opsLogPath = profile.paths.opsLog
  const fingerprint = opId
    ? fingerprintOf({
        verb: NOTE_COMMAND,
        programme: profile.id,
        id,
        stage,
        by,
        note
      })
    : undefined

  return commitWithReplay({
    opsLogPath,
    opId,
    fingerprint,
    path: journalPath,
    format: 'jsonl',
    validate: (lines) =>
      lines.forEach((line) => validateJournalEntry(line, journalPath)),
    expectSha,
    command,
    afterReplayCheck: () => requireKnownIncrementId({ profile, id }),
    buildBody: (versioned) => {
      const entry = { at: new Date().toISOString(), id, note, stage, by }
      return {
        body: `${versioned.exists ? versioned.text : ''}${JSON.stringify(entry)}\n`,
        resultStub: { path: journalPath, entry }
      }
    },
    retryDelaysMs
  })
}
