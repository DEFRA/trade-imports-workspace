import { join, resolve } from 'node:path'
import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { resolveRepoPath } from '../../build/repo-path.js'
import {
  DEFAULT_TEST_TIMEOUT_SECONDS,
  runProbe,
  testCommandFor
} from '../../build/probe.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const probeOptionsSchema = z
  .object({
    repo: z
      .string()
      .trim()
      .min(1, 'Name the repo, as a path or a folder under repos/.'),
    file: z.string().trim().min(1, 'Name the production file to invert.'),
    line: z.coerce
      .number({ message: '--line must be a whole number.' })
      .int('--line must be a whole number.')
      .positive('--line must be 1 or more.')
      .optional(),
    search: z.string().min(1, '--search cannot be empty.').optional(),
    replace: z.string().optional(),
    testFile: z.string().trim().min(1).optional(),
    testCommand: z.array(z.string()),
    logs: z.string().trim().min(1).optional(),
    timeoutSeconds: z.coerce
      .number({ message: '--timeout-seconds must be a number.' })
      .positive('--timeout-seconds must be more than 0.')
  })
  .refine(({ line, search }) => line !== undefined || search !== undefined, {
    message:
      'Give the line to blank out with --line, or the text to replace with --search.'
  })
  .refine(({ line, search }) => line === undefined || search === undefined, {
    message: 'Give either --line or --search, not both.'
  })
  .refine(
    ({ search, replace }) => (search === undefined) === (replace === undefined),
    {
      message: 'Give --search and --replace together.'
    }
  )
  .refine(
    ({ testFile, testCommand }) =>
      testFile !== undefined || testCommand.length > 0,
    {
      message:
        'Give the test to run with --test-file, or as a command after --.'
    }
  )
  .refine(
    ({ testFile, testCommand }) =>
      testFile === undefined || testCommand.length === 0,
    { message: 'Give either --test-file or a test command after --, not both.' }
  )

const inversionOf = ({ line, search, replace }) =>
  search === undefined ? { line } : { search, replace }

const describeInversion = ({ file, inversion }) =>
  inversion.search === undefined
    ? `line ${inversion.line} of ${file} blanked out`
    : `the search text in ${file} replaced`

/**
 * The plain-text report of `tim build probe`.
 *
 * @param {object} outcome
 * @returns {string}
 */
export const renderProbeText = (outcome) => {
  const { redWhenInverted, greenAfterRestore, restored, file, logs } = outcome
  if (!restored) {
    return `The probe could not put ${file} back exactly as git has it. Check it with git diff before you do anything else.`
  }
  const verdict = redWhenInverted
    ? `The test failed with ${describeInversion(outcome)}, so it witnesses that change.`
    : `The test still passed with ${describeInversion(outcome)}, so it does not witness that change.`
  const after = greenAfterRestore
    ? 'It passed again once the file was back.'
    : `It still failed once the file was back, so it was failing before the probe. Read ${logs.restored}.`
  return [verdict, after, `Logs: ${logs.inverted} and ${logs.restored}.`].join(
    '\n'
  )
}

const reportError = (error, json, timVersion) => {
  if (json) {
    emit(
      JSON.stringify(
        jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })
      )
    )
  } else {
    emitError(error.message ?? String(error))
  }
  process.exit(exitCodeFor(error))
}

const probeEnvelope = (outcome, timVersion) => ({
  ...jsonEnvelope({ ok: true, result: outcome, timVersion }),
  ok: outcome.restored,
  errors: outcome.restored
    ? []
    : [
        {
          code: 'NOT_RESTORED',
          message: `The probe could not put ${outcome.file} back exactly as git has it.`
        }
      ]
})

/**
 * `tim build probe`: whether a test witnesses one production line.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerProbe = (build, timVersion) =>
  build
    .command('probe')
    .argument('<repo>', 'The repo, as a path or a folder under repos/')
    .argument('<file>', 'The production file to invert, relative to the repo')
    .argument('[testCommand...]', 'The test command, after --')
    .option('--line <n>', 'The line to blank out, counting from 1')
    .option('--search <text>', 'Text that appears exactly once in the file')
    .option('--replace <text>', 'What to put in place of the search text')
    .option(
      '--test-file <path>',
      'The test file to run, relative to the repo: a *.test.js runs through npm test without coverage, a *.fit.spec.js through test:fit:ci, a Java class through mvn verify'
    )
    .option(
      '--logs <dir>',
      'Where the two test runs write their logs (default: workareas/build-probe/ in the workspace)'
    )
    .option(
      '--timeout-seconds <n>',
      'How long each test run may take before it counts as failed',
      String(DEFAULT_TEST_TIMEOUT_SECONDS)
    )
    .description(
      'Check that a test fails without the line it covers. The probe blanks out the line (or replaces the search text), runs the test, puts the file back byte for byte, checks git shows no change to it, and runs the test again. redWhenInverted true means the test witnesses the line. redWhenInverted false means it does not: the line is dead, or the test checks something else. The probe refuses a file with uncommitted changes, so commit first. Put every option, --json included, before the --. Exits 1 only when the file could not be put back.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build probe trade-imports-plants-frontend src/server/app/origin/controller.js --line 42 --test-file src/server/app/origin/controller.test.js --json\n  tim build probe . tim/src/build/gate.js --search "exitCode === 0" --replace "exitCode !== 0" --json -- npm --prefix tim test -- src/build/gate.test.js'
    )
    .action(async function probeAction(repo, file, testCommand, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(probeOptionsSchema, {
          repo,
          file,
          line: opts.line,
          search: opts.search,
          replace: opts.replace,
          testFile: opts.testFile,
          testCommand,
          logs: opts.logs,
          timeoutSeconds: opts.timeoutSeconds
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await runProbe({
          repoPath: resolveRepoPath(workspaceRoot, parsed.repo),
          file: parsed.file,
          inversion: inversionOf(parsed),
          testCommand: parsed.testFile
            ? testCommandFor(parsed.testFile)
            : parsed.testCommand,
          logsDir: parsed.logs
            ? resolve(parsed.logs)
            : join(workspaceRoot, 'workareas', 'build-probe'),
          timeoutMs: parsed.timeoutSeconds * 1000
        })
        emit(
          globalOpts.json
            ? JSON.stringify(probeEnvelope(outcome, timVersion))
            : renderProbeText(outcome)
        )
        process.exit(outcome.restored ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
