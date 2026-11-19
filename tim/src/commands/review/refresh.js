import { ERROR, OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { TimError } from '../../errors.js'
import { listCoverageGaps, renderGapsText } from '../../review/refresh/gaps.js'
import {
  listMergeResolved,
  renderMergeResolvedTsv
} from '../../review/refresh/merge-resolved.js'
import {
  anyPullFailed,
  pulledJson,
  pullReviewRepos,
  renderPulledText
} from '../../review/refresh/pull.js'
import {
  buildRefreshScope,
  renderScopeText
} from '../../review/refresh/scope.js'
import { makeRunAction } from '../_run-action.js'

const logToStderr = (text) => process.stderr.write(`${text}\n`)

const refreshAction = ({
  run,
  renderText,
  toJson,
  exitCodeForResult,
  timVersion
}) =>
  makeRunAction({
    parseOptions: (opts) => ({
      ...opts,
      workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
    }),
    run: async ({ args }, parsed) => {
      const result = await run(args, parsed)
      return parsed.json && toJson ? toJson(result) : result
    },
    renderText,
    exitCodeForResult,
    exitCodeForError: () => ERROR,
    timVersion
  })

const refuseMissingReviewId = (reviewId, usage) => {
  if (!reviewId) throw new TimError('USAGE', `Usage: ${usage}`)
}

const registerPull = (refresh, { timVersion }) =>
  refresh
    .command('pull')
    .argument('[review-id]', 'A ticket key')
    .description(
      "Bring each review clone up to date: pin its fetch refspec to its pull request (and main for a merged one), fetch, and detach at origin/pr-<n>, or origin/main for a merged pull request. A repo with no clone is skipped. Exits 1 when any repo fails. With --json the result is each repo's {repo, status, head} or {repo, status, message}."
    )
    .option('--repo <repo>', 'Pull only this repo')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review refresh pull EUDPA-1234\n  tim review refresh pull EUDPA-1234 --repo trade-imports-stub --json'
    )
    .action(
      refreshAction({
        run: ([reviewId], options) => {
          refuseMissingReviewId(
            reviewId,
            'tim review refresh pull <review-id> [--repo REPO]'
          )
          return pullReviewRepos({ ...options, reviewId })
        },
        renderText: renderPulledText,
        toJson: pulledJson,
        exitCodeForResult: (results) => (anyPullFailed(results) ? ERROR : OK),
        timVersion
      })
    )

const registerMergeResolved = (refresh, { timVersion }) =>
  refresh
    .command('merge-resolved')
    .argument('[repo-dir]', 'The repo clone to look in')
    .argument('[prior]', 'The commit the window starts after')
    .argument('[head]', 'The commit the window ends at')
    .description(
      "List the files a merge commit in prior..head lists under '# Conflicts:', one '<merge>\\t<file>' line each, leaving out a file the window leaves unchanged. With --json the result is [{merge, file}]."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim review refresh merge-resolved workareas/reviews/EUDPA-1234/repos/trade-imports-stub 1a2b3c4 5d6e7f8 --json'
    )
    .action(
      refreshAction({
        run: ([repoDir, prior, head]) => {
          if (!repoDir || !prior || !head) {
            throw new TimError(
              'USAGE',
              'Usage: tim review refresh merge-resolved <repo-dir> <prior> <head>'
            )
          }
          return listMergeResolved({ repoDir, prior, head })
        },
        renderText: renderMergeResolvedTsv,
        timVersion
      })
    )

const registerGaps = (refresh, { timVersion }) =>
  refresh
    .command('gaps')
    .argument('[review-id]', 'A ticket key')
    .description(
      "List the files a pull request changes that have no .review.json, one path per line. It reads the pull request's changed files from .prs/<repo>-<pr>.json, which `gh api repos/DEFRA/<repo>/pulls/<pr>/files --paginate --slurp` writes: run that first, so the list is current. With --json the result is the paths."
    )
    .option('--repo <repo>', 'The repo of the pull request')
    .option('--pr <number>', 'The pull request')
    .addHelpText(
      'after',
      '\nExamples:\n  gh api repos/DEFRA/trade-imports-stub/pulls/42/files --paginate --slurp > workareas/reviews/EUDPA-1234/.prs/trade-imports-stub-42.json\n  tim review refresh gaps EUDPA-1234 --repo trade-imports-stub --pr 42'
    )
    .action(
      refreshAction({
        run: ([reviewId], options) =>
          listCoverageGaps({ ...options, reviewId }),
        renderText: renderGapsText,
        timVersion
      })
    )

const registerScope = (refresh, { timVersion }) =>
  refresh
    .command('scope')
    .argument('[review-id]', 'A ticket key')
    .description(
      'Pull each review clone, then sort the refresh work into four lists per repo over the window from the commit the last refresh saw to HEAD: A, changed files not resolved in a merge; B, open items in files that did not change; C, files hand-resolved in a merge; D, files a pull request changes with no .review.json. List D reads .prs/<repo>-<pr>.json for every pull request of the repo, which `gh api repos/DEFRA/<repo>/pulls/<pr>/files --paginate --slurp` writes; a missing one is left out with a warning. Prints a summary; --json gives the lists as result. --write-snapshot records the window in .review-meta.json and clears the findings of every file in lists A and C.'
    )
    .option('--repo <repo>', 'Only this repo')
    .option('--no-pull', 'Use the clones as they are')
    .option(
      '--write-snapshot',
      'Record the window in .review-meta.json and clear the findings of the files to review again'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim review refresh scope EUDPA-1234 --write-snapshot --json\n  tim review refresh scope EUDPA-1234 --no-pull --repo trade-imports-stub'
    )
    .action(
      refreshAction({
        run: ([reviewId], options) =>
          buildRefreshScope({ ...options, reviewId, log: logToStderr }),
        renderText: renderScopeText,
        timVersion
      })
    )

/**
 * `tim review refresh pull|merge-resolved|gaps|scope`.
 *
 * @param {import('commander').Command} review
 * @param {{timVersion: string}} options
 */
export const registerRefresh = (review, { timVersion }) => {
  const refresh = review
    .command('refresh')
    .description("Build the work-lists a review's refresh works through")
  registerPull(refresh, { timVersion })
  registerMergeResolved(refresh, { timVersion })
  registerGaps(refresh, { timVersion })
  registerScope(refresh, { timVersion })
}
