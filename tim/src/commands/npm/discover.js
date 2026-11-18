import { join } from 'node:path'
import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { TimError } from '../../errors.js'
import {
  checkDiscoverOptions,
  discoverUpgrades,
  renderDiscoverText
} from '../../npm-upgrade/discover.js'
import { ncuVersion, runNcu } from '../../npm-upgrade/ncu.js'
import { makeRunAction } from '../_run-action.js'

const repoPathOf = ({ repoPathArgument, repo, workspaceRoot }) => {
  if (repoPathArgument && repo) {
    throw new TimError(
      'USAGE',
      'Give a repository path or --repo, not both. Use --help for usage information'
    )
  }
  return repoPathArgument ?? (repo && join(workspaceRoot, 'repos', repo))
}

const printLine = (line) => process.stdout.write(`${line}\n`)
const warnLine = (line) => process.stderr.write(`${line}\n`)

/**
 * `tim npm discover`: find a repo's outdated npm dependencies and seed the
 * run's packages file.
 *
 * @param {import('commander').Command} npm
 * @param {{timVersion: string}} options
 */
export const registerDiscover = (npm, { timVersion }) =>
  npm
    .command('discover [repo-path]')
    .description(
      "Find a repo's outdated npm dependencies with npm-check-updates and write the run's packages.<repo>.json. A re-run keeps the classification, status and context of every package still outdated. --json gives the packages file."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-500')
    .option(
      '--repo <name>',
      'The repo under repos/, in place of a repository path'
    )
    .option(
      '--strategy <level>',
      'How far to upgrade: latest, minor or patch',
      'latest'
    )
    .option('--force', 'Say "Creating workspace" even when the folder exists')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim npm discover --repo trade-imports-animals-frontend --run-id EUDPA-500',
        '  tim npm discover repos/trade-imports-animals-frontend --run-id EUDPA-500 --strategy minor',
        '  tim npm discover --repo trade-imports-animals-frontend --run-id EUDPA-500 --json'
      ].join('\n')
    )
    .action(function discoverAction(repoPathArgument, ...rest) {
      const { json } = this.optsWithGlobals()
      return makeRunAction({
        parseOptions: (opts) => {
          const workspaceRoot = resolveWorkspaceRoot({
            explicit: opts.workspace
          })
          const parsed = {
            workspaceRoot,
            runId: opts.runId,
            repoPath: repoPathOf({
              repoPathArgument,
              repo: opts.repo,
              workspaceRoot
            }),
            strategy: opts.strategy,
            force: opts.force === true
          }
          checkDiscoverOptions({ ...parsed, warn: warnLine })
          return parsed
        },
        run: async (_context, parsed) => {
          const discovery = await discoverUpgrades({
            ...parsed,
            runNcu,
            ncuVersion: ncuVersion(),
            log: json ? () => undefined : printLine
          })
          return json ? discovery.state : discovery
        },
        renderText: renderDiscoverText,
        renderErrorText: (error) => `Error: ${error.message}`,
        exitCodeForError: () => ERROR,
        timVersion
      }).apply(this, [repoPathArgument, ...rest])
    })
