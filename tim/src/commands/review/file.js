import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import {
  addFileReviewTodo,
  initFileReview,
  setFileReviewVerdict
} from '../../review/file-review.js'
import { makeRunAction } from '../_run-action.js'

const workspaceOf = (opts) => ({
  workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
})

const fileReviewAction = ({ run, renderText, timVersion }) =>
  makeRunAction({
    parseOptions: (opts) => ({ ...opts, ...workspaceOf(opts) }),
    run: ({ args: [reviewId] }, parsed) => run({ ...parsed, reviewId }),
    renderText,
    exitCodeForError: () => ERROR,
    timVersion
  })

const fileOptions = (command) =>
  command
    .argument('[review-id]', 'A ticket key, or local/<repo>/<branch>')
    .option('--repo <repo>', 'The repo the file is in')
    .option('--file <path>', "The file's path inside the repo")

const registerInit = (file, { timVersion }) =>
  fileOptions(file.command('init'))
    .description(
      "Write a file's review placeholder to workareas/reviews/<review-id>/file-reviews/<repo>/<file>.review.json, replacing any review already there, and print its path. The mode is FRESH, REFRESH or MERGE_RESOLVED; the PR is null without --pr."
    )
    .option('--commit <sha>', 'The commit reviewed')
    .option('--pr <number>', 'The pull request number')
    .option('--mode <mode>', 'FRESH, REFRESH or MERGE_RESOLVED')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review file init EUDPA-1234 --repo trade-imports-stub --file src/Main.java --commit abc1234 --pr 42 --mode FRESH\n  tim review file init local/trade-imports-stub/feat/NO_JIRA-x --repo trade-imports-stub --file README.md --commit abc1234 --mode FRESH'
    )
    .action(
      fileReviewAction({
        run: initFileReview,
        renderText: ({ path }) => path,
        timVersion
      })
    )

const registerAdd = (file, { timVersion }) =>
  fileOptions(file.command('add'))
    .description(
      "Append a finding to a file's review as its next todo and print the todo's id. The line is stored as a number."
    )
    .option('--line <number>', 'The line the finding is on')
    .option('--severity <severity>', 'Critical, Major or Minor')
    .option('--category <category>', 'One of the finding categories')
    .option('--issue <text>', 'What is wrong')
    .option('--fix <text>', 'What to do about it')
    .option('--best-practice <path>', 'The best-practice file it breaks')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review file add EUDPA-1234 --repo trade-imports-stub --file src/Main.java --line 41 --severity Major --category correctness --issue "Returns 200 for a missing id" --fix "Must: return 404."'
    )
    .action(
      fileReviewAction({
        run: addFileReviewTodo,
        renderText: ({ id }) => String(id),
        timVersion
      })
    )

const registerVerdict = (file, { timVersion }) =>
  fileOptions(file.command('verdict'))
    .description(
      "Set a file review's verdict (SAFE, NEEDS_ATTENTION or RISKY) and reason, and stamp reviewed_at. This marks the file as reviewed. Prints nothing."
    )
    .option('--verdict <verdict>', 'SAFE, NEEDS_ATTENTION or RISKY')
    .option('--reason <text>', 'Why, in a sentence')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review file verdict EUDPA-1234 --repo trade-imports-stub --file src/Main.java --verdict RISKY --reason "Logs a token"'
    )
    .action(
      fileReviewAction({
        run: setFileReviewVerdict,
        renderText: () => null,
        timVersion
      })
    )

/**
 * `tim review file`: one file's review JSON, as a file reviewer fills it.
 *
 * @param {import('commander').Command} review
 * @param {{timVersion: string}} options
 */
export const registerFile = (review, { timVersion }) => {
  const file = review
    .command('file')
    .description(
      "Write one file's review: the placeholder, its todos and its verdict"
    )
  registerInit(file, { timVersion })
  registerAdd(file, { timVersion })
  registerVerdict(file, { timVersion })
}
