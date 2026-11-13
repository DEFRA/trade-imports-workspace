import { z } from 'zod'
import { OK, MISSING_DEP } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { checkNightlyReadiness, readStopFile } from '../../nightly/readiness.js'
import { makeRunAction } from '../_run-action.js'
import { parseOptions } from '../backlog/shared.js'

const checkOptionsSchema = z.object({
  fetch: z.boolean().optional(),
  workspace: z.string().optional()
})

const stoppedOptionsSchema = z.object({
  workspace: z.string().optional()
})

const describeJob = ({ name, cron, enabled }) =>
  `  ${name}: ${enabled ? 'on' : 'off'}, cron ${cron}`

/**
 * The plain-text report of `tim nightly check`.
 *
 * @param {{ready: boolean, checks: object[], jobs: object[]}} readiness
 * @returns {string}
 */
export const renderCheckText = ({ ready, checks, jobs }) =>
  [
    ...checks.map(
      ({ name, ok, detail }) => `${name}: ${ok ? 'OK' : 'FAILED'} — ${detail}`
    ),
    ...(jobs.length > 0 ? ['Jobs:', ...jobs.map(describeJob)] : []),
    ready
      ? 'Ready to run the nightly jobs.'
      : 'Not ready. Fix each FAILED line, then run this again.'
  ].join('\n')

/**
 * The plain-text report of `tim nightly stopped`.
 *
 * @param {{stopped: boolean, path: string, reason: string|null}} stop
 * @returns {string}
 */
export const renderStoppedText = ({ stopped, path, reason }) => {
  if (!stopped) return `Not stopped. ${path} is absent.`
  return reason ? `Stopped: ${reason}` : `Stopped. ${path} exists.`
}

const registerCheck = (nightly, { timVersion }) =>
  nightly
    .command('check')
    .description(
      'Check that this session is ready to run the nightly jobs unattended: SONAR_TOKEN is set, ANTHROPIC_API_KEY is not, workareas/nightly/STOP is absent, config/nightly-jobs.json is valid, and the workspace and every cloned repo have no uncommitted changes. Lists every job with its cron. Checks nothing on GitHub: run gh auth status for that. Exits 0 when ready and 3 when not.'
    )
    .option(
      '--fetch',
      'Fetch origin in the workspace and every cloned repo first'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim nightly check\n  tim nightly check --fetch --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => parseOptions(checkOptionsSchema, opts),
        run: (_context, parsed) =>
          checkNightlyReadiness(
            resolveWorkspaceRoot({ explicit: parsed.workspace }),
            { fetch: parsed.fetch === true }
          ),
        renderText: renderCheckText,
        exitCodeForResult: ({ ready }) => (ready ? OK : MISSING_DEP),
        timVersion
      })
    )

const registerStopped = (nightly, { timVersion }) =>
  nightly
    .command('stopped')
    .description(
      'Report whether the nightly kill switch is on: workareas/nightly/STOP exists. Gives the text inside it as the reason. Every nightly job runs this first and stops when it says stopped. Exits 0 either way.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim nightly stopped\n  tim nightly stopped --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => parseOptions(stoppedOptionsSchema, opts),
        run: async (_context, parsed) =>
          readStopFile(resolveWorkspaceRoot({ explicit: parsed.workspace })),
        renderText: renderStoppedText,
        timVersion
      })
    )

export const register = (program, { timVersion }) => {
  const nightly = program
    .command('nightly')
    .description(
      'Commands for the scheduled nightly maintenance jobs (see .claude/rules/nightly.md)'
    )

  registerCheck(nightly, { timVersion })
  registerStopped(nightly, { timVersion })
}
