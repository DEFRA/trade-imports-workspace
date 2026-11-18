import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../../errors.js'
import { reviewDir } from '../paths.js'
import { rawFolder, searchCommand } from './gh-output.js'

/**
 * Whether a ticket's review starts as a refresh, because it already has
 * `review-index.md`, or fresh.
 *
 * @param {{workspaceRoot: string, ticket?: string}} args
 * @returns {'REFRESH' | 'FRESH'}
 * @throws {TimError} USAGE without a ticket
 */
export const reviewStartMode = ({ workspaceRoot, ticket }) => {
  if (!ticket) {
    throw new TimError(
      'USAGE',
      'Usage: tim review start EUDPA-XXXXX | --local <repo> <branch> [--files F1,F2,...]'
    )
  }
  return existsSync(join(reviewDir(workspaceRoot, ticket), 'review-index.md'))
    ? 'REFRESH'
    : 'FRESH'
}

/**
 * Makes a fresh review's raw folder ready for what `gh` finds, and writes
 * nothing else.
 *
 * @param {{workspaceRoot: string, ticket: string}} args
 * @returns {{folder: string, rawFolder: string, searchCommand: string}}
 */
export const startFreshReview = ({ workspaceRoot, ticket }) => {
  const folder = reviewDir(workspaceRoot, ticket)
  mkdirSync(rawFolder(folder), { recursive: true })
  return {
    folder,
    rawFolder: rawFolder(folder),
    searchCommand: searchCommand({ reviewFolder: folder, ticket })
  }
}

/**
 * What `tim review start` prints for a fresh review after its mode line.
 *
 * @param {ReturnType<typeof startFreshReview>} started
 * @returns {string}
 */
export const freshStartText = ({
  folder,
  rawFolder: raw,
  searchCommand: search
}) =>
  [
    `Review folder: ${folder}`,
    `Raw folder: ${raw}`,
    '',
    'Save the pull requests into the raw folder with gh, then run tim review prepare (see the review skill, Step 1):',
    `  ${search}`
  ].join('\n')
