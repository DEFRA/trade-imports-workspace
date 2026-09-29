import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { TimError } from '../errors.js'

/**
 * Where the DISTIL schemas live, relative to the workspace root: beside
 * backlog.schema.json, so the skill's agents and `tim distil` read one
 * definition of each file.
 */
export const DISTIL_SCHEMA_DIR =
  '.claude/skills/requirements-pipeline/references'

/**
 * The backlog row statuses the consolidator may rewrite on a re-distil. A
 * `blocked` row waits on a decision and has no code behind it, so a later
 * ruling can change it. Every other status is built or set aside, and stays
 * exactly as it is.
 */
export const EDITABLE_ROW_STATUSES = new Set(['todo', 'blocked'])

export const rowStatusOf = (row) => row.status ?? 'todo'

export const isEditableRow = (row) =>
  EDITABLE_ROW_STATUSES.has(rowStatusOf(row))

export const DISTIL_SCHEMA_FILES = {
  sources: 'sources.schema.json',
  extract: 'extract.schema.json',
  verify: 'verify.schema.json',
  requirements: 'requirements.schema.json',
  conflicts: 'conflicts.schema.json'
}

/**
 * Read every DISTIL schema from the workspace.
 *
 * @param {string} workspaceRoot
 * @returns {{sources: object, extract: object, verify: object, requirements: object, conflicts: object}}
 * @throws {TimError} NOT_FOUND when a schema is missing, PARSE when one is not JSON
 */
export const loadDistilSchemas = (workspaceRoot) =>
  Object.fromEntries(
    Object.entries(DISTIL_SCHEMA_FILES).map(([name, file]) => {
      const path = join(workspaceRoot, DISTIL_SCHEMA_DIR, file)
      if (!existsSync(path)) {
        throw new TimError(
          'NOT_FOUND',
          `Can't find the ${name} schema at ${path}. tim distil checks every ${name} file against it.`
        )
      }
      return [name, readJson(path)]
    })
  )

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `${path} is not valid JSON: ${error.message}`)
  }
}

/**
 * A source's file slug: its id with every run of characters other than a
 * letter, digit, dot or hyphen turned into one hyphen, so `repo:tests` is
 * `repo-tests` and `confluence:6518997274` is `confluence-6518997274`.
 *
 * @param {string} sourceId
 * @returns {string}
 */
export const slugOf = (sourceId) => sourceId.replace(/[^A-Za-z0-9.-]+/g, '-')

/**
 * The sha256, in hex, of a source's kind, locator and scope. The extract
 * records it; a different hash later means the source's scope changed and
 * the extract is stale.
 *
 * @param {{kind: string, locator: string, scope: string}} source
 * @returns {string}
 */
export const scopeHashOf = ({ kind, locator, scope }) =>
  createHash('sha256')
    .update(JSON.stringify([kind, locator, scope]))
    .digest('hex')

const sortedKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortedKeys)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortedKeys(value[key])])
  )
}

/**
 * A value as compact JSON with every object's keys sorted, so two values
 * that hold the same data give the same text whatever order they were
 * written in.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const canonicalJsonOf = (value) => JSON.stringify(sortedKeys(value))

/**
 * The sha256, in hex, of an extract's claims as canonical JSON. The merged
 * verify file records it, so a verification is tied to the extract it
 * judged: once a claim changes, even under the same id, the hash differs.
 *
 * @param {object[]} claims
 * @returns {string}
 */
export const claimsHashOf = (claims) =>
  createHash('sha256').update(canonicalJsonOf(claims)).digest('hex')

/**
 * Every DISTIL file's path inside one workarea folder.
 *
 * @param {string} workareaDir
 * @returns {{dir: string, sources: string, extractDir: string, verifyDir: string, requirements: string, conflicts: string, workingSet: string, backlog: string}}
 */
export const distilLayout = (workareaDir) => ({
  dir: workareaDir,
  sources: join(workareaDir, 'sources.json'),
  extractDir: join(workareaDir, 'distil', 'extract'),
  verifyDir: join(workareaDir, 'distil', 'verify'),
  requirements: join(workareaDir, 'distil', 'requirements.json'),
  conflicts: join(workareaDir, 'distil', 'conflicts.json'),
  workingSet: join(workareaDir, 'distil', 'working-set.json'),
  backlog: join(workareaDir, 'backlog.json')
})

export const extractPathOf = (layout, slug) =>
  join(layout.extractDir, `${slug}.json`)

export const verifyPathOf = (layout, slug) =>
  join(layout.verifyDir, `${slug}.json`)

export const verifyPartPathOf = (layout, slug, part) =>
  join(layout.verifyDir, `${slug}.part${part}.json`)

/**
 * A source's own working folder, for the extract agent's scratch files and
 * the trace CLI's extracted trace.
 *
 * @param {object} layout - From `distilLayout`
 * @param {string} slug
 * @returns {string}
 */
export const workFolderOf = (layout, slug) =>
  join(layout.extractDir, `${slug}.work`)

/**
 * Where `tim distil backlog-snapshot --save <tag>` keeps the backlog's rows.
 *
 * @param {object} layout - From `distilLayout`
 * @param {string} tag
 * @returns {string}
 */
export const backlogSnapshotPathOf = (layout, tag) =>
  join(layout.dir, 'distil', `backlog-snapshot.${tag}.json`)

const PART_FILE = /^(.+)\.part([1-9][0-9]*)\.json$/

const filesIn = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : [])

/**
 * A source's verify part files, in part-number order.
 *
 * @param {object} layout - From `distilLayout`
 * @param {string} slug
 * @returns {{part: number, path: string}[]}
 */
export const verifyPartsOf = (layout, slug) =>
  filesIn(layout.verifyDir)
    .map((name) => name.match(PART_FILE))
    .filter((match) => match && match[1] === slug)
    .map((match) => ({
      part: Number(match[2]),
      path: join(layout.verifyDir, match[0])
    }))
    .sort((left, right) => left.part - right.part)

/**
 * The extract and verify files whose slug no source in sources.json has:
 * left behind by a source that was renamed or removed.
 *
 * @param {object} layout - From `distilLayout`
 * @param {Set<string>} slugs - Every source's slug
 * @returns {string[]} Absolute paths
 */
export const orphanFilesOf = (layout, slugs) => {
  const slugOfFile = (name) =>
    name.match(PART_FILE)?.[1] ?? name.replace(/\.json$/, '')
  const orphansIn = (dir) =>
    filesIn(dir)
      .filter((name) => name.endsWith('.json') && !name.startsWith('.'))
      .filter((name) => !slugs.has(slugOfFile(name)))
      .map((name) => join(dir, name))
  return [...orphansIn(layout.extractDir), ...orphansIn(layout.verifyDir)]
}

/**
 * Read a JSON file that may be absent or broken, without throwing: the
 * status and check commands report either as a state, not a crash.
 *
 * @param {string} path
 * @returns {{exists: boolean, value?: unknown, error?: string}}
 */
export const readJsonLenient = (path) => {
  if (!existsSync(path)) return { exists: false }
  try {
    return { exists: true, value: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (error) {
    return { exists: true, error: `is not valid JSON: ${error.message}` }
  }
}
