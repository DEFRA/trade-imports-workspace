import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const POLL_INTERVAL_MS = 2000

/**
 * Removes a gate result left by an earlier run, so a wait on the file never
 * reads a result this run did not write.
 *
 * @param {string} resultPath
 */
export const clearGateResult = (resultPath) =>
  rmSync(resultPath, { force: true })

const processFileOf = (resultPath) => `${resultPath}.pid`

/**
 * Records the process running the gate beside its result file, so a wait can
 * tell a gate that has died from one still running.
 *
 * @param {string} resultPath
 * @param {number} pid
 */
export const recordGateProcess = (resultPath, pid) => {
  mkdirSync(dirname(resultPath), { recursive: true })
  writeFileSync(processFileOf(resultPath), `${pid}\n`)
}

const recordedGateProcess = (resultPath) => {
  try {
    return Number.parseInt(readFileSync(processFileOf(resultPath), 'utf8'), 10)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

const isProcessRunning = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

const hasGateDied = (resultPath) => {
  const pid = recordedGateProcess(resultPath)
  return pid !== null && !isProcessRunning(pid)
}

/**
 * Writes the gate's JSON envelope to its result file in one step: the
 * envelope goes to a sibling file first and is renamed into place, so a
 * waiter reads the whole result or no result.
 *
 * @param {string} resultPath
 * @param {object} envelope
 */
export const writeGateResult = (resultPath, envelope) => {
  mkdirSync(dirname(resultPath), { recursive: true })
  const partPath = `${resultPath}.part`
  writeFileSync(partPath, `${JSON.stringify(envelope)}\n`)
  renameSync(partPath, resultPath)
}

const readGateResult = (resultPath) => {
  try {
    return JSON.parse(readFileSync(resultPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

/**
 * Waits for a gate's result file, for at most `seconds`. A gate whose recorded
 * process has gone without writing a result has died, and the wait says so at
 * once.
 *
 * @param {object} args
 * @param {string} args.resultPath
 * @param {number} args.seconds
 * @param {number} [args.pollIntervalMs]
 * @returns {Promise<{state: 'finished', envelope: object} | {state: 'running'} | {state: 'died'}>}
 */
export const waitForGateResult = async ({
  resultPath,
  seconds,
  pollIntervalMs = POLL_INTERVAL_MS
}) => {
  const deadline = Date.now() + seconds * 1000
  for (;;) {
    const died = hasGateDied(resultPath)
    const envelope = readGateResult(resultPath)
    if (envelope) return { state: 'finished', envelope }
    if (died) return { state: 'died' }
    if (Date.now() >= deadline) return { state: 'running' }
    await delay(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())))
  }
}
