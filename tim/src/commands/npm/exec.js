import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { runStreamed } from '../../exec/exec.js'
import { npmArgsInCheckout } from '../../npm-upgrade/npm-exec.js'
import { writeLine } from '../_write-line.js'

/**
 * `tim npm exec`: run npm in a workspace repo or clone at its real path.
 *
 * @param {import('commander').Command} npm
 */
export const registerExec = (npm) =>
  npm
    .command('exec')
    .description(
      "Run npm in a repo under repos/ or a clone under workareas/clones/, at the checkout's real path, so a symlinked workspace never rewrites package-lock.json. Streams npm's output and exits with npm's exit code."
    )
    .argument('[npm-args...]', 'The npm subcommand and its arguments, after --')
    .option('--repo <name>', 'The repo under repos/')
    .option('--clone <name>', 'The clone under workareas/clones/')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim npm exec --repo trade-imports-animals-frontend -- install date-fns@4.3.0',
        '  tim npm exec --repo trade-imports-animals-frontend -- run lint',
        '  tim npm exec --clone trade-imports-ins-frontend -- ci'
      ].join('\n')
    )
    .action(async function execAction(npmArgs) {
      const opts = this.optsWithGlobals()
      try {
        const args = npmArgsInCheckout({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          repo: opts.repo,
          clone: opts.clone,
          npmArgs
        })
        const { exitCode } = await runStreamed('npm', args)
        process.exit(exitCode)
      } catch (error) {
        await writeLine(process.stderr, error.message)
        process.exit(ERROR)
      }
    })
