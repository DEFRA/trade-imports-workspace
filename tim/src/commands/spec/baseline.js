import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { printBaseline, advanceBaseline } from '../../spec/baseline.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const repoLine = ([repo, sha]) => `  ${repo.padEnd(34)} ${sha.slice(0, 12)}`

/**
 * The plain-text report of the bare `tim spec baseline` form.
 *
 * @param {object} baseline
 * @returns {string}
 */
export const renderBaselineText = (baseline) =>
  [
    `Behaviour Spec baseline: verified ${baseline.verifiedAt} (${baseline.verifiedBy}).`,
    ...Object.entries(baseline.repos).map(repoLine)
  ].join('\n')

/**
 * The plain-text report of `tim spec baseline --advance`.
 *
 * @param {{before: object, after: object}} result
 * @returns {string}
 */
export const renderAdvanceText = ({ before, after }) =>
  [
    `Baseline advanced: ${before.verifiedAt} (${before.verifiedBy}) -> ${after.verifiedAt} (${after.verifiedBy}).`,
    ...Object.keys(after.repos).map((repo) => {
      const moved = before.repos[repo] !== after.repos[repo]
      return `  ${repo.padEnd(34)} ${moved ? `${before.repos[repo].slice(0, 12)} -> ${after.repos[repo].slice(0, 12)}` : 'unchanged'}`
    }),
    'Written to openspec/baseline.json — commit it yourself.'
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('baseline')
    .description(
      'Print the Behaviour Spec baseline, or --advance it to the current HEADs. Only a person runs --advance — never the sweep.'
    )
    .option(
      '--advance',
      'Move every repo to its current HEAD and rewrite verifiedAt/verifiedBy'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim spec baseline --json\n' +
        '  tim spec baseline --advance'
    )
    .action(async function baselineAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = opts.advance
          ? await advanceBaseline({ workspaceRoot })
          : printBaseline(workspaceRoot)
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : opts.advance
              ? renderAdvanceText(result)
              : renderBaselineText(result)
        )
        process.exit(OK)
      } catch (error) {
        if (globalOpts.json) {
          emit(
            JSON.stringify(
              jsonEnvelope({
                ok: false,
                error: errorPayloadFor(error),
                timVersion
              })
            )
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(exitCodeFor(error))
      }
    })
}
