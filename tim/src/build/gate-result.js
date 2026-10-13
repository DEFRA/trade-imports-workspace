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
 * Waits for a gate's result file, for at most `seconds`.
 *
 * @param {object} args
 * @param {string} args.resultPath
 * @param {number} args.seconds
 * @param {number} [args.pollIntervalMs]
 * @returns {Promise<object | null>} The gate's envelope, or null when the gate had not finished in time
 */
export const waitForGateResult = async ({
  resultPath,
  seconds,
  pollIntervalMs = POLL_INTERVAL_MS
}) => {
  const deadline = Date.now() + seconds * 1000
  for (;;) {
    const envelope = readGateResult(resultPath)
    if (envelope) return envelope
    if (Date.now() >= deadline) return null
    await delay(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())))
  }
}
