import { join } from 'node:path'
import { repoPath } from '../constants/repos.js'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'
import { isDirectory } from './state.js'

const silent = () => undefined

const hasRef = async (repoDir, ref) =>
  (await run('git', ['-C', repoDir, 'show-ref', '--verify', '--quiet', ref]))
    .exitCode === 0

const checkout = async (repoDir, args, { say, warn }) => {
  const result = await run('git', ['-C', repoDir, 'checkout', ...args])
  if (result.stdout) await say(result.stdout)
  if (result.stderr) await warn(result.stderr)
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `Cannot run git checkout ${args.join(' ')} in ${repoDir}`
    )
  }
}

const switchTo = async (repoDir, branch, output) => {
  if (await hasRef(repoDir, `refs/heads/${branch}`)) {
    await checkout(repoDir, [branch], output)
    return 'switched to existing branch'
  }
  if (await hasRef(repoDir, `refs/remotes/origin/${branch}`)) {
    await checkout(
      repoDir,
      ['-b', branch, '--track', `origin/${branch}`],
      output
    )
    return 'tracking origin'
  }
  await checkout(repoDir, ['-b', branch], output)
  return 'created'
}

const MESSAGES = {
  'already on': (branch) => `already on ${branch}`,
  'switched to existing branch': (branch) =>
    `switched to existing branch ${branch}`,
  'tracking origin': (branch) =>
    `switched to ${branch}, tracking origin/${branch}`,
  created: (branch) => `created and switched to ${branch}`
}

/**
 * Puts one repo on a branch: stays when it is already there, else switches
 * to the local branch, else creates it tracking `origin/<branch>`, else
 * creates it from the current HEAD. git's own output goes to `say` and
 * `warn`, then one line saying what happened.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.repo
 * @param {string} args.branch
 * @param {(line: string) => void | Promise<void>} [args.say]
 * @param {(line: string) => void | Promise<void>} [args.warn]
 * @returns {Promise<{repo: string, branch: string, outcome: 'already on'|'switched to existing branch'|'tracking origin'|'created'}>}
 * @throws {TimError} NOT_FOUND when the repo is not a git repo, UNKNOWN when git checkout fails
 */
export const ensureBranch = async ({
  workspaceRoot,
  repo,
  branch,
  say = silent,
  warn = silent
}) => {
  const repoDir = repoPath(workspaceRoot, repo)
  if (!isDirectory(join(repoDir, '.git'))) {
    throw new TimError('NOT_FOUND', `Not a git repo: ${repoDir}`)
  }
  const current = await run('git', ['-C', repoDir, 'branch', '--show-current'])
  const outcome =
    current.stdout.trim() === branch
      ? 'already on'
      : await switchTo(repoDir, branch, { say, warn })
  await say(`${repo}: ${MESSAGES[outcome](branch)}`)
  return { repo, branch, outcome }
}
