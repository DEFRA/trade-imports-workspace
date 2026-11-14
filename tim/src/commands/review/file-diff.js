import { text } from 'node:stream/consumers'
import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { readFileDiff, renderFileDiffText } from '../../review/file-diff.js'
import { makeRunAction } from '../_run-action.js'

/**
 * `tim review file-diff`.
 *
 * @param {import('commander').Command} review
 * @param {{timVersion: string}} options
 */
export const registerFileDiff = (review, { timVersion }) =>
  review
    .command('file-diff')
    .argument('[file]', "The file's path in the repo")
    .description(
      "Print one file's blocks from a pull request diff, matching either side of a rename. With --ticket and --repo it reads the review's cached diff, workareas/reviews/<review-id>/.diffs/<repo>.diff, and refuses when there is none. With --stdin it filters a diff piped in. Prints nothing when the file is not in the diff. With --json the result is {repo, file, source, diff}."
    )
    .option('--ticket <review-id>', 'The review whose cached diff to read')
    .option('--repo <repo>', 'The repo of the pull request')
    .option('--stdin', 'Filter the diff piped in')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review file-diff src/server/router.js --ticket EUDPA-1234 --repo trade-imports-animals-frontend\n  gh pr diff 42 --repo DEFRA/trade-imports-animals-frontend | tim review file-diff src/server/router.js --stdin'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          ...opts,
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
        }),
        run: ({ args: [file] }, { workspaceRoot, ticket, repo, stdin }) =>
          readFileDiff({
            workspaceRoot,
            file,
            ticket,
            repo,
            readStdin: stdin ? () => text(process.stdin) : undefined
          }),
        renderText: renderFileDiffText,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )
