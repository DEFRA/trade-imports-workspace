import { resolve } from 'node:path'
import { z } from 'zod'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { measureCommand } from '../../build/measure/measure.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const DEFAULT_INTERVAL_SECONDS = 5
const MS_PER_SECOND = 1000

const measureOptionsSchema = z.object({
  label: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
      'The label names the output files: use letters, digits, ".", "_" and "-", such as plants-fit-w4.'
    ),
  out: z.string().trim().min(1, 'Name the folder to write to with --out.'),
  cwd: z.string().trim().min(1),
  interval: z.coerce
    .number({ message: '--interval must be a number of seconds.' })
    .positive('--interval must be more than 0.'),
  command: z
    .array(z.string())
    .min(1, 'Name the command to run after --, such as -- npm test.')
})

const orDash = (value, unit = '') =>
  value === null || value === undefined ? '-' : `${value}${unit}`

/**
 * The plain-text report of `tim build measure`.
 *
 * @param {object} summary - What measureCommand returned
 * @returns {string}
 */
export const renderMeasureText = (summary) =>
  [
    `${summary.label}: exited ${summary.exitCode} after ${summary.wallSeconds}s (${summary.samples} samples).`,
    ...summary.outcome.map((line) => `  ${line}`),
    `Peak load ${orDash(summary.peakLoad1)}. Lowest free memory ${orDash(summary.lowestFreePercent, '%')}. Peak memory in use ${orDash(summary.peakHostUsedGiB, ' GiB')}.`,
    `Swap ${orDash(summary.swapStartMiB, ' MiB')} at the start, ${orDash(summary.swapPeakMiB, ' MiB')} at its peak, ${orDash(summary.swapoutPages)} pages swapped out.`,
    `Docker peak ${orDash(summary.peakDockerMiB, ' MiB')} and ${orDash(summary.peakDockerCpuPercent, '%')} CPU.`,
    `A shell took ${orDash(summary.shellStartMs.median, ' ms')} to start (p95 ${orDash(summary.shellStartMs.p95, ' ms')}, worst ${orDash(summary.shellStartMs.max, ' ms')}).`,
    `Log ${summary.log}. Samples ${summary.csv}.`
  ].join('\n')

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

/**
 * `tim build measure`: run one command and record what it does to the
 * machine.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerMeasure = (build, timVersion) =>
  build
    .command('measure')
    .argument('<command...>', 'The command to run, after --')
    .requiredOption(
      '--label <name>',
      'Names the files it writes: <label>.log, <label>.csv and <label>.json'
    )
    .requiredOption('--out <dir>', 'The folder to write them to')
    .option('--cwd <dir>', 'The folder to run the command in', '.')
    .option(
      '--interval <seconds>',
      'How often to sample the machine',
      String(DEFAULT_INTERVAL_SECONDS)
    )
    .description(
      "Run one command with its output in a log, and sample the machine while it runs: load, free memory, memory in use and swap (macOS sysctl, memory_pressure and vm_stat), the docker containers' memory and CPU, and how long a shell takes to start, which is how the terminal feels. Writes every sample as CSV and a summary as JSON, with the peaks, the lowest free memory, the pages swapped out and the test result lines. A reading this machine cannot take is left empty. Exits 1 when the command fails. Use it to tune the gate's worker counts to a machine: see .claude/skills/requirements-pipeline/references/machine-tuning.md."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build measure --label plants-fit-w4 --out /tmp/m --cwd repos/trade-imports-plants-frontend -- npm run test:fit:ci -- --workers=4\n  tim build measure --label backend-verify --out /tmp/m --cwd repos/trade-imports-ins-backend --json -- mvn -B verify'
    )
    .action(async function measureAction(command, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(measureOptionsSchema, {
          label: opts.label,
          out: opts.out,
          cwd: opts.cwd,
          interval: opts.interval,
          command
        })
        const [program, ...args] = parsed.command
        const summary = await measureCommand({
          label: parsed.label,
          outDir: resolve(parsed.out),
          command: program,
          args,
          cwd: resolve(parsed.cwd),
          intervalMs: parsed.interval * MS_PER_SECOND
        })
        emit(
          globalOpts.json
            ? JSON.stringify(
                jsonEnvelope({ ok: true, result: summary, timVersion })
              )
            : renderMeasureText(summary)
        )
        process.exit(summary.exitCode === 0 ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
