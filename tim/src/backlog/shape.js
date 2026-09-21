import { TimError } from '../errors.js'
import { findCycle } from './graph.js'

/**
 * Statuses a row may carry. `todo` is buildable; the rest are withheld, apart
 * from `done`, which is what a dependency waits for.
 */
export const STATUSES = [
  'todo',
  'blocked',
  'done',
  'deferred',
  'dropped',
  'rejected',
  'merged-into'
]

/**
 * The statuses the build never picks up. Named as a deny-list, so a status
 * nobody expected is picked up and seen rather than silently skipped
 * (build-orchestrator, "Buildability is status and dependencies").
 */
export const WITHHELD_STATUSES = new Set([
  'done',
  'deferred',
  'dropped',
  'blocked',
  'rejected',
  'merged-into'
])

/**
 * Fields that turn a requirement into a recipe. The build plans the how just
 * in time, so a row that carries one is refused.
 */
export const RECIPE_FIELDS = [
  'filesToTouch',
  'verification',
  'recipe',
  'implementorSkill'
]

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const isTextList = (value) => Array.isArray(value) && value.every(isText)

const nameOf = (row, index) =>
  row && isText(row.id) ? row.id : `increments[${index}]`

const rowProblems = (row, index, ids) => {
  const where = nameOf(row, index)
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return [`${where} is not an object.`]
  }
  const problems = []
  if (!isText(row.id)) problems.push(`${where} has no "id".`)
  if (!isText(row.title)) problems.push(`${where} has no "title".`)
  if (!isText(row.detail)) {
    problems.push(`${where} has no "detail" saying what and why.`)
  }
  if (!isTextList(row.acceptanceCriteria) || !row.acceptanceCriteria.length) {
    problems.push(
      `${where} needs "acceptanceCriteria": a list of at least one observable outcome.`
    )
  }
  if (!STATUSES.includes(row.status)) {
    problems.push(
      `${where} has status "${row.status}". Use one of: ${STATUSES.join(', ')}.`
    )
  }
  const hasQuestions =
    isTextList(row.openQuestions) && row.openQuestions.length > 0
  if (row.status === 'blocked' && !hasQuestions) {
    problems.push(
      `${where} is blocked but has no "openQuestions" saying what it waits for.`
    )
  }
  for (const field of RECIPE_FIELDS) {
    if (Object.hasOwn(row, field)) {
      problems.push(
        `${where} carries "${field}". A row says what, why and acceptance; the build plans the how.`
      )
    }
  }
  for (const field of ['repos', 'openQuestions']) {
    if (row[field] !== undefined && !isTextList(row[field])) {
      problems.push(`${where} "${field}" must be a list of text.`)
    }
  }
  if (row.sources !== undefined && !Array.isArray(row.sources)) {
    problems.push(`${where} "sources" must be a list.`)
  }
  const dependsOn = row.dependsOn ?? []
  if (!isTextList(dependsOn)) {
    problems.push(`${where} "dependsOn" must be a list of increment ids.`)
  } else {
    for (const target of dependsOn) {
      if (target === row.id) problems.push(`${where} depends on itself.`)
      else if (!ids.has(target)) {
        problems.push(
          `${where} depends on "${target}", which is not in the backlog.`
        )
      }
    }
  }
  return problems
}

const duplicateIds = (rows) => {
  const seen = new Set()
  const duplicates = new Set()
  for (const row of rows) {
    if (!isText(row?.id)) continue
    if (seen.has(row.id)) duplicates.add(row.id)
    seen.add(row.id)
  }
  return [...duplicates]
}

const dependenciesOf = (row) =>
  isTextList(row.dependsOn)
    ? row.dependsOn.filter((target) => target !== row.id)
    : []

const dependencyEdges = (rows) =>
  new Map(
    rows
      .filter((row) => isText(row?.id))
      .map((row) => [row.id, dependenciesOf(row)])
  )

const countByStatus = (rows) => {
  const counts = {}
  for (const row of rows) {
    const status = String(row?.status)
    counts[status] = (counts[status] ?? 0) + 1
  }
  return counts
}

