import { run } from './exec.js'
import { TimError } from '../errors.js'

const DEFAULT_WAIT_MS = 5 * 60 * 1000
const DEFAULT_POLL_MS = 3000

const DAEMON_UNREACHABLE =
  /Cannot connect to the Docker daemon|Is the docker daemon running/i

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const secondsIn = (ms) => {
  const seconds = Math.round(ms / 1000)
  return seconds === 1 ? '1 second' : `${seconds} seconds`
}

const numberFrom = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const settingsFrom = (env) => {
  const merged = { ...process.env, ...env }
  return {
    waitMs: numberFrom(merged.TIM_DOCKER_START_WAIT_MS, DEFAULT_WAIT_MS),
    pollMs: numberFrom(merged.TIM_DOCKER_START_POLL_MS, DEFAULT_POLL_MS)
  }
}

/**
 * Whether docker's error output says the daemon is not there to answer.
 *
 * @param {string} stderr
 * @returns {boolean}
 */
export const isDaemonUnreachable = (stderr = '') =>
  DAEMON_UNREACHABLE.test(stderr)

const NOT_INSTALLED = { exitCode: 127, stdout: '', stderr: '' }

// A machine with no docker at all is not one to start Docker Desktop on: the
// caller's own docker command reports that.
const askDaemon = async (env) => {
  try {
    return await run('docker', ['info', '--format', '{{.ServerVersion}}'], {
      env
    })
  } catch (error) {
    if (error?.code === 'MISSING_DEP') return NOT_INSTALLED
    throw error
  }
}

const daemonAnswers = async (env) => (await askDaemon(env)).exitCode === 0

const waitForDaemon = async (env, { waitMs, pollMs }) => {
  const deadline = Date.now() + waitMs
  while (Date.now() < deadline) {
    if (await daemonAnswers(env)) return true
    await pause(pollMs)
  }
  return daemonAnswers(env)
}

/**
 * Start Docker Desktop when its daemon is not running, and wait for it to
 * answer. Docker Desktop can quit under a build run: a Homebrew cask upgrade
 * quits it, then fails at sudo and never reopens it. Only macOS can be
 * started this way; anywhere else the caller is told to start Docker.
 *
 * TIM_DOCKER_START_WAIT_MS (default five minutes) caps the wait, and
 * TIM_DOCKER_START_POLL_MS (default three seconds) sets how often docker is
 * asked.
 *
 * @param {object} [opts]
 * @param {object} [opts.env] - Extra environment for docker and open
 * @param {string} [opts.platform] - The operating system, as process.platform names it
 * @returns {Promise<{started: boolean, waitedMs: number}>} started is false when the daemon already answered, or when docker failed for some other reason the caller will meet itself
 * @throws {TimError} UNKNOWN when Docker cannot be started here, or did not answer in time
 */
export const ensureDockerRunning = async ({
  env,
  platform = process.platform
} = {}) => {
  const asked = await askDaemon(env)
  if (asked.exitCode === 0 || !isDaemonUnreachable(asked.stderr)) {
    return { started: false, waitedMs: 0 }
  }
  if (platform !== 'darwin') {
    throw new TimError(
      'UNKNOWN',
      'The Docker daemon is not running, and tim can only start Docker Desktop on macOS. Start Docker, then try again.'
    )
  }
  const startedAt = Date.now()
  const opened = await run('open', ['-a', 'Docker'], { env })
  if (opened.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `The Docker daemon is not running, and Docker Desktop would not open: ${opened.stderr.trim() || `open exited ${opened.exitCode}`}`
    )
  }
  const settings = settingsFrom(env)
  if (!(await waitForDaemon(env, settings))) {
    throw new TimError(
      'UNKNOWN',
      `The Docker daemon is not running. tim opened Docker Desktop, but docker still did not answer after ${secondsIn(settings.waitMs)}. Check Docker Desktop, then try again.`
    )
  }
  const waitedMs = Date.now() - startedAt
  process.stderr.write(
    `Docker Desktop was not running, so tim started it. Docker answered after ${secondsIn(waitedMs)}.\n`
  )
  return { started: true, waitedMs }
}
