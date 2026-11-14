import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import { itemsFilePath, reviewDir } from './paths.js'

const isAbsent = (value) =>
  value === null || value === undefined || value === false

const orEmpty = (value) => (isAbsent(value) ? '' : value)

/**
 * A value as text the way a string template shows it: a string as it is,
 * anything else as JSON, so a missing value reads `null`.
 *
 * @param {any} value
 * @returns {string}
 */
export const textOf = (value) =>
  typeof value === 'string' ? value : (JSON.stringify(value) ?? 'null')

/**
 * A value as a markdown table cell: as {@link textOf} shows it, with each
 * pipe as `\|` and each newline as a space.
 *
 * @param {any} value
 * @returns {string}
 */
export const escapeCell = (value) =>
  textOf(value).replaceAll('|', '\\|').replaceAll('\n', ' ')

const trimWhitespace = (text) => text.replace(/^\s+/, '').replace(/\s+$/, '')

const ONE_WAY_LABEL = 'One way:'

const splitFix = (fix) => {
  const parts = textOf(orEmpty(fix)).split(ONE_WAY_LABEL)
  return {
    must: trimWhitespace(trimWhitespace(parts[0]).replace(/^Must:\s*/, '')),
    oneWay: trimWhitespace(parts.slice(1).join(ONE_WAY_LABEL))
  }
}

const TABLE_HEADING = [
  '| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |',
  '|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|'
]

const itemRow = (item) => {
  const { must, oneWay } = splitFix(item.fix)
  const cells = [
    textOf(item.id),
    escapeCell(item.file),
    escapeCell(orEmpty(item.line)),
    textOf(orEmpty(item.severity)),
    escapeCell(orEmpty(item.category)),
    escapeCell(orEmpty(item.issue)),
    escapeCell(must),
    escapeCell(oneWay),
    textOf(orEmpty(item.disposition)),
    textOf(orEmpty(item.status)),
    escapeCell(orEmpty(item.notes))
  ]
  return `| ${cells.join(' | ')} |`
}

/**
 * The `## Items` markdown table: its heading, its separator and a row per
 * item. A fix's `Must:` and `One way:` parts get a column each, and a fix
 * with no labels is all Must. Pipes in a cell become `\|` and newlines
 * become spaces, except in the severity, disposition and status cells.
 *
 * @param {object[]} items
 * @returns {string}
 */
export const renderItemsTable = (items) =>
  [...TABLE_HEADING, ...items.map(itemRow)].join('\n')

const TABLE_START = /^\| # \| File \|/
const PASTE_MARKER = /^<!-- .*(render-items\.sh|tim review items render)/
const VERDICT_HEADING = /^## Repository Verdict/

const linesOf = (text) => {
  const lines = text.split('\n')
  return lines.at(-1) === '' ? lines.slice(0, -1) : lines
}

/**
 * The summary with the table in place: over the items table already
 * there, else over the comment that names the renderer, else before the
 * `## Repository Verdict` heading with a blank line between them. Null
 * when the summary has none of the three.
 *
 * @param {string} summary - A review.<repo>.md
 * @param {string} table - From {@link renderItemsTable}
 * @returns {string | null}
 */
export const summaryWithTable = (summary, table) => {
  const tableLines = table.split('\n')
  const written = []
  let placed = false
  let inTable = false
  let inComment = false
  for (const line of linesOf(summary)) {
    if (inTable && line.startsWith('|')) continue
    inTable = false
    if (!placed && TABLE_START.test(line)) {
      written.push(...tableLines)
      placed = true
      inTable = true
      continue
    }
    if (!placed && PASTE_MARKER.test(line)) inComment = true
    if (inComment) {
      if (line.includes('-->')) {
        inComment = false
        written.push(...tableLines)
        placed = true
      }
      continue
    }
    if (!placed && VERDICT_HEADING.test(line)) {
      written.push(...tableLines, '')
      placed = true
    }
    written.push(line)
  }
  return placed ? `${written.join('\n')}\n` : null
}

const usage = (message) => new TimError('USAGE', message)

const readItems = (itemsPath) => {
  if (!existsSync(itemsPath)) {
    throw new TimError('NOT_FOUND', `Items file not found: ${itemsPath}`)
  }
  return readJsonFile(itemsPath).items
}

/**
 * A repo's items as the `## Items` table, or, with `write`, the table put
 * into the repo's review.<repo>.md by {@link summaryWithTable}.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {boolean} [args.write]
 * @returns {{table: string, written?: {path: string, items: number}}}
 * @throws {TimError} USAGE with no review id or repo; NOT_FOUND when the items file or summary is missing, or the summary has nowhere for the table
 */
export const renderReviewItems = ({ workspaceRoot, reviewId, repo, write }) => {
  if (!reviewId) {
    throw usage(
      'Usage: tim review items render <review-id> --repo REPO [--write]'
    )
  }
  if (!repo) throw usage('--repo required')
  const folder = reviewDir(workspaceRoot, reviewId)
  const items = readItems(itemsFilePath(folder, repo))
  const table = renderItemsTable(items)
  if (!write) return { table }
  const summaryPath = join(folder, `review.${repo}.md`)
  if (!existsSync(summaryPath)) {
    throw new TimError('NOT_FOUND', `Review summary not found: ${summaryPath}`)
  }
  const summary = summaryWithTable(readFileSync(summaryPath, 'utf8'), table)
  if (summary === null) {
    throw new TimError(
      'NOT_FOUND',
      `No items table, render-items.sh comment or "## Repository Verdict" heading in ${summaryPath}`
    )
  }
  writeFileSync(summaryPath, summary)
  return { table, written: { path: summaryPath, items: items.length } }
}

/**
 * @param {ReturnType<typeof renderReviewItems>} rendered
 * @returns {string}
 */
export const renderRenderedItemsText = ({ table, written }) =>
  written ? `Wrote ${written.items} items to ${written.path}` : table
