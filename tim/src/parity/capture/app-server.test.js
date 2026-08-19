import { describe, it, expect, afterEach } from 'vitest'
import { createServer } from 'node:net'
import { isAbsolute, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCorpusProfile } from '../corpus-profile.js'
import {
  addressOf,
  argvOf,
  ensureApp,
  isListening,
  waitForPort
} from './app-server.js'

const listeners = []

afterEach(async () => {
  await Promise.all(
    listeners.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(resolve)
        })
    )
  )
})

/** A real socket on a real port: the thing the probe is about. */
const listenOnAnyPort = () =>
  new Promise((resolve) => {
    const server = createServer()
    listeners.push(server)
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  })

describe('addressOf', () => {
  it('reads the port the base URL names', () => {
    expect(addressOf('http://localhost:3010')).toEqual({
      host: 'localhost',
      port: 3010
    })
  })

  it('assumes the protocol default when the URL names no port', () => {
    expect(addressOf('https://example.com').port).toBe(443)
  })

  it('says so when the base URL is not a URL', () => {
    expect(() => addressOf('localhost:3010')).toThrow(/is not a URL/)
  })
})

describe('isListening', () => {
  it('answers yes to a port something is accepting on', async () => {
    const port = await listenOnAnyPort()

    expect(await isListening({ host: '127.0.0.1', port })).toBe(true)
  })

  it('answers no to a port nothing is on', async () => {
    const port = await listenOnAnyPort()
    await new Promise((resolve) => listeners.pop().close(resolve))

    expect(await isListening({ host: '127.0.0.1', port })).toBe(false)
  })
})

describe('waitForPort', () => {
  it('waits on the port rather than on a response, and gives up in the end', async () => {
    let now = 0
    const asked = []

    const ready = await waitForPort({
      host: 'localhost',
      port: 3010,
      timeoutMs: 1_000,
      probe: async () => {
        asked.push(now)
        return false
      },
      clock: () => now,
      sleep: async (ms) => {
        now += ms
      }
    })

    expect(ready).toBe(false)
    expect(asked).toEqual([0, 250, 500, 750, 1000])
  })

  it('stops asking the moment the port opens', async () => {
    let asks = 0

    const ready = await waitForPort({
      host: 'localhost',
      port: 3010,
      probe: async () => {
        asks += 1
        return asks === 3
      },
      clock: () => 0,
      sleep: async () => {}
    })

    expect([ready, asks]).toEqual([true, 3])
  })
})

describe('argvOf', () => {
  it('reads a command written as a sentence', () => {
    expect(argvOf('npm run dev')).toEqual(['npm', 'run', 'dev'])
  })

  it('takes a command already written as an argv', () => {
    expect(argvOf(['npm', 'run', 'fit:start'])).toEqual([
      'npm',
      'run',
      'fit:start'
    ])
  })

  it('refuses a command that needs a shell, rather than running data as code', () => {
    expect(() => argvOf('npm run dev | tee log')).toThrow(/shell characters/)
  })
})

describe('ensureApp', () => {
  const app = {
    startCommand: 'npm run dev',
    cwd: '/repos/prototype',
    readyTimeoutMs: 1_000
  }

  it('uses an application somebody else already started, and says so', async () => {
    const said = []

    const running = await ensureApp({
      app,
      baseUrl: 'http://localhost:3010',
      label: 'prototype',
      log: (line) => said.push(line),
      probe: async () => true,
      launch: () => {
        throw new Error('nothing should be started')
      }
    })
    await running.stop()

    expect([running.started, running.alreadyRunning]).toEqual([false, true])
    expect(said).toEqual([
      'Using the prototype already listening on http://localhost:3010.'
    ])
  })

  it('names the URL and what to start when the corpus says nothing', async () => {
    await expect(
      ensureApp({
        app: { baseURL: 'http://localhost:3010' },
        baseUrl: 'http://localhost:3010',
        label: 'prototype',
        probe: async () => false
      })
    ).rejects.toThrow(
      /Nothing is listening on http:\/\/localhost:3010.*app\.startCommand/s
    )
  })

  it('starts the command the corpus names, with the port from the URL', async () => {
    const launched = []
    let up = false

    const running = await ensureApp({
      app,
      baseUrl: 'http://localhost:3010',
      label: 'prototype',
      probe: async () => up,
      launch: (spec) => {
        launched.push(spec)
        up = true
        return { pid: null }
      },
      clock: () => 0,
      sleep: async () => {}
    })

    expect(launched).toEqual([
      {
        argv: ['npm', 'run', 'dev'],
        cwd: '/repos/prototype',
        env: { PORT: '3010' }
      }
    ])
    expect(running.started).toBe(true)
  })

  it('says what it ran when the port never opens', async () => {
    // The clock has to move when the sleep does. A frozen one never reaches
    // the deadline, so the wait spins without ever yielding to a timer — which
    // is a hang no test timeout can interrupt rather than a failure.
    let now = 0

    await expect(
      ensureApp({
        app,
        baseUrl: 'http://localhost:3010',
        label: 'prototype',
        probe: async () => false,
        launch: () => ({ pid: null }),
        clock: () => now,
        sleep: async (ms) => {
          now += ms
        }
      })
    ).rejects.toThrow(/did not answer on http:\/\/localhost:3010.*npm run dev/s)
  })
})

describe('the workspace own corpora', () => {
  const workspaceRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    '..'
  )

  it('gives every side a URL, a way to start it and somewhere to start it from', () => {
    const profile = loadCorpusProfile({ workspaceRoot })

    expect(
      profile.sides.map((side) => [
        side.id,
        side.app?.baseURL,
        argvOf(side.app?.startCommand).join(' '),
        isAbsolute(side.app?.cwd ?? '')
      ])
    ).toEqual([
      ['frontend', 'http://localhost:3000', 'npm run fit:start', true],
      ['prototype', 'http://localhost:3010', 'npm run dev', true]
    ])
  })
})
