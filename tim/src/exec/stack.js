import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { run, runStreamed, runToLog } from './exec.js'
import { ensureDockerRunning, isDaemonUnreachable } from './docker-daemon.js'
import { TimError } from '../errors.js'

const START_SCRIPT = 'run-stack.sh'

// Starting the stack needs the Docker daemon, so Docker Desktop is brought
// back first when it has quit.
const readyForScript = async (script, env) => {
  if (script === START_SCRIPT) await ensureDockerRunning({ env })
}

/**
 * Resolve the path to a script in scripts/stack/ under the workspace root.
 *
 * @param {string} workspaceRoot
 * @param {string} scriptName - File name (e.g. "run-stack.sh")
 * @returns {string} Absolute path
 * @throws {TimError} USAGE when the script does not exist
 */
export const stackScriptPath = (workspaceRoot, scriptName) => {
  const path = join(workspaceRoot, 'scripts', 'stack', scriptName)
  if (!existsSync(path)) {
    throw new TimError(
      'USAGE',
      `Cannot find ${scriptName} at ${path}. Is this a trade-imports workspace?`
    )
  }
  return path
}

/**
 * Run a script under scripts/stack/ with its stdio inherited so the child
 * controls the terminal (handy for `up` progress, `restart` output etc.).
 * Starting the stack brings Docker Desktop back first when it has quit.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.script
 * @param {string[]} [args.args]
 * @param {object} [args.env] - Extra environment for docker and the script
 * @returns {Promise<{exitCode: number, durationMs: number}>}
 * @throws {TimError} as ensureDockerRunning does, when Docker cannot be brought back to start the stack
 */
export const runStackScript = async ({
  workspaceRoot,
  script,
  args = [],
  env
}) => {
  const path = stackScriptPath(workspaceRoot, script)
  await readyForScript(script, env)
  return runStreamed(path, args, { cwd: workspaceRoot, env })
}

/**
 * Run a script under scripts/stack/ with its output written to a log file
 * instead of the terminal — the same scripts `tim docker dev|down` run.
 * Starting the stack brings Docker Desktop back first when it has quit.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.script
 * @param {string[]} [args.args]
 * @param {string} args.logPath
 * @param {object} [args.env] - Extra environment for docker and the script
 * @returns {Promise<{exitCode: number, durationMs: number, log: string}>}
 * @throws {TimError} as ensureDockerRunning does, when Docker cannot be brought back to start the stack
 */
export const runStackScriptToLog = async ({
  workspaceRoot,
  script,
  args = [],
  logPath,
  env
}) => {
  const path = stackScriptPath(workspaceRoot, script)
  await readyForScript(script, env)
  return runToLog(path, args, { cwd: workspaceRoot, logPath, env })
}

// docker/stack/compose.yml's `name:`. Every container the stack starts
// carries it as its compose project label.
export const STACK_PROJECT = 'trade-imports'

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

const listStack = async (format, env) => {
  const result = await psStackWithDocker(format, env)
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Can't list the workspace stack's containers: ${result.stderr.trim() || `docker exited ${result.exitCode}`}`
    )
  }
  return nonEmptyLines(result.stdout)
}
