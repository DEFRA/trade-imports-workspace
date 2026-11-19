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

const switchTo = async (repoDir, { branch, startPoint }, output) => {
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
  if (startPoint) {
    await checkout(repoDir, ['--no-track', '-b', branch, startPoint], output)
    return 'created from start point'
  }
  await checkout(repoDir, ['-b', branch], output)
  return 'created'
}

const fetchOrigin = async (repoDir, { warn }) => {
  const fetched = await run('git', [
    '-C',
    repoDir,
    'fetch',
    '--quiet',
    'origin'
  ])
  if (fetched.stderr) await warn(fetched.stderr)
  if (fetched.exitCode !== 0) {
    throw new TimError('UNKNOWN', `Can't fetch origin in ${repoDir}.`)
  }
}

const MESSAGES = {
  'already on': ({ branch }) => `already on ${branch}`,
  'switched to existing branch': ({ branch }) =>
    `switched to existing branch ${branch}`,
  'tracking origin': ({ branch }) =>
    `switched to ${branch}, tracking origin/${branch}`,
  'created from start point': ({ branch, startPoint }) =>
    `created ${branch} from ${startPoint} and switched to it`,
  created: ({ branch }) => `created and switched to ${branch}`
}

/**
 * Puts one repo on a branch: stays when it is already there, else switches
 * to the local branch, else creates it tracking `origin/<branch>`, else
 * creates it from `startPoint` without tracking it, or from the current
 * HEAD when there is no start point. With a start point it fetches origin
 * first. git's own output goes to `say` and `warn`, then one line saying
 * what happened.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.repo
 * @param {string} args.branch
 * @param {string} [args.startPoint] - A ref such as origin/main
 * @param {(line: string) => void | Promise<void>} [args.say]
 * @param {(line: string) => void | Promise<void>} [args.warn]
 * @returns {Promise<{repo: string, branch: string, outcome: 'already on'|'switched to existing branch'|'tracking origin'|'created from start point'|'created'}>}
 * @throws {TimError} NOT_FOUND when the repo is not a git repo, UNKNOWN when git fetch or git checkout fails
 */
export const ensureBranch = async ({
  workspaceRoot,
  repo,
  branch,
  startPoint,
  say = silent,
  warn = silent
}) => {
  const repoDir = repoPath(workspaceRoot, repo)
  if (!isDirectory(join(repoDir, '.git'))) {
    throw new TimError('NOT_FOUND', `Not a git repo: ${repoDir}`)
  }
  if (startPoint) await fetchOrigin(repoDir, { warn })
  const current = await run('git', ['-C', repoDir, 'branch', '--show-current'])
  const outcome =
    current.stdout.trim() === branch
      ? 'already on'
      : await switchTo(repoDir, { branch, startPoint }, { say, warn })
  await say(`${repo}: ${MESSAGES[outcome]({ branch, startPoint })}`)
  return { repo, branch, outcome }
}

/**
 * The repos, of those given, whose checkout has uncommitted changes or
 * untracked files.
 *
 * @param {string} workspaceRoot
 * @param {string[]} repos
 * @returns {Promise<string[]>} In the order given
 */
export const reposWithUncommittedChanges = async (workspaceRoot, repos) => {
  const statuses = await Promise.all(
    repos.map((repo) =>
      run('git', ['-C', repoPath(workspaceRoot, repo), 'status', '--porcelain'])
    )
  )
  return repos.filter((_repo, index) => statuses[index].stdout.trim() !== '')
}