/**
 * Every way a backlog departs from the one shape the distiller writes and the
 * build loop reads (docs/reference/backlog-shape.md).
 *
 * @param {unknown} backlog - The parsed backlog.json
 * @returns {{problems: string[], counts: Record<string, number>, total: number}}
 */
export const checkBacklog = (backlog) => {
  if (
    typeof backlog !== 'object' ||
    backlog === null ||
    !Array.isArray(backlog.increments)
  ) {
    return {
      problems: ['The backlog needs an "increments" list.'],
      counts: {},
      total: 0
    }
  }
  const rows = backlog.increments
  const ids = new Set(
    rows.filter((row) => isText(row?.id)).map((row) => row.id)
  )
  const problems = [
    ...duplicateIds(rows).map((id) => `${id} appears more than once.`),
    ...rows.flatMap((row, index) => rowProblems(row, index, ids))
  ]
  const cycle = findCycle(dependencyEdges(rows))
  if (cycle) problems.push(`A dependsOn cycle: ${cycle.join(' → ')}.`)
  return { problems, counts: countByStatus(rows), total: rows.length }
}

/**
 * The first row, in file order, that is not withheld and whose every
 * dependency is `done` — the same rule build-orchestrator's derive step
 * states.
 *
 * @param {{increments: object[]}} backlog
 * @returns {string|null}
 */
export const nextBuildable = (backlog) => {
  const rows = backlog.increments ?? []
  const done = new Set(
    rows.filter((row) => row.status === 'done').map((row) => row.id)
  )
  const next = rows.find(
    (row) =>
      !WITHHELD_STATUSES.has(row.status) &&
      (row.dependsOn ?? []).every((id) => done.has(id))
  )
  return next ? next.id : null
}

const appendTo = (current, entry) => {
  if (current === undefined || current === null) return [entry]
  if (Array.isArray(current)) return [...current, entry]
  return [current, entry]
}

const upsertPr = (prs, pr) => {
  const list = Array.isArray(prs) ? prs : []
  const index = list.findIndex((entry) => entry.url === pr.url)
  if (index === -1) return [...list, pr]
  return list.map((entry, at) => (at === index ? { ...entry, ...pr } : entry))
}

/**
 * Apply one set of build-state changes to one row, returning the new backlog
 * and what changed. Scalar fields are replaced; `note` and `openQuestion`
 * append; `pr` adds a pull request or merges into the one with the same url.
 *
 * @param {object} args
 * @param {{increments: object[]}} args.backlog
 * @param {string} args.id
 * @param {{status?: string, commit?: string, ticket?: string, branch?: string, note?: string, openQuestion?: string, pr?: {url: string}}} args.changes
 * @returns {{backlog: object, changed: Record<string, {before: unknown, after: unknown}>}}
 * @throws {TimError} NOT_FOUND when the id is not in the backlog
 */
export const setRowFields = ({ backlog, id, changes }) => {
  const index = backlog.increments.findIndex((row) => row.id === id)
  if (index === -1) {
    throw new TimError('NOT_FOUND', `Can't find ${id} in the backlog.`)
  }
  const before = backlog.increments[index]
  const after = { ...before }
  for (const field of ['status', 'commit', 'ticket', 'branch']) {
    if (changes[field] !== undefined) after[field] = changes[field]
  }
  if (changes.note !== undefined) {
    after.notes = appendTo(before.notes, changes.note)
  }
  if (changes.openQuestion !== undefined) {
    after.openQuestions = appendTo(before.openQuestions, changes.openQuestion)
  }
  if (changes.pr !== undefined) after.prs = upsertPr(before.prs, changes.pr)

  const changed = Object.fromEntries(
    Object.keys(after)
      .filter(
        (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
      )
      .map((key) => [key, { before: before[key], after: after[key] }])
  )
  const increments = backlog.increments.map((row, at) =>
    at === index ? after : row
  )
  return { backlog: { ...backlog, increments }, changed }
}
