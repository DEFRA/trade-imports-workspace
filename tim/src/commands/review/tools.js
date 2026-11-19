import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { aggregateFileReviews } from '../../review/aggregate.js'
import {
  reconcileFileReviews,
  reconciledJson,
  renderReconciledText
} from '../../review/reconcile.js'
import {
  renderConsistencyText,
  renderFileCoverageText,
  renderStyleCoverageText,
  verifiedJson,
  verifyConsistency,
  verifyFileCoverage,
  verifyStyleCoverage
} from '../../review/verify.js'
import { makeRunAction } from '../_run-action.js'

/**
 * A review command's action: `run` gets the parsed options, the workspace
 * root and the review id; `toJson` shapes the result --json gives.
 *
 * @param {object} args
 * @param {(options: object) => any} args.run
 * @param {(result: any) => string | null} args.renderText
 * @param {(result: any) => any} [args.toJson]
 * @param {string} args.timVersion
 * @returns {Function}
 */
export const reviewAction = ({ run, renderText, toJson, timVersion }) =>
  makeRunAction({
    parseOptions: (opts) => ({
      ...opts,
      workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
    }),
    run: ({ args: [reviewId] }, parsed) => {
      const result = run({ ...parsed, reviewId })
      return parsed.json && toJson ? toJson(result) : result
    },
    renderText,
    exitCodeForError: () => ERROR,
    timVersion
  })

const withReviewId = (command) =>
  command.argument('[review-id]', 'A ticket key, or local/<repo>/<branch>')

const registerAggregate = (review, { timVersion }) =>
  withReviewId(review.command('aggregate'))
    .description(
      "Roll up a repo's per-file reviews: the File Analysis Summary table (each file's verdict and its Critical, Major and Minor counts), the ## Items table, or both. The items come from items.<repo>.json when there is one, else from the findings. --write-items starts items.<repo>.json afresh from the findings, numbered from 1 with no disposition, status or notes, and stamps reconciled_at on every reviewed file; run it once, when the review is first written. With --json the result is each file's rollup."
    )
    .option('--repo <repo>', 'The repo whose file reviews to roll up')
    .option('--section <section>', 'file-summary, items or both', 'both')
    .option('--write-items', 'Start items.<repo>.json afresh from the findings')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review aggregate EUDPA-1234 --repo trade-imports-stub --write-items --section file-summary\n  tim review aggregate EUDPA-1234 --repo trade-imports-stub --json'
    )
    .action(
      reviewAction({
        run: (options) => aggregateFileReviews(options),
        renderText: ({ markdown }) => markdown,
        toJson: ({ rollup }) => rollup,
        timVersion
      })
    )

const registerVerify = (review, { timVersion }) => {
  const verify = review
    .command('verify')
    .description(
      'Check a review has everything it needs before its summaries are written, and write the checklist beside the file reviews'
    )
  withReviewId(verify.command('files'))
    .description(
      "Check every file the review's pull requests change has a .review.json with a verdict, and write file-reviews/_VERIFICATION.md. It reads each pull request's changed files from .prs/<repo>-<pr>.json, which `gh api repos/DEFRA/<repo>/pulls/<pr>/files --paginate --slurp` writes: run that for each pull request first, so the list is current. A review with no pull requests has nothing to check."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  gh api repos/DEFRA/trade-imports-stub/pulls/42/files --paginate --slurp > workareas/reviews/EUDPA-1234/.prs/trade-imports-stub-42.json\n  tim review verify files EUDPA-1234'
    )
    .action(
      reviewAction({
        run: verifyFileCoverage,
        renderText: renderFileCoverageText,
        toJson: verifiedJson,
        timVersion
      })
    )
  withReviewId(verify.command('consistency'))
    .description(
      'Check every repo in the review has a _consistency-check.md that is not empty, and write file-reviews/_CONSISTENCY_VERIFICATION.md. A review without the consistency theme is skipped.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim review verify consistency EUDPA-1234 --json'
    )
    .action(
      reviewAction({
        run: verifyConsistency,
        renderText: renderConsistencyText,
        toJson: verifiedJson,
        timVersion
      })
    )
  withReviewId(verify.command('style'))
    .description(
      'Check every source file a code style review lists in .style-meta.json has a .style.json with a verdict, and write file-reviews/_STYLE_VERIFICATION.md under workareas/code-style-reviews/<review-id>.'
    )
    .addHelpText('after', '\nExamples:\n  tim review verify style EUDPA-1234')
    .action(
      reviewAction({
        run: verifyStyleCoverage,
        renderText: renderStyleCoverageText,
        toJson: verifiedJson,
        timVersion
      })
    )
}

const registerReconcile = (review, { timVersion }) =>
  withReviewId(review.command('reconcile'))
    .description(
      "Fold a refresh's findings into a repo's items.<repo>.json. Each file review a reviewer ran since it was last reconciled has each finding added as a new item, then gets reconciled_at. It lists the items added, and the items already fixed and done in the refreshed files, to check they have not come back."
    )
    .option('--repo <repo>', 'The repo whose file reviews to fold in')
    .option('--dry-run', 'Say what would be added, and change nothing')
    .option('--force', 'Fold in every reviewed file, reconciled or not')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review reconcile EUDPA-1234 --repo trade-imports-stub\n  tim review reconcile EUDPA-1234 --repo trade-imports-stub --dry-run --json'
    )
    .action(
      reviewAction({
        run: reconcileFileReviews,
        renderText: renderReconciledText,
        toJson: reconciledJson,
        timVersion
      })
    )

/**
 * `tim review aggregate`, `tim review verify` and `tim review reconcile`.
 *
 * @param {import('commander').Command} review
 * @param {{timVersion: string}} options
 */
export const registerReviewTools = (review, { timVersion }) => {
  registerAggregate(review, { timVersion })
  registerVerify(review, { timVersion })
  registerReconcile(review, { timVersion })
}
