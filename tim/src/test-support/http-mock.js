import { setTimeout } from 'node:timers/promises'
import nock from 'nock'

/**
 * Set up HTTP mocking for a test file. Blocks all real network calls.
 * Returns a helper to stage intercepts per origin.
 *
 * Use in beforeEach; call `closeHttpMocks()` in afterEach.
 *
 * @returns {{ mockPool: (origin: string) => import('nock').Scope }}
 */
export const installHttpMocks = () => {
  nock.disableNetConnect()
  return {
    mockPool: (origin) => nock(origin)
  }
}

/**
 * Build a nock reply that sends nothing, headers included, until a delay has passed.
 *
 * @param {number} delayMs - How long to hold back the whole response
 * @param {number} statusCode - The status to reply with
 * @param {string | object} body - The body to reply with
 * @returns {() => Promise<[number, string | object]>} A function to pass to a scope's `reply`
 */
export const replyAfter = (delayMs, statusCode, body) => async () => {
  await setTimeout(delayMs)
  return [statusCode, body]
}

/**
 * Tear down all mocks and re-enable real network access.
 */
export const closeHttpMocks = () => {
  nock.cleanAll()
  nock.enableNetConnect()
}
