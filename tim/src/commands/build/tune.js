import { join, resolve } from 'node:path'
import { z } from 'zod'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { defaultLeasePath } from '../../exec/stack-lease.js'
import {
  defaultMachineConfigPath,
  readMachineConfig
} from '../../build/machine-config.js'
import {
  DEFAULT_WORKER_COUNTS,
  machineFileAfterTune,
  tuneMachine,
  writeMachineFile
} from '../../build/tune/tune.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const MS_PER_SECOND = 1000
const DEFAULT_INTERVAL_SECONDS = 5
const MOST_WORKERS = 16

const countsSchema = z
  .string()
  .trim()
  .regex(
    /^\d+(,\d+)*$/,
    '--counts takes worker counts separated by commas, such as 2,3,4.'
  )
  .transform((text) => [
    ...new Set(text.split(',').map((count) => Number(count)))
  ])
  .refine(
    (counts) => counts.every((count) => count >= 1 && count <= MOST_WORKERS),
    `Each worker count must be from 1 to ${MOST_WORKERS}.`
  )
  .transform((counts) => counts.toSorted((left, right) => left - right))

const tuneOptionsSchema = z.object({
  counts: countsSchema,
  interval: z.coerce
    .number({ message: '--interval must be a number of seconds.' })
    .positive('--interval must be more than 0.'),
  out: z.string().trim().min(1).optional(),
  dryRun: z.boolean()
})

const timestamp = () => new Date().toISOString().replace(/[-:]|\.\d+/g, '')

const describeTrial = ({
  workers,
  exitCode,
  wallSeconds,
  swapoutPages,
  shellStartMs
}) =>
  `    ${workers} workers: ${wallSeconds}s, ${exitCode === 0 ? 'passed' : `failed (exit ${exitCode})`}, ${swapoutPages ?? '?'} pages swapped out, slowest shell start ${shellStartMs?.max ?? '?'} ms`

const describeRung = ({ key, workers, reason, trials }) => [
  `  ${key}: ${workers === null ? "its script's own count" : `${workers} workers`}. ${reason}`,
  ...trials.map(describeTrial)
]

const listOf = (counts) =>
  counts.length === 1
    ? `${counts[0]}`
    : `${counts.slice(0, -1).join(', ')} and ${counts.at(-1)}`

/**
 * The plain-text report of `tim build tune`.
 *
 * @param {object} outcome
 * @returns {string}
 */
export const renderTuneText = ({
  tuned,
  refused,
  rungs,
  counts,
  outDir,
  machineFile,
  wrote
}) => {
  if (!tuned) {
    return `Nothing was timed: tim could not take the workspace stack. ${refused.reason}`
  }
  return [
    `Timed ${rungs.length} rungs at ${listOf(counts)} workers each, with the workspace stack up.`,
    ...rungs.flatMap(describeRung),
    wrote
      ? `Wrote these counts to ${machineFile}. The gate and the build loop use them from their next run.`
      : `Dry run: ${machineFile} is unchanged. Run without --dry-run to save the counts.`,
    `Each run's log, samples and summary are in ${outDir}.`
  ].join('\n')
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

const saveCounts = (machineFile, rungs, dryRun) => {
  if (dryRun) return false
  const existing = readMachineConfig(machineFile)
  writeMachineFile(machineFile, machineFileAfterTune(existing, rungs))
  return true
}

/**
 * `tim build tune`: time the FIT and E2E rungs at several worker counts and
 * save this machine's counts to config/machine.json.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerTune = (build, timVersion) =>
  build
    .command('tune')
    .option(
      '--counts <list>',
      'The worker counts to time, separated by commas',
      DEFAULT_WORKER_COUNTS.join(',')
    )
    .option(
      '--interval <seconds>',
      'How often to sample the machine while each run goes',
      String(DEFAULT_INTERVAL_SECONDS)
    )
    .option(
      '--out <dir>',
      "Where each run's log, samples and summary go (default: workareas/machine-tuning/<time>)"
    )
    .option(
      '--dry-run',
      'Time and report, but leave config/machine.json as it is',
      false
    )
    .description(
      "Find how hard this machine can drive the tests, and save it. Takes the workspace stack lease, starting the stack from local source, then runs every FIT and E2E rung in gates.json for the cloned repos at each worker count, one run at a time, sampling the machine with `tim build measure`. For each rung it picks the fewest workers past which the time stops falling, then one fewer if that count swapped or kept a shell waiting more than 100 ms. It writes the counts to the workspace's gitignored config/machine.json (or TIM_MACHINE_CONFIG), keeping anything else already there, and gives the stack back. Run it once when you set up the workspace, with nothing else heavy running and the stack free: it takes about an hour. Refuses a stack somebody else holds. See .claude/skills/requirements-pipeline/references/machine-tuning.md."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build tune\n  tim build tune --dry-run --json\n  tim build tune --counts 2,3'
    )
    .action(async function tuneAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(tuneOptionsSchema, {
          counts: opts.counts,
          interval: opts.interval,
          out: opts.out,
          dryRun: opts.dryRun === true
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outDir = parsed.out
          ? resolve(parsed.out)
          : join(workspaceRoot, 'workareas', 'machine-tuning', timestamp())
        const machineFile = defaultMachineConfigPath(workspaceRoot)
        const result = await tuneMachine({
          workspaceRoot,
          holder: `tim build tune (pid ${process.pid})`,
          counts: parsed.counts,
          outDir,
          leasePath: defaultLeasePath(),
          intervalMs: parsed.interval * MS_PER_SECOND
        })
        const wrote = result.tuned
          ? saveCounts(machineFile, result.rungs, parsed.dryRun)
          : false
        const outcome = {
          ...result,
          counts: parsed.counts,
          outDir,
          machineFile,
          wrote
        }
        emit(
          globalOpts.json
            ? JSON.stringify({
                ...jsonEnvelope({ ok: true, result: outcome, timVersion }),
                ok: result.tuned
              })
            : renderTuneText(outcome)
        )
        process.exit(result.tuned ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
