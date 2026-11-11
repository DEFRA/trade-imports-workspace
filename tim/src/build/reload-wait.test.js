import { describe, test, expect, afterEach } from 'vitest'
import { createServer } from 'node:http'
import { setTimeout as sleep } from 'node:timers/promises'
import { waitForRestart } from './reload-wait.js'

const QUICK = { stopWithinMs: 1_500, startWithinMs: 1_500, intervalMs: 50 }

let server

afterEach(async () => {
  if (server?.listening) await stop(server)
})

const listen = (port = 0) =>
  new Promise((resolve) => {
    const started = createServer((_request, response) => response.end('ok'))
    started.listen(port, '127.0.0.1', () => resolve(started))
  })

const stop = (running) =>
  new Promise((resolve) => {
    running.closeAllConnections()
    running.close(resolve)
  })

const healthUrlOf = (running) =>
  `http://127.0.0.1:${running.address().port}/health`

describe('waitForRestart', () => {
  test('reports restarted once the service stops and serves again', async () => {
    server = await listen()
    const url = healthUrlOf(server)
    const { port } = server.address()
    const restart = (async () => {
      await sleep(200)
      await stop(server)
      await sleep(300)
      server = await listen(port)
    })()

    const outcome = await waitForRestart(url, QUICK)
    await restart

    expect(outcome).toBe('restarted')
  })

  test('reports not-restarted when the service never stops', async () => {
    server = await listen()

    const outcome = await waitForRestart(healthUrlOf(server), QUICK)

    expect(outcome).toBe('not-restarted')
  })

  test('reports not-started when the service stops and does not come back', async () => {
    server = await listen()
    const url = healthUrlOf(server)
    const stopping = (async () => {
      await sleep(200)
      await stop(server)
    })()

    const outcome = await waitForRestart(url, QUICK)
    await stopping

    expect(outcome).toBe('not-started')
  })
})
