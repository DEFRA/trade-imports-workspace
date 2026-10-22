import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import {
  defaultMachineConfigPath,
  readMachineConfig
} from '../../build/machine-config.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

/**
 * This machine's worker count for each FIT and E2E rung its settings file
 * names, or no counts when it has no file.
 *
 * @param {string} path - The machine settings file
 * @returns {{config: string|null, workers: Record<string, number>}}
 * @throws {TimError} PARSE when the file is there but wrong
 */
export const machineWorkers = (path) => {
  const machine = readMachineConfig(path)
  return machine
    ? { config: machine.path, workers: machine.workers }
    : { config: null, workers: {} }
}

/**
 * The plain-text report of `tim build workers`.
 *
 * @param {{config: string|null, workers: Record<string, number>}} result
 * @returns {string}
 */
export const renderWorkersText = ({ config, workers }) => {
  if (!config) {
    return 'This machine has no settings file, so every FIT and E2E run uses its own script’s worker count.'
  }
  const counts = Object.entries(workers).map(
    ([rung, count]) => `  ${rung}  ${count}`
  )
  return counts.length > 0
    ? [`Worker counts from ${config}:`, ...counts].join('\n')
    : `${config} names no worker counts.`
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

/**
 * `tim build workers`: print this machine's worker count for each FIT and
 * E2E rung, as the gate reads them.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerWorkers = (build, timVersion) =>
  build
    .command('workers')
    .description(
      "Print this machine's worker count for each FIT and E2E rung, keyed <repo>/<rung>, from TIM_MACHINE_CONFIG or ~/.config/tim/machine.json: the counts `tim build gate` passes as --workers. A FIT or E2E run made outside the gate passes the same count, so it drives the machine no harder than the gate does. A machine with no file has no counts. See .claude/skills/requirements-pipeline/references/machine-tuning.md."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build workers\n  tim build workers --json'
    )
    .action(function workersAction() {
      const globalOpts = this.optsWithGlobals()
      try {
        const result = machineWorkers(defaultMachineConfigPath())
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderWorkersText(result)
        )
        process.exit(OK)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
