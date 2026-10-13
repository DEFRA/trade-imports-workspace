import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  rmSync,
  existsSync,
  readFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ensureDockerRunning, isDaemonUnreachable } from './docker-daemon.js'

let sandbox

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'tim-docker-daemon-'))
})

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true })
})

const UNREACHABLE =
  'Cannot connect to the Docker daemon at unix:///Users/someone/.docker/run/docker.sock. Is the docker daemon running?'

const writeExecutable = (bin, name, body) => {
  writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(join(bin, name), 0o755)
}

// A docker that answers only once the fake `open` has started Docker Desktop,
// and an `open` that records what it was asked to open.
const fakeMachine = ({ dockerUp = false, openExit = 0 } = {}) => {
  const bin = join(sandbox, 'bin')
  mkdirSync(bin, { recursive: true })
  const running = join(sandbox, 'docker-running')
  const opened = join(sandbox, 'opened')
  if (dockerUp) writeFileSync(running, '')
  writeExecutable(
    bin,
    'docker',
    `if [ -f "${running}" ]; then echo 29.1.0; exit 0; fi\necho "${UNREACHABLE}" >&2\nexit 1`
  )
  writeExecutable(
    bin,
    'open',
    `echo "$*" > "${opened}"\nif [ ${openExit} -ne 0 ]; then echo "Unable to find application named 'Docker'" >&2; exit ${openExit}; fi\ntouch "${running}"`
  )
  return {
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      TIM_DOCKER_START_POLL_MS: '10',
      TIM_DOCKER_START_WAIT_MS: '2000'
    },
    opened
  }
}

describe('isDaemonUnreachable', () => {
  test("recognises docker's message for a daemon that is not running", () => {
    expect(isDaemonUnreachable(UNREACHABLE)).toBe(true)
  })

  test('does not mistake another docker failure for it', () => {
    expect(
      isDaemonUnreachable('permission denied while trying to connect')
    ).toBe(false)
  })
})

describe('ensureDockerRunning', () => {
  test('leaves a running Docker alone', async () => {
    const { env, opened } = fakeMachine({ dockerUp: true })

    const result = await ensureDockerRunning({ env, platform: 'darwin' })

    expect({ result, opened: existsSync(opened) }).toEqual({
      result: { started: false, waitedMs: 0 },
      opened: false
    })
  })

  test('opens Docker Desktop on macOS when the daemon is not running, and waits for docker to answer', async () => {
    const { env } = fakeMachine()

    const result = await ensureDockerRunning({ env, platform: 'darwin' })

    expect(result).toEqual({ started: true, waitedMs: expect.any(Number) })
  })

  test('opens the Docker app by name', async () => {
    const { env, opened } = fakeMachine()

    await ensureDockerRunning({ env, platform: 'darwin' })

    expect(readFileSync(opened, 'utf8').trim()).toBe('-a Docker')
  })

  test('says what went wrong when Docker Desktop will not open', async () => {
    const { env } = fakeMachine({ openExit: 1 })

    await expect(
      ensureDockerRunning({ env, platform: 'darwin' })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        "The Docker daemon is not running, and Docker Desktop would not open: Unable to find application named 'Docker'"
    })
  })

  test('gives up when docker still does not answer once the wait is over', async () => {
    const { env } = fakeMachine()
    writeExecutable(join(sandbox, 'bin'), 'open', 'exit 0')

    await expect(
      ensureDockerRunning({
        env: { ...env, TIM_DOCKER_START_WAIT_MS: '50' },
        platform: 'darwin'
      })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: expect.stringContaining(
        'tim opened Docker Desktop, but docker still did not answer'
      )
    })
  })

  test('asks for Docker to be started by hand away from macOS', async () => {
    const { env, opened } = fakeMachine()

    await expect(
      ensureDockerRunning({ env, platform: 'linux' })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'The Docker daemon is not running, and tim can only start Docker Desktop on macOS. Start Docker, then try again.'
    })
    expect(existsSync(opened)).toBe(false)
  })

  test('leaves any other docker failure to the caller', async () => {
    const bin = join(sandbox, 'bin')
    mkdirSync(bin, { recursive: true })
    writeExecutable(bin, 'docker', 'echo "permission denied" >&2\nexit 1')

    const result = await ensureDockerRunning({
      env: { PATH: `${bin}:${process.env.PATH}` },
      platform: 'darwin'
    })

    expect(result).toEqual({ started: false, waitedMs: 0 })
  })
})
