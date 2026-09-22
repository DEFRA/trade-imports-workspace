import { connect } from 'node:net'
import { run } from '../exec/exec.js'
import { STACK_PROJECT } from '../exec/stack.js'

const PROBE_TIMEOUT_MS = 500
const LOOPBACK_HOSTS = ['127.0.0.1', '::1']
const FIELD_SEPARATOR = '\t'

const acceptsConnection = (host, port) =>
  new Promise((resolve) => {
    const socket = connect({ host, port })
    const settle = (held) => {
      socket.destroy()
      resolve(held)
    }
    socket.setTimeout(PROBE_TIMEOUT_MS, () => settle(false))
    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
  })

/**
 * Whether something on this machine is listening on a port, on either
 * loopback address.
 *
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export const isPortHeld = async (port) => {
  const answers = await Promise.all(
    LOOPBACK_HOSTS.map((host) => acceptsConnection(host, port))
  )
  return answers.some(Boolean)
}

const firstLine = (text) =>
  text.split('\n').find((line) => line.trim().length > 0)

const quietly = async (command, args, env) => {
  try {
    return await run(command, args, { env })
  } catch {
    return { exitCode: 1, stdout: '' }
  }
}

const containerHolding = async (port, env) => {
  const result = await quietly(
    'docker',
    [
      'ps',
      '--filter',
      `publish=${port}`,
      '--format',
      `{{.Names}}${FIELD_SEPARATOR}{{.Label "com.docker.compose.project"}}`
    ],
    env
  )
  const line = result.exitCode === 0 ? firstLine(result.stdout) : undefined
  if (!line) return null
  const [name, project = ''] = line.split(FIELD_SEPARATOR)
  return {
    kind: 'container',
    name,
    workspaceStack: project === STACK_PROJECT
  }
}

const lsofField = (lines, prefix) =>
  lines.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? null

const processHolding = async (port, env) => {
  const result = await quietly(
    'lsof',
    ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'],
    env
  )
  const lines = result.exitCode === 0 ? result.stdout.split('\n') : []
  const pid = lsofField(lines, 'p')
  if (!pid) return null
  return { kind: 'process', name: lsofField(lines, 'c'), pid: Number(pid) }
}

/**
 * Who holds a port: a Docker container (and whether it belongs to the
 * workspace stack), else the listening process, else unknown.
 *
 * @param {number} port
 * @param {object} [opts]
 * @param {object} [opts.env] - Extra environment for docker and lsof
 * @returns {Promise<{kind: 'container'|'process'|'unknown', name?: string, pid?: number, workspaceStack?: boolean}>}
 */
export const portHolder = async (port, { env } = {}) =>
  (await containerHolding(port, env)) ??
  (await processHolding(port, env)) ?? { kind: 'unknown' }

/**
 * A holder as words, for a rung's refusal reason.
 *
 * @param {{kind: string, name?: string, pid?: number, workspaceStack?: boolean}} holder
 * @returns {string}
 */
export const describeHolder = ({ kind, name, pid, workspaceStack }) => {
  if (kind === 'container') {
    return workspaceStack
      ? `the workspace stack's ${name} container`
      : `the ${name} container`
  }
  if (kind === 'process') return `${name ?? 'a process'} (pid ${pid})`
  return 'a process tim cannot identify'
}
