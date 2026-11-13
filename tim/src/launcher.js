#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveWorkspaceRoot } from './env/workspace-root.js'
import { USAGE } from './constants/exitCodes.js'

const WORKSPACE_FLAG = '--workspace'

/**
 * @param {string[]} args - Command-line arguments after the script path
 * @returns {string | undefined} The value given to `--workspace`, in either
 *   `--workspace <path>` or `--workspace=<path>` form
 */
export const workspaceFlagValue = (args) => {
  const index = args.findIndex(
    (arg) => arg === WORKSPACE_FLAG || arg.startsWith(`${WORKSPACE_FLAG}=`)
  )
  if (index === -1) return undefined
  const flag = args[index]
  return flag === WORKSPACE_FLAG
    ? args[index + 1]
    : flag.slice(WORKSPACE_FLAG.length + 1)
}

const addressedWorkspaceRoot = ({ args, env, cwd }) => {
  try {
    return resolveWorkspaceRoot({
      explicit: workspaceFlagValue(args),
      env: env.TIM_WORKSPACE,
      cwd
    })
  } catch {
    return null
  }
}

const cloneCliPath = (workspaceRoot) => {
  const cliPath = join(workspaceRoot, 'tim', 'src', 'cli.js')
  const isClone =
    existsSync(cliPath) && existsSync(join(workspaceRoot, 'repos.json'))
  return isClone ? realpathSync(cliPath) : null
}

/**
 * The `cli.js` a command runs: the one in the workspace clone it addresses
 * (`--workspace`, then `TIM_WORKSPACE`, then the folders above `cwd`), or
 * `ownCli` when that workspace holds no tim of its own.
 *
 * @param {object} opts
 * @param {string[]} opts.args - Command-line arguments after the script path
 * @param {Record<string, string | undefined>} [opts.env]
 * @param {string} [opts.cwd]
 * @param {string} [opts.ownCli] - The `cli.js` beside this launcher
 * @returns {string} The path to that `cli.js`, with every symlink resolved
 */
export const cliToRun = ({
  args,
  env = process.env,
  cwd = process.cwd(),
  ownCli = fileURLToPath(new URL('./cli.js', import.meta.url))
}) => {
  const workspaceRoot = addressedWorkspaceRoot({ args, env, cwd })
  const cloneCli = workspaceRoot ? cloneCliPath(workspaceRoot) : null
  return cloneCli ?? realpathSync(ownCli)
}

const launch = async () => {
  const cliPath = cliToRun({ args: process.argv.slice(2) })
  const timFolder = dirname(dirname(cliPath))
  if (!existsSync(join(timFolder, 'node_modules'))) {
    process.stderr.write(
      `The tim in ${timFolder} has no dependencies installed. Run npm ci in that folder, then try again.\n`
    )
    process.exitCode = USAGE
    return
  }
  process.argv[1] = cliPath
  await import(pathToFileURL(cliPath).href)
}

const isEntryPoint =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (isEntryPoint) await launch()
