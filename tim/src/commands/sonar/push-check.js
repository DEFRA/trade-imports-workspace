import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { text } from 'node:stream/consumers'
import { OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { writeLine } from '../_write-line.js'
import { errorPayloadFor, exitCodeFor, jsonEnvelope } from '../envelope.js'

const HELP = `
Examples:
  tim sonar push-check                                   # the repo you are in
  tim sonar push-check repos/trade-imports-address-book
  tim sonar push-check --pull-request 435 --base main    # analyse as that pull request
  tim sonar push-check --hook < hook-input.json          # as the Claude Code pre-push hook

Exit codes: 0 when the check passed or was skipped, 2 when it blocks the push.
Without --hook, a usage error (a bad --pull-request, --pull-request without --base,
a folder that does not exist) also exits 2, with the reason on stderr and no check
run. With --hook, a usage error exits 0.

Without --pull-request it asks SonarCloud for the branch's pull request. SonarCloud
only knows a pull request once CI has analysed it, so the first push of a new pull
request is checked on its branch.

It needs SONAR_TOKEN and skips without it. With --hook it also looks for the token
in an interactive zsh, reads the Bash call from stdin, checks only a git push, and
exits 0 on any error so the hook never blocks by accident. --hook takes no other
arguments.`

const isFolder = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const validated = (dir, { pullRequest, base }) => {
  if (pullRequest !== undefined && !/^\d+$/.test(pullRequest)) {
    throw new TimError('USAGE', '--pull-request must be a PR number.')
  }
  if ((pullRequest === undefined) !== (base === undefined)) {
    throw new TimError('USAGE', 'Give --pull-request and --base together.')
  }
  const folder = resolve(dir ?? process.cwd())
  if (!isFolder(folder)) {
    throw new TimError('USAGE', `Can't find the folder ${folder}.`)
  }
  return { folder, pullRequest, base }
}

const answerHook = async () => {
  const { runPushCheckHook } = await import('../../sonar/push-check/hook.js')
  return runPushCheckHook({ input: await text(process.stdin) })
}

const checkFolder = async (dir, options, { json, timVersion }) => {
  const { runPushCheck } = await import('../../sonar/push-check/pipeline.js')
  const { folder, pullRequest, base } = validated(dir, options)
  const result = await runPushCheck({
    dir: folder,
    env: process.env,
    token: process.env.SONAR_TOKEN,
    pullRequest,
    base
  })
  if (json) {
    await writeLine(
      process.stdout,
      JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
    )
  }
  return result.exitCode
}

const reportError = async (error, { json, timVersion }) => {
  if (json) {
    await writeLine(
      process.stdout,
      JSON.stringify(
        jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })
      )
    )
  } else {
    await writeLine(process.stderr, error.message ?? String(error))
  }
  return exitCodeFor(error)
}

/**
 * Adds `tim sonar push-check` to the `sonar` command group.
 *
 * @param {import('commander').Command} sonar
 * @param {{timVersion: string}} opts
 */
export const registerPushCheck = (sonar, { timVersion }) => {
  sonar
    .command('push-check [dir]')
    .description(
      'Run the pre-push check on a repo: the build, the tests and a SonarCloud analysis that waits for the quality gate, as CI runs them. Java repos run mvn clean verify sonar:sonar; Node repos run npm ci, format:check, lint and npm test, then sonar-scanner. Only the last 60 lines of a failing step are shown; the whole output is in .cache/sonar-push-check.log.'
    )
    .option('--pull-request <number>', 'Analyse as this pull request')
    .option('--base <branch>', "The pull request's base branch")
    .option(
      '--hook',
      'Answer a Claude Code PreToolUse hook: read the Bash call from stdin and check the repo it pushes'
    )
    .addHelpText('after', HELP)
    .exitOverride((error) =>
      process.exit(process.argv.includes('--hook') ? OK : error.exitCode)
    )
    .action(async function pushCheckAction(dir, options) {
      const { json } = this.optsWithGlobals()
      if (options.hook) {
        process.exitCode = await answerHook()
        return
      }
      try {
        process.exitCode = await checkFolder(dir, options, {
          json,
          timVersion
        })
      } catch (error) {
        process.exitCode = await reportError(error, { json, timVersion })
      }
    })
}
