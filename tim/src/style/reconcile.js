import { refuseMissingTicketOrRepo } from '../review/aggregate.js'
import {
  reconcilePerFileReviews,
  shownAsShell,
  shownAsShellOrEmpty
} from '../review/reconcile.js'
import { addStyleItem } from './items-ledger.js'
import { styleDir } from './paths.js'

const styleFindingOf = (filePath, todo) => ({
  file: filePath,
  line: shownAsShell(todo.line),
  rule: shownAsShell(todo.rule),
  category: shownAsShellOrEmpty(todo.category),
  severity: shownAsShell(todo.severity),
  issue: shownAsShell(todo.issue),
  fix: shownAsShell(todo.fix),
  bestPractice: shownAsShellOrEmpty(todo.best_practice)
})

/**
 * Folds a refresh's style findings into a repo's items.<repo>.json. Each
 * style file a reviewer ran since it was last reconciled (or every
 * reviewed one, with `force`) has each finding appended as a new item,
 * then gets `reconciled_at`. A dry run changes nothing. The spot-check
 * lists the items already fixed and done in the files refreshed.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {boolean} [args.dryRun]
 * @param {boolean} [args.force]
 * @param {() => Date} [args.now]
 * @returns {ReturnType<typeof reconcilePerFileReviews>}
 * @throws {TimError} USAGE with no review id or repo, or a finding the items file refuses; NOT_FOUND when the repo has no style files or no items file
 */
export const reconcileFileStyles = ({
  workspaceRoot,
  reviewId,
  repo,
  ...rest
}) => {
  refuseMissingTicketOrRepo(reviewId, repo)
  return reconcilePerFileReviews({
    ...rest,
    folder: styleDir(workspaceRoot, reviewId),
    reviewId,
    repo,
    kind: {
      suffix: '.style.json',
      aggregateCommand: 'tim style aggregate',
      findingOf: styleFindingOf,
      addItem: (finding) =>
        addStyleItem({ workspaceRoot, reviewId, repo, ...finding }).id
    }
  })
}
