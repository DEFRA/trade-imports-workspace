import { setTimeout } from 'node:timers/promises'
import { Readable } from 'node:stream'
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
 * Build a nock reply that sends its status, its headers and the first
 * part of its body at once, then never sends the rest, so a client times
 * out while it reads the body. Its Content-Length counts one byte more
 * than the first part, so the closed connection reads as a cut-off body.
 *
 * @param {number} statusCode - The status to reply with
 * @param {string} firstPart - The part of the body sent at once
 * @returns {() => [number, import('node:stream').Readable, Record<string, string>]} A function to pass to a scope's `reply`
 */
export const replyWithBodyHeldBack = (statusCode, firstPart) => () => {
  const body = new Readable({ read: () => {} })
  body.push(firstPart)
  return [
    statusCode,
    body,
    { 'Content-Length': String(Buffer.byteLength(firstPart) + 1) }
  ]
}

/**
 * Record each request no mock answered, as `METHOD path`. Call it inside a
 * test; `closeHttpMocks()` stops the recording.
 *
 * @returns {string[]} The unmatched requests, filled as they arrive
 */
export const recordUnmatchedRequests = () => {
  const unmatched = []
  nock.emitter.on('no match', ({ method, path }) =>
    unmatched.push(`${method} ${path}`)
  )
  return unmatched
}

/**
 * Tear down all mocks and re-enable real network access.
 */
export const closeHttpMocks = () => {
  nock.emitter.removeAllListeners('no match')
  nock.cleanAll()
  nock.enableNetConnect()
}
