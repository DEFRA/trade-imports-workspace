import { createConnection } from 'node:net'
import { execa } from 'execa'
import { TimError } from '../../errors.js'

const DEFAULT_PORT = { 'http:': 80, 'https:': 443 }

/**
 * The host and port a base URL names.
 *
 * @param {string} baseUrl
 * @returns {{host: string, port: number}}
 * @throws {TimError} USAGE when the URL cannot be read
 */
export const addressOf = (baseUrl) => {
  let url
  try {
    url = new URL(baseUrl)
  } catch {
    throw new TimError('USAGE', `"${baseUrl}" is not a URL tim can connect to.`)
  }
  // `new URL` accepts "localhost:3010" — protocol "localhost:", path "3010" —
  // and leaves the hostname empty, so an address that reads fine to a person
  // silently becomes port 80 on no host. Insist on the scheme.
  if (!DEFAULT_PORT[url.protocol] || !url.hostname) {
    throw new TimError('USAGE', `"${baseUrl}" is not a URL tim can connect to.`)
  }
  return {
    host: url.hostname,
    port: Number(url.port || DEFAULT_PORT[url.protocol])
  }
}

/**
 * Whether anything is accepting connections on a port.
 *
 * A TCP connect rather than a request, because the Prototype Kit accepts
 * connections before its first response settles under Node 24: an HTTP probe
 * hangs where a connect answers straight away, and the run then times out
 * waiting for a server that is already up.
 *
 * @param {object} args
 * @param {string} args.host
 * @param {number} args.port
 * @param {number} [args.timeoutMs]
 * @returns {Promise<boolean>}
 */
export const isListening = ({ host, port, timeoutMs = 500 }) =>
  new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const settle = (answer) => {
      socket.destroy()
      resolve(answer)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => settle(true))
    socket.once('timeout', () => settle(false))
    socket.once('error', () => settle(false))
  })

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wait until something answers on a port, or give up.
 *
 * @param {object} args
 * @param {string} args.host
 * @param {number} args.port
 * @param {number} [args.timeoutMs]
 * @param {number} [args.intervalMs]
 * @param {Function} [args.probe] - Injected by the tests
 * @param {() => number} [args.clock]
 * @param {Function} [args.sleep]
 * @returns {Promise<boolean>} Whether it came up
 */
export const waitForPort = async ({
  host,
  port,
  timeoutMs = 180_000,
  intervalMs = 250,
  probe = isListening,
  clock = () => Date.now(),
  sleep = pause
}) => {
  const deadline = clock() + timeoutMs
  for (;;) {
    if (await probe({ host, port })) return true
    if (clock() >= deadline) return false
    await sleep(intervalMs)
  }
}

/**
 * A start command as an argv, whether it was written as one or as a sentence.
 *
 * No shell: a corpus entry is data, and running data through a shell is how a
 * data edit becomes arbitrary code. Which also means no pipes, no redirects
 * and no `&&` — a start command that needs those needs a script in the repo it
 * starts.
 *
 * @param {string|string[]} startCommand
 * @returns {string[]}
 * @throws {TimError} USAGE when it is empty or asks for a shell
 */
export const argvOf = (startCommand) => {
  const argv = Array.isArray(startCommand)
    ? startCommand.filter(Boolean)
    : String(startCommand ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
  if (!argv.length) {
    throw new TimError('USAGE', 'app.startCommand is empty.')
  }
  if (argv.some((word) => /[|&;<>()$`]/.test(word))) {
    throw new TimError(
      'USAGE',
      `tim runs app.startCommand directly rather than through a shell, so it cannot contain shell characters: ${argv.join(' ')}. Put the pipeline in a script in the application's own repo and name that instead.`
    )
  }
  return argv
}

const spawnApp = ({ argv, cwd, env }) => {
  const child = execa(argv[0], argv.slice(1), {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'ignore',
    // Its own process group, so stopping it stops the server the package
    // manager started rather than only the package manager.
    detached: true,
    reject: false
  })
  child.catch(() => {})
  return child
}

const stopper = (child) => async () => {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
  await Promise.race([child.catch(() => {}), pause(5_000)])
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

/**
 * Have the application running, whoever started it.
 *
 * The map and the capture both need one thing before a browser is any use: an
 * application answering on the base URL. Left to Playwright, a stopped
 * application surfaces as `net::ERR_CONNECTION_REFUSED` on the first goto,
 * which says nothing about which application, on which port, started how — so
 * the knowledge of how to serve each side lives in the corpus, next to the URL
 * it serves, and this uses it.
 *
 * An application already listening is used as it stands and left running: it is
 * somebody else's, quite possibly the person watching, and stopping it would
 * take their terminal down with the run.
 *
 * @param {object} args
 * @param {object} [args.app] - The side's app entry from the corpus
 * @param {string} args.baseUrl
 * @param {string} args.label - What to call it in the messages
 * @param {(line: string) => void} [args.log]
 * @param {Function} [args.probe] - Injected by the tests
 * @param {Function} [args.launch] - Injected by the tests
 * @returns {Promise<{started: boolean, alreadyRunning: boolean, stop: () => Promise<void>}>}
 * @throws {TimError} USAGE when nothing is listening and nothing says how to start it
 * @throws {TimError} NETWORK when the command runs and the port never opens
 */
export const ensureApp = async ({
  app,
  baseUrl,
  label,
  log = () => {},
  probe = isListening,
  launch = spawnApp,
  clock,
  sleep
}) => {
  const { host, port } = addressOf(baseUrl)
  const idle = { started: false, alreadyRunning: false, stop: async () => {} }

  if (await probe({ host, port })) {
    log(`Using the ${label} already listening on ${baseUrl}.`)
    return { ...idle, alreadyRunning: true }
  }

  if (!app?.startCommand) {
    throw new TimError(
      'USAGE',
      `Nothing is listening on ${baseUrl}, and the corpus does not say how to start the ${label}. Start it yourself, or add app.startCommand to the "${label}" side in tools/parity/corpora.json.`
    )
  }

  const argv = argvOf(app.startCommand)
  const cwd = app.cwd ?? process.cwd()
  const env = { PORT: String(port), ...(app.env ?? {}) }
  const readyTimeoutMs = app.readyTimeoutMs ?? 180_000

  log(
    `Nothing on ${baseUrl}. Starting the ${label}: ${argv.join(' ')} in ${cwd}`
  )
  const child = launch({ argv, cwd, env })
  const stop = stopper(child)

  const ready = await waitForPort({
    host,
    port,
    timeoutMs: readyTimeoutMs,
    probe,
    clock,
    sleep
  })
  if (!ready) {
    await stop()
    throw new TimError(
      'NETWORK',
      `The ${label} did not answer on ${baseUrl} within ${Math.round(readyTimeoutMs / 1000)} seconds. The command was "${argv.join(' ')}" in ${cwd}. Run it by hand to see what it says.`
    )
  }

  log(`The ${label} is listening on ${baseUrl}.`)
  return { started: true, alreadyRunning: false, stop }
}
