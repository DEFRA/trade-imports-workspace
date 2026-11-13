import { existsSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { writeJsonAtomic } from '../review/store.js'
import { assertRunId, decisionsPath } from './paths.js'
import { isPlainObject, jsonTypeName } from './jq-text.js'

/**
 * The keys a dotted field names, split on `.`. One trailing empty key is
 * dropped, so `fanout.` names `fanout`.
 *
 * @param {string} field
 * @returns {string[]}
 */
export const fieldKeys = (field) => {
  const keys = field.split('.')
  return keys.at(-1) === '' && keys.length > 1 ? keys.slice(0, -1) : keys
}

const setAt = (container, [key, ...rest], value) => {
  if (
    container !== null &&
    container !== undefined &&
    !isPlainObject(container)
  ) {
    throw new TimError(
      'PARSE',
      `Cannot index ${jsonTypeName(container)} with string ("${key}")`
    )
  }
  const current = container ?? {}
  const next = rest.length === 0 ? value : setAt(current[key], rest, value)
  return { ...current, [key]: next }
}

/**
 * Decisions with one answer set at a dotted field under `answers`. Missing
 * objects along the way are created, existing keys keep their place and new
 * keys go last.
 *
 * @param {object} decisions
 * @param {string} field - For example `fanout.enabled`
 * @param {any} value
 * @returns {object} New decisions; the given ones are not changed
 * @throws {TimError} PARSE when a step of the field holds a value that is not an object
 */
export const setAnswer = (decisions, field, value) =>
  setAt(decisions, ['answers', ...fieldKeys(field)], value)

const answerFailedMessage = (valueText) =>
  `jq failed — invalid JSON value? VALUE=${valueText}`

const parseAnswerValue = (valueText) => {
  try {
    return JSON.parse(valueText)
  } catch {
    throw new TimError('PARSE', answerFailedMessage(valueText))
  }
}

const setAnswerOrExplain = (decisions, field, value, valueText) => {
  try {
    return setAnswer(decisions, field, value)
  } catch (error) {
    throw new TimError(
      'PARSE',
      `${error.message}\n${answerFailedMessage(valueText)}`
    )
  }
}

const requireGiven = (given) => {
  for (const [label, value] of Object.entries(given)) {
    if (!value) throw new TimError('USAGE', `Missing ${label}`)
  }
}

/**
 * Writes one interview answer into a run's decisions.json, through a temp
 * file and a rename.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.field] - A dotted path under `answers`
 * @param {string} [args.valueText] - The answer as JSON text
 * @returns {{decisions_path: string, field: string, value: any}}
 * @throws {TimError} USAGE for a missing or bad option, NOT_FOUND with no decisions.json, PARSE for a value that is not JSON or a field that cannot be set
 */
export const addAnswer = ({ workspaceRoot, runId, field, valueText }) => {
  requireGiven({ RUN_ID: runId, FIELD: field, VALUE: valueText })
  assertRunId(runId)
  const path = decisionsPath(workspaceRoot, runId)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `No decisions.json at ${path} — run tim skill start first`
    )
  }
  const value = parseAnswerValue(valueText)
  const updated = setAnswerOrExplain(
    readJsonFile(path),
    field,
    value,
    valueText
  )
  writeJsonAtomic(path, updated)
  return { decisions_path: path, field, value }
}
