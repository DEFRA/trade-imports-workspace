import { statSync } from 'node:fs'
import { run } from '../../exec/exec.js'
import { resolveSonarToken } from '../token.js'
import { hookPushOf, pushFolderOf } from './hook-input.js'
import { PASSED, runPushCheck } from './pipeline.js'

const isFolder = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const repoTopOrFolder = async (folder, env) => {
  try {
    const top = await run(
      'git',
      ['-C', folder, 'rev-parse', '--show-toplevel'],
      {
        env,
        extendEnv: false
      }
    )
    return top.exitCode === 0 ? top.stdout : folder
  } catch {
    return folder
  }
}

/**
 * The repo a push command pushes: the folder it names or runs in, narrowed
 * to the top of its git repo. Null when that folder does not exist.
 *
 * @param {{command: string, cwd: string}} push
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<string|null>}
 */
export const pushedRepoOf = async ({ command, cwd }, env) => {
  const folder = pushFolderOf(command, { cwd, home: env.HOME ?? '' })
  const repo = await repoTopOrFolder(folder, env)
  return repo && isFolder(repo) ? repo : null
}

const checkPush = async (push, { env, writeError }) => {
  const token = await resolveSonarToken({
    env,
    timeoutMs: Number.POSITIVE_INFINITY
  })
  const repo = await pushedRepoOf(push, env)
  if (!repo) return PASSED
  const buildEnv = token ? { ...env, SONAR_TOKEN: token } : env
  const { exitCode } = await runPushCheck({
    dir: repo,
    env: buildEnv,
    token,
    writeError
  })
  return exitCode
}

/**
 * Answers a Claude Code PreToolUse hook for a Bash call. A call that pushes
 * runs the pre-push check on the repo it pushes, with SONAR_TOKEN from the
 * environment or, failing that, from an interactive zsh. Any other call,
 * and any error, exits 0 so the hook never blocks by accident.
 *
 * @param {object} args
 * @param {string} args.input - the hook's stdin
 * @param {Record<string, string|undefined>} [args.env]
 * @param {(text: string) => void} [args.writeError]
 * @returns {Promise<number>} 0 to let the call run, 2 to block it
 */
export const runPushCheckHook = async ({
  input,
  env = process.env,
  writeError = (text) => process.stderr.write(text)
}) => {
  const push = hookPushOf(input)
  if (!push) return PASSED
  try {
    return await checkPush(push, { env, writeError })
  } catch (error) {
    writeError(`Push check skipped: ${error.message ?? error}\n`)
    return PASSED
  }
}
