import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { bakeBestPractices } from '../../npm-upgrade/best-practices.js'
import { prebakeContext, renderPrebakeLine } from '../../npm-upgrade/prebake.js'
import { makeRunAction } from '../_run-action.js'

const examplesText = (examples) =>
  `\nExamples:\n${examples.map((example) => `  tim npm context ${example}`).join('\n')}`

const registerBestPractices = (context, { timVersion }) =>
  context
    .command('best-practices')
    .description(
      "Write the run's best-practices.md for one repo: the workspace's Hapi, GOV.UK Frontend, testing and Playwright guides in one file, for its package planners. Prints the file's path."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-500')
    .option('--repo <name>', 'The repo')
    .addHelpText(
      'after',
      examplesText([
        'best-practices --run-id EUDPA-500 --repo trade-imports-animals-frontend'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          runId: opts.runId,
          repo: opts.repo
        }),
        run: async (_context, parsed) => bakeBestPractices(parsed),
        renderText: ({ path }) => path,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const registerPrebake = (context, { timVersion }) =>
  context
    .command('prebake')
    .description(
      "Gather one package's context for its planner under <repo>/.context/: its versions, the repo's src lines that import it and, when its npm registry record names a GitHub repository, the changelog on main or master. A failed download is skipped. Sets the row's context_baked and context_missing, and writes where it put the context to stderr."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-500')
    .option('--repo <name>', 'The repo')
    .option('--package <name>', 'The npm package, such as @hapi/hapi')
    .addHelpText(
      'after',
      examplesText([
        'prebake --run-id EUDPA-500 --repo trade-imports-animals-frontend --package @hapi/hapi',
        'prebake --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash --json'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          runId: opts.runId,
          repo: opts.repo,
          packageName: opts.package
        }),
        run: (_context, parsed) => prebakeContext(parsed),
        renderText: () => null,
        renderTextError: renderPrebakeLine,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

/**
 * `tim npm context`: prepare what an npm upgrade run's package planners
 * read.
 *
 * @param {import('commander').Command} npm
 * @param {{timVersion: string}} options
 */
export const registerContext = (npm, { timVersion }) => {
  const context = npm
    .command('context')
    .description(
      "Prepare what an npm upgrade run's package planners read: the best-practices bundle and each package's context"
    )
  registerBestPractices(context, { timVersion })
  registerPrebake(context, { timVersion })
}
