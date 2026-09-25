import { TimError } from '../errors.js'
import { recipeFieldsOf, rowSchemaOf } from './backlog-schema.js'
import { findCycle } from './graph.js'
import { followRef } from './schema-ref.js'
import { validateJson } from './validate-json.js'

/**
 * The statuses the build never picks up. Named as a deny-list, so a status
 * nobody expected is picked up and seen rather than silently skipped
 * (requirements-pipeline BUILD.md, "Buildability is status and dependencies").
 * Every one is a status backlog.schema.json allows; a test holds them to it.
 */
export const WITHHELD_STATUSES = new Set([
  'done',
  'deferred',
  'dropped',
  'blocked',
  'rejected',
  'merged-into'
])

const NO_INCREMENTS = 'The backlog needs an "increments" list.'

const MISSING_FIELD_MESSAGES = {
  detail: 'has no "detail" saying what and why.',
  acceptanceCriteria:
    'needs "acceptanceCriteria": a list of at least one observable outcome.',
  dependsOn: 'has no "dependsOn". Give [] when it waits for nothing.'
}

const EMPTY_KEYWORDS = new Set(['pattern', 'minLength', 'minItems'])

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const isTextList = (value) => Array.isArray(value) && value.every(isText)

const nameOf = (row, index) =>
  row && isText(row.id) ? row.id : `increments[${index}]`

const quoted = (names) => names.map((name) => `"${name}"`).join(', ')

const listItemPhrase = (root, items) => {
  const resolved = followRef(root, items)
  if (resolved?.enum) return `items from ${resolved.enum.join(', ')}, each once`
  if (resolved?.type === 'string') return 'text'
  if (resolved?.type === 'object' && resolved.required?.length) {
    return `objects with ${quoted(resolved.required)}`
  }
  return 'items'
}

const expectationOf = (root, fieldSchema) => {
  const resolved = followRef(root, fieldSchema) ?? {}
  if (resolved.enum) return `one of: ${resolved.enum.join(', ')}`
  if (resolved.anyOf) {
    return resolved.anyOf
      .map((branch) => expectationOf(root, branch))
      .join(' or ')
  }
  if (resolved.type === 'array') {
    return resolved.items
      ? `a list of ${listItemPhrase(root, resolved.items)}`
      : 'a list'
  }
  if (resolved.type === 'object' && resolved.additionalProperties) {
    return `an object whose values are ${listItemPhrase(root, resolved.additionalProperties)}`
  }
  if (resolved.type === 'object') return 'an object'
  if (resolved.type === 'string') return 'text'
  if (resolved.type === 'boolean') return 'true or false'
  if (resolved.type === 'null') return 'null'
  return 'what backlog.schema.json says'
}

const fieldOf = (error, depth) =>
  error.keyword === 'required' && error.path.length === depth
    ? error.params.missingProperty
    : error.path[depth]

const groupByField = (errors, depth) => {
  const groups = new Map()
  for (const error of errors) {
    const field = fieldOf(error, depth)
    if (field === undefined) continue
    groups.set(field, [...(groups.get(field) ?? []), error])
  }
  return groups
}

const isAbsentOrEmpty = (errors, depth) =>
  errors.some(
    (error) =>
      (error.path.length === depth && error.keyword === 'required') ||
      (error.path.length === depth + 1 && EMPTY_KEYWORDS.has(error.keyword))
  )

const fieldProblem = ({ root, owner, where, value, field, errors, depth }) => {
  const enumError = errors.find(
    (error) => error.keyword === 'enum' && error.path.length === depth + 1
  )
  if (enumError) {
    return `${where} has ${field} ${JSON.stringify(value[field])}. Use one of: ${enumError.params.allowedValues.join(', ')}.`
  }
  if (isAbsentOrEmpty(errors, depth)) {
    return `${where} ${MISSING_FIELD_MESSAGES[field] ?? `has no "${field}".`}`
  }
  return `${where} "${field}" must be ${expectationOf(root, owner.properties?.[field])}.`
}

const conditionProblem = (rowSchema, where) => {
  const status = rowSchema.if?.properties?.status?.const
  const [field] = rowSchema.then?.required ?? []
  return `${where} is ${status} but has no "${field}" saying what it waits for.`
}

const recipeProblems = (root, row, where) =>
  recipeFieldsOf(root)
    .filter((field) => Object.hasOwn(row, field))
    .map(
      (field) =>
        `${where} carries "${field}". A row says what, why and acceptance; the build plans the how.`
    )

const ROW_DEPTH = 2

const rowSchemaProblems = ({ root, row, where, errors }) => {
  const rowSchema = rowSchemaOf(root)
  const own = errors.filter((error) => error.path.length === ROW_DEPTH)
  if (own.some((error) => error.keyword === 'type')) {
    return [`${where} is not an object.`]
  }
  const fieldProblems = [...groupByField(errors, ROW_DEPTH)].map(
    ([field, fieldErrors]) =>
      fieldProblem({
        root,
        owner: rowSchema,
        where,
        value: row,
        field,
        errors: fieldErrors,
        depth: ROW_DEPTH
      })
  )
  return [
    ...fieldProblems,
    ...(own.some((error) => error.keyword === 'not')
      ? recipeProblems(root, row, where)
      : []),
    ...(own.some((error) => error.keyword === 'if')
      ? [conditionProblem(rowSchema, where)]
      : [])
  ]
}

const dependencyProblem = (row, where, ids, target) => {
  if (target === row.id) return [`${where} depends on itself.`]
  if (ids.has(target)) return []
  return [`${where} depends on "${target}", which is not in the backlog.`]
}

const dependencyProblems = (row, where, ids) =>
  isTextList(row?.dependsOn)
    ? row.dependsOn.flatMap((target) =>
        dependencyProblem(row, where, ids, target)
      )
    : []

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const mergeKeyProblem = (row, where, repoKeys, key) => {
  if (isTextList(row.repos) && !row.repos.includes(key)) {
    return [`${where} merges into "${key}", which is not in its "repos".`]
  }
  if (repoKeys && !repoKeys.includes(key)) {
    return [
      `${where} merges into "${key}", which the backlog's "repos" does not name.`
    ]
  }
  return []
}

const mergeProblems = (row, where, repoKeys) =>
  isPlainObject(row?.merge)
    ? Object.keys(row.merge).flatMap((key) =>
        mergeKeyProblem(row, where, repoKeys, key)
      )
    : []

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

const lacksIncrementsList = (errors) =>
  errors.some(
    (error) =>
      (error.path.length === 0 &&
        (error.keyword === 'type' ||
          (error.keyword === 'required' &&
            error.params.missingProperty === 'increments'))) ||
      (error.path.length === 1 &&
        error.path[0] === 'increments' &&
        error.keyword === 'type')
  )

const isRowError = (error) =>
  error.path[0] === 'increments' && error.path.length >= ROW_DEPTH

const envelopeProblems = (root, backlog, errors) =>
  [
    ...groupByField(
      errors.filter((error) => !isRowError(error)),
      0
    )
  ].map(([field, fieldErrors]) =>
    fieldProblem({
      root,
      owner: root,
      where: 'The backlog',
      value: backlog,
      field,
      errors: fieldErrors,
      depth: 0
    })
  )

/**
 * Every way a backlog departs from backlog.schema.json, the one shape the
 * distiller writes and the build loop reads, plus the rules a schema cannot
 * hold: ids are unique, every dependency names another row in the backlog
 * without a cycle, and every repo a row merges into is one of its own repos
 * and one the envelope names.
 *
 * @param {unknown} backlog - The parsed backlog.json
 * @param {object} schema - The parsed backlog.schema.json
 * @returns {{problems: string[], counts: Record<string, number>, total: number}}
 * @throws {TimError} PARSE when the schema uses a keyword tim cannot check
 */
export const checkBacklog = (backlog, schema) => {
  const errors = validateJson(schema, backlog)
  if (lacksIncrementsList(errors)) {
    return { problems: [NO_INCREMENTS], counts: {}, total: 0 }
  }
  const rows = backlog.increments
  const ids = new Set(
    rows.filter((row) => isText(row?.id)).map((row) => row.id)
  )
  const repoKeys = isPlainObject(backlog.repos)
    ? Object.keys(backlog.repos)
    : null
  const rowProblems = (row, index) => {
    const where = nameOf(row, index)
    const rowErrors = errors.filter(
      (error) => isRowError(error) && error.path[1] === index
    )
    return [
      ...rowSchemaProblems({ root: schema, row, where, errors: rowErrors }),
      ...dependencyProblems(row, where, ids),
      ...mergeProblems(row, where, repoKeys)
    ]
  }
  const problems = [
    ...envelopeProblems(schema, backlog, errors),
    ...duplicateIds(rows).map((id) => `${id} appears more than once.`),
    ...rows.flatMap(rowProblems)
  ]
  const cycle = findCycle(dependencyEdges(rows))
  if (cycle) problems.push(`A dependsOn cycle: ${cycle.join(' → ')}.`)
  return { problems, counts: countByStatus(rows), total: rows.length }
}

/**
 * The first row, in file order, that is not withheld and whose every
 * dependency is `done` — the same rule the BUILD phase's derive step
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
