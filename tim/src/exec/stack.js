import { existsSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { run, runToLog } from './exec.js'
import { ensureDockerRunning, isDaemonUnreachable } from './docker-daemon.js'
import { TimError } from '../errors.js'
import { STACK_PROJECT } from '../stack/definition.js'

export { STACK_PROJECT }

const nonEmptyLines = (text) =>
  text.split('\n').filter((line) => line.trim().length > 0)

/**
 * The workspace stack's running containers, by name. A Docker Desktop that
 * has quit is started, and docker asked again once.
 *
 * @param {object} [opts]
 * @param {object} [opts.env] - Extra environment for docker
 * @returns {Promise<string[]>}
 * @throws {TimError} MISSING_DEP when docker is not installed, UNKNOWN when docker cannot list containers or Docker cannot be brought back
 */
export const stackContainers = ({ env } = {}) => listStack('{{.Names}}', env)

/**
 * The workspace stack's running containers, by id. A container recreated by
 * a restart gets a new id, so the ids tell one stack from another started in
 * its place.
 *
 * @param {object} [opts]
 * @param {object} [opts.env] - Extra environment for docker
 * @returns {Promise<string[]>}
 * @throws {TimError} as stackContainers does
 */
export const stackContainerIds = ({ env } = {}) => listStack('{{.ID}}', env)

/**
 * Write every workspace stack container's own log, with timestamps, to
 * `<logsDir>/<prefix>-<container>.log`. The stack is taken down when its lease
 * is given back, and its container logs go with it, so a failure that only
 * the services' logs explain has to be captured before then.
 *
 * @param {object} args
 * @param {string} args.logsDir
 * @param {string} args.prefix - Start of each file name, such as "gate-stack"
 * @param {object} [args.env] - Extra environment for docker
 * @returns {Promise<string[]>} The log files written, one per container
 * @throws {TimError} as stackContainers does
 */
export const writeStackLogs = async ({ logsDir, prefix, env }) => {
  const containers = await stackContainers({ env })
  const written = []
  for (const container of containers) {
    const { log } = await runToLog(
      'docker',
      ['logs', '--timestamps', container],
      {
        logPath: join(logsDir, `${prefix}-${container}.log`),
        env
      }
    )
    written.push(log)
  }
  return written
}

const psStack = (format, env) =>
  run(
    'docker',
    [
      'ps',
      '--filter',
      `label=com.docker.compose.project=${STACK_PROJECT}`,
      '--format',
      format
    ],
    { env }
  )

// Every lease and gate path reads the stack through here, so a Docker Desktop
// that quit under a run is brought back here, then asked again once.
const psStackWithDocker = async (format, env) => {
  const first = await psStack(format, env)
  if (first.exitCode === 0 || !isDaemonUnreachable(first.stderr)) return first
  await ensureDockerRunning({ env })
  return psStack(format, env)
}

const listedOrThrow = (result) => {
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Can't list the workspace stack's containers: ${result.stderr.trim() || `docker exited ${result.exitCode}`}`
    )
  }
  return nonEmptyLines(result.stdout)
}

const listStack = async (format, env) =>
  listedOrThrow(await psStackWithDocker(format, env))

const COMPOSE_WORKING_DIR_LABEL = 'com.docker.compose.project.working_dir'
const COMPOSE_FOLDER = join('docker', 'stack')

const workspaceOfComposeFolder = (workingDir) =>
  workingDir.endsWith(`/${COMPOSE_FOLDER}`)
    ? workingDir.slice(0, -(COMPOSE_FOLDER.length + 1))
    : workingDir

const canonicalPath = (path) =>
  existsSync(path) ? realpathSync(path) : resolve(path)

/**
 * Whether two paths name the same workspace clone once symlinks are
 * followed.
 *
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
export const isSameWorkspace = (left, right) =>
  canonicalPath(left) === canonicalPath(right)

/**
 * The workspace clones the running stack's containers were started from,
 * read from each container's compose working folder label. Empty when the
 * stack is down or the Docker daemon is not running: Docker Desktop is never
 * started to ask.
 *
 * @param {object} [opts]
 * @param {object} [opts.env] - Extra environment for docker
 * @returns {Promise<string[]>}
 * @throws {TimError} MISSING_DEP when docker is not installed, UNKNOWN when docker cannot list containers
 */
export const stackOwners = async ({ env } = {}) => {
  const result = await psStack(`{{.Label "${COMPOSE_WORKING_DIR_LABEL}"}}`, env)
  if (result.exitCode !== 0 && isDaemonUnreachable(result.stderr)) return []
  const workingDirs = listedOrThrow(result)
  return [...new Set(workingDirs.map(workspaceOfComposeFolder))].sort()
}

/**
 * The clone that started the running stack, when that is not the given
 * workspace. Null when the stack is down or this workspace started it.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {object} [args.env] - Extra environment for docker
 * @returns {Promise<string|null>}
 * @throws {TimError} as stackOwners does
 */
export const otherCloneOwningStack = async ({ workspaceRoot, env }) => {
  const owners = await stackOwners({ env })
  return owners.find((owner) => !isSameWorkspace(owner, workspaceRoot)) ?? null
}
