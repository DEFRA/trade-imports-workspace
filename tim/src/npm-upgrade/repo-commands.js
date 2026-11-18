import { run, runToLog } from '../exec/exec.js'
import { onRepoNode } from '../exec/nvm.js'

/**
 * A step that has to work did not, so the command stops with the step's
 * exit code, as a Bash script under `set -e` did.
 */
export class StepFailed extends Error {
  constructor(exitCode, step) {
    super(`${step} failed with exit ${exitCode}`)
    this.exitCode = exitCode
  }
}

/**
 * Runs npm and git in a repo checkout. npm runs on the Node version the
 * folder's `.nvmrc` names.
 *
 * @param {object} [options]
 * @param {Record<string, string | undefined>} [options.env] - Where NVM_DIR and HOME come from
 */
export const repoCommands = ({ env = process.env } = {}) => {
  const npmCommand = (args, cwd) => {
    const {
      command,
      args: commandArgs,
      env: nvmEnv
    } = onRepoNode('npm', args, env)
    return { command, commandArgs, opts: { cwd, env: nvmEnv } }
  }

  const npmToLog = (args, { cwd, logPath, append = false }) => {
    const { command, commandArgs, opts } = npmCommand(args, cwd)
    return runToLog(command, commandArgs, {
      ...opts,
      logPath,
      append,
      commandHeader: false
    })
  }

  const npm = (args, { cwd }) => {
    const { command, commandArgs, opts } = npmCommand(args, cwd)
    return run(command, commandArgs, opts)
  }

  const git = (checkout, args) => run('git', ['-C', checkout, ...args])

  const gitToLog = (checkout, args, { logPath, append = false }) =>
    runToLog('git', ['-C', checkout, ...args], {
      logPath,
      append,
      commandHeader: false
    })

  const mustGit = async (checkout, args) => {
    const result = await git(checkout, args)
    if (result.exitCode !== 0) {
      throw new StepFailed(result.exitCode, `git ${args[0]}`)
    }
    return result
  }

  return { npm, npmToLog, git, gitToLog, mustGit }
}

/**
 * @param {{git: Function}} commands - From {@link repoCommands}
 * @param {string} checkout
 * @returns {Promise<boolean>} Whether a tracked file has changes, as `git status --porcelain -uno` reports them
 */
export const hasTrackedChanges = async ({ git }, checkout) =>
  (await git(checkout, ['status', '--porcelain', '-uno'])).stdout !== ''

/**
 * The last lines of a log, as `tail -n <count>` prints them.
 *
 * @param {string} text
 * @param {number} count
 * @returns {string}
 */
export const lastLinesOf = (text, count) => {
  if (text === '') return ''
  const endsWithNewline = text.endsWith('\n')
  const body = endsWithNewline ? text.slice(0, -1) : text
  const lines = body.split('\n').slice(-count).join('\n')
  return endsWithNewline ? `${lines}\n` : lines
}
