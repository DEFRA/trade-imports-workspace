import { existsSync } from 'node:fs'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import {
  orEmpty,
  refuseFirstMissingOption,
  refuseMissingReviewId
} from '../review/items-ledger.js'
import { escapeCell, textOf } from '../review/items-table.js'
import { itemsFilePath } from '../review/paths.js'
import { styleDir } from './paths.js'

const itemRow = (item) => {
  const cells = [
    textOf(item.id),
    escapeCell(item.file),
    escapeCell(orEmpty(item.line)),
    escapeCell(orEmpty(item.rule)),
    escapeCell(orEmpty(item.category)),
    textOf(orEmpty(item.severity)),
    escapeCell(orEmpty(item.issue)),
    escapeCell(orEmpty(item.fix)),
    textOf(orEmpty(item.disposition)),
    textOf(orEmpty(item.status)),
    escapeCell(orEmpty(item.notes))
  ]
  return `| ${cells.join(' | ')} |`
}

/**
 * The style `## Items` markdown table: its heading, its separator and a
 * row per item. Pipes in a cell become `\|` and newlines become spaces,
 * except in the severity, disposition and status cells.
 *
 * @param {object[]} items
 * @returns {string}
 */
export const renderStyleItemsTable = (items) =>
  [
    '| # | File | Line | Rule | Category | Severity | Issue | Fix | Disposition | Status | Notes |',
    '|---|------|------|------|----------|----------|-------|-----|-------------|--------|-------|',
    ...items.map(itemRow)
  ].join('\n')

/**
 * A repo's style items as the `## Items` table.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @returns {{table: string}}
 * @throws {TimError} USAGE with no review id or repo; NOT_FOUND when the items file is missing
 */
export const renderStyleItems = ({ workspaceRoot, reviewId, repo }) => {
  refuseMissingReviewId(
    reviewId,
    'tim style items render <review-id> --repo REPO'
  )
  refuseFirstMissingOption([['repo', repo]])
  const itemsPath = itemsFilePath(styleDir(workspaceRoot, reviewId), repo)
  if (!existsSync(itemsPath)) {
    throw new TimError('NOT_FOUND', `Items file not found: ${itemsPath}`)
  }
  return { table: renderStyleItemsTable(readJsonFile(itemsPath).items) }
}
