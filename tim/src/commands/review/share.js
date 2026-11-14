import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { shareReview, sharedReviewText } from '../../review/share/share.js'
import { makeRunAction } from '../_run-action.js'

/**
 * `tim review share`: the review comment bodies, and the handoff branch.
 *
 * @param {import('commander').Command} review
 * @param {{timVersion: string}} options
 */
export const registerShare = (review, { timVersion }) =>
  review
    .command('share')
    .argument('[ticket]', 'The ticket whose review to share')
    .description(
      "Render a review's PR comment, one body file per PR in .review-meta.json, for gh pr comment <pr> --repo DEFRA/<repo> --body-file <file> to post. Without --comment-only it is a handoff: it copies the review to workareas/shared/<ticket> without repos/ and .diffs/, commits that to the handoff branch (chore/<ticket> unless --branch), pushes it without forcing, and returns to the branch you were on. It refuses when the workspace has changes outside workareas/shared/. A body over GitHub's 65536-character limit stops it; --summary posts counts in place of the item table. --dry-run renders and copies only."
    )
    .option(
      '--repo <repo>',
      'Only PRs in this repo. PR numbers repeat across repos, so pass --repo and --pr together to pin one PR'
    )
    .option('--pr <number>', 'Only this PR number')
    .option(
      '--comment-only',
      'No handoff branch, for PRs you authored: the review state is already on your machine'
    )
    .option(
      '--summary',
      "Counts in place of the full item table: the verdict, a status and severity breakdown for the repo, and where the detail is. A large review needs this to fit GitHub's limit"
    )
    .option('--branch <name>', 'The handoff branch (default chore/<ticket>)')
    .option(
      '--reviewer <login>',
      'The GitHub login the comment names as reviewer, from gh api user --jq .login (default (unknown))'
    )
    .option(
      '--dry-run',
      'Render the bodies and copy the review; no commit or push'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim review share EUDPA-1234 --repo trade-imports-stub --pr 12 --comment-only --reviewer "$(gh api user --jq .login)"\n  tim review share EUDPA-1234 --repo trade-imports-stub --pr 12 --reviewer "$(gh api user --jq .login)"\n  tim review share EUDPA-1234 --summary --dry-run'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          ...opts,
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
        }),
        run: ({ args: [ticket] }, parsed) => shareReview({ ...parsed, ticket }),
        renderText: sharedReviewText,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )
