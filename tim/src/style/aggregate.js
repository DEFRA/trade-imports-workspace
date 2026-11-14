import {
  aggregatePerFileReviews,
  refuseMissingTicketOrRepo
} from '../review/aggregate.js'
import { renderStyleItemsTable } from './items-table.js'
import { styleDir } from './paths.js'

const STYLE_KIND = {
  suffix: '.style.json',
  severityColumns: [
    { key: 'fail', severity: 'FAIL', heading: 'FAIL' },
    { key: 'warn', severity: 'WARN', heading: 'WARN' }
  ],
  verdictLabels: {
    COMPLIANT: 'COMPLIANT',
    MINOR_ISSUES: 'MINOR ISSUES',
    NEEDS_WORK: 'NEEDS WORK'
  },
  renderTable: renderStyleItemsTable,
  missingFolderMessage: (folder) => `No file-reviews dir: ${folder}`
}

/**
 * A repo's per-file style reviews rolled up: each file's verdict, its FAIL
 * and WARN counts and its findings, in file order. With `writeItems` it
 * also starts the repo's items.<repo>.json afresh from the findings,
 * numbered from 1 with no disposition, status or notes, and stamps
 * `reconciled_at` on every reviewed file. The markdown gives the File
 * Analysis Summary, the `## Items` table or both.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.section] - file-summary, items or both
 * @param {boolean} [args.writeItems]
 * @param {boolean} [args.json] - Skip the markdown and the section check
 * @param {() => Date} [args.now]
 * @returns {{rollup: object[], markdown?: string}}
 * @throws {TimError} USAGE with no review id or repo, or, after any write, an unknown section; NOT_FOUND when the repo has no style files
 */
export const aggregateFileStyles = ({
  workspaceRoot,
  reviewId,
  repo,
  ...rest
}) => {
  refuseMissingTicketOrRepo(reviewId, repo)
  return aggregatePerFileReviews({
    ...rest,
    folder: styleDir(workspaceRoot, reviewId),
    reviewId,
    repo,
    kind: STYLE_KIND
  })
}
