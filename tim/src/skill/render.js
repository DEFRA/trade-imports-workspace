import { existsSync } from 'node:fs'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { assertRunId, decisionsPath } from './paths.js'
import {
  isPlainObject,
  jqPath,
  jqRaw,
  jqToString,
  stringItems,
  withoutTrailingNewlines
} from './jq-text.js'

const NOT_ANSWERED = '(not answered)'

const shown = (value) =>
  withoutTrailingNewlines(value === null ? NOT_ANSWERED : jqToString(value))

const listOrEmpty = (value) => (value === null || value === false ? [] : value)

const joinedItem = (item) => {
  if (item === null) return ''
  if (isPlainObject(item) || Array.isArray(item)) {
    throw new TimError('PARSE', `Cannot join ${JSON.stringify(item)}`)
  }
  return jqToString(item)
}

const joinedWorkers = (workers) => {
  const list = listOrEmpty(workers)
  if (!Array.isArray(list)) {
    throw new TimError('PARSE', 'The fanout.workers answer must be a list.')
  }
  return list.map(joinedItem).join(', ')
}

const bulletList = (value, field, bullet) =>
  withoutTrailingNewlines(
    stringItems(listOrEmpty(value), field).map(bullet).join('\n')
  ) || NOT_ANSWERED

/**
 * The markdown view of a run's decisions: a heading, then the eight
 * interview answers, with `(not answered)` where one is missing.
 *
 * @param {object} decisions - A decisions.json document
 * @returns {string} The markdown, without a final newline
 * @throws {TimError} PARSE when an answer has a shape the view cannot show
 */
export const renderDecisions = (decisions) => {
  const answer = (...keys) => jqPath(decisions, ['answers', ...keys])
  const name = withoutTrailingNewlines(jqRaw(jqPath(decisions, ['name'])))
  const helpers = bulletList(
    answer('helpers'),
    'helpers',
    (helper) => `- ${helper}`
  )
  const triggers = bulletList(
    answer('triggers', 'phrases'),
    'triggers.phrases',
    (phrase) => `- "${phrase}"`
  )
  return `# ${name} skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

${shown(answer('purpose'))}

## 2. State shape

**Choice:** ${shown(answer('state_shape'))}
**Pattern reference:** docs/best-practices/skills/patterns.md §1

## 3. Dispatcher

**Choice:** ${shown(answer('dispatcher'))}
**Pattern reference:** patterns.md §2

## 4. Pre-baked context

**Choice:** ${shown(answer('prebake'))}
**Pattern reference:** patterns.md §3

## 5. Worker fan-out

**Choice:** ${shown(answer('fanout', 'enabled'))}
**Workers:** ${withoutTrailingNewlines(joinedWorkers(answer('fanout', 'workers')))}
**Pattern reference:** patterns.md §5

## 6. Walker

**Choice:** ${shown(answer('walker'))}
**Pattern reference:** patterns.md §7

## 7. Helpers introduced

${helpers}

## 8. Triggers

${triggers}

**Disambiguation:** ${shown(answer('triggers', 'disambiguation'))}`
}

/**
 * Reads a run's decisions.json and renders it with {@link renderDecisions}.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @returns {{markdown: string}}
 * @throws {TimError} USAGE for a missing or bad run id, NOT_FOUND with no decisions.json
 */
export const renderInterview = ({ workspaceRoot, runId }) => {
  if (!runId) throw new TimError('USAGE', 'Missing --run-id')
  assertRunId(runId)
  const path = decisionsPath(workspaceRoot, runId)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `No decisions.json at ${path}`)
  }
  return { markdown: renderDecisions(readJsonFile(path)) }
}
