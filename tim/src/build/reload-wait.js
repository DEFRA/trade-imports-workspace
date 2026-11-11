import { setTimeout as sleep } from 'node:timers/promises'

export const RELOAD_OUTCOMES = Object.freeze({
  restarted: 'restarted',
  notRestarted: 'not-restarted',
  notStarted: 'not-started'
})

const isServing = async (url, requestTimeoutMs) => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(requestTimeoutMs)
    })
    return response.ok
  } catch {
    return false
  }
}

const pollUntil = async (check, withinMs, intervalMs) => {
  const deadline = Date.now() + withinMs
  while (Date.now() < deadline) {
    if (await check()) return true
    await sleep(intervalMs)
  }
  return false
}

/**
 * Wait for a service that reloads on a source change (nodemon in the
 * workspace stack's dev mode) to stop serving and then serve again.
 *
 * @param {string} url - A URL the service answers with a 2xx when it is up, such as its /health
 * @param {object} [timing]
 * @param {number} [timing.stopWithinMs] - How long to wait for the service to stop
 * @param {number} [timing.startWithinMs] - How long to wait for it to serve again once stopped
 * @param {number} [timing.intervalMs] - How often to ask
 * @returns {Promise<'restarted'|'not-restarted'|'not-started'>} not-restarted when it never stopped, not-started when it stopped and did not come back
 */
export const waitForRestart = async (
  url,
  { stopWithinMs = 20_000, startWithinMs = 120_000, intervalMs = 200 } = {}
) => {
  const requestTimeoutMs = 2_000
  const stopped = await pollUntil(
    async () => !(await isServing(url, requestTimeoutMs)),
    stopWithinMs,
    intervalMs
  )
  if (!stopped) return RELOAD_OUTCOMES.notRestarted
  const started = await pollUntil(
    () => isServing(url, requestTimeoutMs),
    startWithinMs,
    intervalMs
  )
  return started ? RELOAD_OUTCOMES.restarted : RELOAD_OUTCOMES.notStarted
}
