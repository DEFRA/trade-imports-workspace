import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'
import { createGithubClient } from '../../clients/github-client.js'
import { OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { resolveGithubToken } from '../auth.js'
import { makeRunAction } from '../_run-action.js'
import { repoNameSchema } from './shared.js'

const MS_PER_SECOND = 1000
const DEFAULT_INTERVAL_SECONDS = 30
const DEFAULT_TIMEOUT_SECONDS = 540
const SONAR_CHECK = /sonar/i

const EXIT_BY_OUTCOME = { passed: 0, failed: 1, pending: 2 }

const secondsSchema = (option) =>
  z.coerce
    .number({ error: `Give ${option} as a number of seconds.` })
    .positive(`Give ${option} as a number of seconds above 0.`)

const argsSchema = z.object({
  repo: repoNameSchema,
  ref: z
    .string({ error: 'Give a PR number, branch or commit sha.' })
    .trim()
    .min(1, 'Give a PR number, branch or commit sha.'),
  watch: z.boolean().optional().default(false),
  intervalSeconds: secondsSchema('--interval').default(
    DEFAULT_INTERVAL_SECONDS
  ),
  timeoutSeconds: secondsSchema('--timeout').default(DEFAULT_TIMEOUT_SECONDS)
})

/**
 * Validate `checks`' arguments before any request is sent.
 *
 * @param {object} input
 * @returns {{repo: string, ref: string, watch: boolean, intervalSeconds: number, timeoutSeconds: number}}
 * @throws {TimError} USAGE naming the first malformed argument
 */
export const parseChecksArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const countOutcomes = (checks) => ({
  passed: checks.filter((check) => check.outcome === 'passed').length,
  failed: checks.filter((check) => check.outcome === 'failed').length,
  pending: checks.filter((check) => check.outcome === 'pending').length
})

const overallOutcome = (checks, counts) => {
  if (checks.length === 0 || counts.pending > 0) return 'pending'
  return counts.failed > 0 ? 'failed' : 'passed'
}

const sonarGateOf = (checks) => {
  const sonar = checks.find((check) => SONAR_CHECK.test(check.name))
  return sonar ? { outcome: sonar.outcome, url: sonar.url } : null
}

/**
 * @param {{checks: Array<{name: string, outcome: string}>}} listing - What `listChecks` returns
 * @returns {object} The listing with an overall outcome (`passed`, `failed` or `pending`; no checks counts as pending), counts and sonarGate
 */
export const summariseChecks = (listing) => {
  const counts = countOutcomes(listing.checks)
  return {
    ...listing,
    outcome: overallOutcome(listing.checks, counts),
    counts,
    sonarGate: sonarGateOf(listing.checks)
  }
}

const checkNames = (summary) =>
  summary.checks
    .map((check) => `${check.kind}:${check.name}`)
    .sort()
    .join('\n')

const confirmsPass = (previous, current) =>
  previous?.outcome === 'passed' && checkNames(previous) === checkNames(current)

const watchChecks = async (client, { repo, ref, intervalMs, deadline }) => {
  const poll = async (previous) => {
    const current = summariseChecks(await client.listChecks(repo, ref))
    if (current.outcome === 'failed' || confirmsPass(previous, current)) {
      return { ...current, timedOut: false }
    }
    if (Date.now() + intervalMs > deadline) {
      return { ...current, timedOut: current.outcome === 'pending' }
    }
    await delay(intervalMs)
    return poll(current)
  }
  return poll(null)
}

/**
 * `tim github checks`' full behaviour. Lists every check run and commit
 * status on the head commit of a PR (or on a branch or sha), with an
 * overall outcome. With `watch`, polls until nothing is pending, and
 * reports a pass only once two polls in a row see the same checks.
 *
 * @param {object} input - The raw arguments, validated by `parseChecksArgs`
 * @returns {Promise<object>} repo, ref, sha, outcome (`passed`, `failed` or `pending`), counts, sonarGate, checks and timedOut
 * @throws {TimError} USAGE for a bad argument, before any request
 */
export const runChecks = async (input) => {
  const { repo, ref, watch, intervalSeconds, timeoutSeconds } =
    parseChecksArgs(input)
  const client = createGithubClient({ token: await resolveGithubToken() })
  if (!watch) {
    return {
      ...summariseChecks(await client.listChecks(repo, ref)),
      timedOut: false
    }
  }
  return watchChecks(client, {
    repo,
    ref,
    intervalMs: intervalSeconds * MS_PER_SECOND,
    deadline: Date.now() + timeoutSeconds * MS_PER_SECOND
  })
}

/**
 * @param {{outcome: string}} result
 * @param {{watch: boolean}} parsed
 * @returns {number} 0 when every check passed, 1 when any failed, 2 when any is still pending; always 0 without --watch
 */
export const exitCodeForChecks = (result, { watch }) =>
  watch ? EXIT_BY_OUTCOME[result.outcome] : OK

const renderCheck = ({ outcome, name, kind, id, url }) =>
  `  ${outcome.padEnd(8)}${name} (${kind} ${id})  ${url ?? ''}`.trimEnd()

const headlineOf = ({ repo, ref, sha, outcome, counts }) =>
  `${repo} ${ref} at ${sha.slice(0, 7)}: ${outcome} (${counts.passed} passed, ${counts.failed} failed, ${counts.pending} pending)`

export const renderChecks = (result) => {
  if (result.checks.length === 0) {
    return `No checks have reported on ${result.repo} ${result.ref} at ${result.sha.slice(0, 7)} yet.`
  }
  return [
    headlineOf(result),
    ...(result.sonarGate
      ? [`SonarCloud gate: ${result.sonarGate.outcome}`]
      : []),
    ...result.checks.map(renderCheck),
    ...(result.timedOut
      ? ['Checks were still pending when the watch timed out.']
      : [])
  ].join('\n')
}

export const register = (gh, { timVersion }) => {
  gh.command('checks <repo> <prOrRef>')
    .description(
      'List every check and commit status on the head commit of a PR, branch or sha, with an overall outcome'
    )
    .option('--watch', 'Keep checking until no check is pending')
    .option(
      '--interval <seconds>',
      'How long to wait between checks when watching',
      String(DEFAULT_INTERVAL_SECONDS)
    )
    .option(
      '--timeout <seconds>',
      'Stop watching after this many seconds',
      String(DEFAULT_TIMEOUT_SECONDS)
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim github checks trade-imports-animals-frontend 51',
        '  tim github checks trade-imports-animals-frontend 51 --watch --json',
        '  tim github checks trade-imports-animals-frontend main --watch --interval 15 --timeout 300',
        '',
        'With --watch the command exits 0 when every check passed, 1 when any',
        'failed, and 2 when checks are still pending at the timeout. A PR with',
        'no checks yet counts as pending. The default timeout of 540 seconds',
        'fits inside a 10-minute shell call.'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runChecks({
            repo: args[0],
            ref: args[1],
            watch: opts.watch,
            intervalSeconds: opts.interval,
            timeoutSeconds: opts.timeout
          }),
        renderText: renderChecks,
        exitCodeForResult: (result, opts) =>
          exitCodeForChecks(result, { watch: Boolean(opts.watch) }),
        timVersion
      })
    )
}
