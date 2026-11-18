import { machine } from 'node:os'
import { join } from 'node:path'
import { run } from '../exec/exec.js'
import {
  COMPOSE_FILES,
  DEV_COMPOSE_FILE,
  PERF_COMPOSE_FILE,
  stackDir
} from './definition.js'

const composeFilesFor = ({ dev, perf }) => [
  ...COMPOSE_FILES,
  ...(dev ? [DEV_COMPOSE_FILE] : []),
  ...(perf ? [PERF_COMPOSE_FILE] : [])
]

/**
 * The arguments after `docker` that name the stack's compose files and
 * profiles, ready for a compose subcommand to follow.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {boolean} [opts.dev=false] - Add the overlay that builds from local source
 * @param {boolean} [opts.perf=false] - Add the stub-latency overlay
 * @param {string[]} [opts.profiles=[]]
 * @returns {string[]}
 */
export const composeArgs = ({
  workspaceRoot,
  dev = false,
  perf = false,
  profiles = []
}) => [
  'compose',
  ...composeFilesFor({ dev, perf }).flatMap((file) => [
    '-f',
    join(stackDir(workspaceRoot), file)
  ]),
  ...profiles.flatMap((profile) => ['--profile', profile])
]

const LINUX_ARCHITECTURES = {
  x86_64: 'amd64',
  amd64: 'amd64',
  aarch64: 'arm64',
  arm64: 'arm64'
}

const dockerServerArch = async (env) => {
  try {
    const { stdout } = await run(
      'docker',
      ['version', '--format', '{{.Server.Arch}}'],
      { env }
    )
    return stdout.trim()
  } catch {
    return ''
  }
}

/**
 * The platform the dev overlay builds images for: DEV_BUILD_PLATFORM when
 * set, else the Docker daemon's own architecture, else this machine's, as
 * `linux/<arch>`.
 *
 * @param {object} [opts]
 * @param {Record<string, string | undefined>} [opts.env=process.env]
 * @param {() => string} [opts.machineArch] - This machine's architecture, as `uname -m` prints it
 * @returns {Promise<string>}
 */
export const devBuildPlatform = async ({
  env = process.env,
  machineArch = machine
} = {}) => {
  if (env.DEV_BUILD_PLATFORM) return env.DEV_BUILD_PLATFORM
  const arch = (await dockerServerArch(env)) || machineArch()
  return `linux/${LINUX_ARCHITECTURES[arch] ?? arch}`
}

/**
 * The arguments and extra environment a compose call against the stack
 * needs. A dev stack's calls carry DEV_BUILD_PLATFORM, which the dev
 * overlay reads.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {boolean} [opts.dev=false]
 * @param {boolean} [opts.perf=false]
 * @param {string[]} [opts.profiles=[]]
 * @param {Record<string, string | undefined>} [opts.env=process.env]
 * @returns {Promise<{args: string[], env: Record<string, string>}>}
 */
export const composeInvocation = async ({
  workspaceRoot,
  dev = false,
  perf = false,
  profiles = [],
  env = process.env
}) => ({
  args: composeArgs({ workspaceRoot, dev, perf, profiles }),
  env: dev ? { DEV_BUILD_PLATFORM: await devBuildPlatform({ env }) } : {}
})
