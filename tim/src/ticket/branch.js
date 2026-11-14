import { statSync } from 'node:fs'
import { join } from 'node:path'
import { repoPath } from '../constants/repos.js'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'

export const BRANCH_TYPES = ['feat', 'fix', 'chore']

/**
 * Whether a ticket key is one a ticket branch can carry: an EUDPA key, or
 * NO_JIRA for work with no ticket yet.
 *
 * @param {string} ticket
 * @returns {boolean}
 */
export const isBranchTicket = (ticket) =>
  ticket.startsWith('EUDPA-') || ticket === 'NO_JIRA'

const gitStepError = (result, { repoDir, args }) => {
  const error = new TimError(
    'UNKNOWN',
    result.stderr.trim() || `git ${args.join(' ')} failed in ${repoDir}`
  )
  error.gitExitCode = result.exitCode
  return error
}

const git = async (repoDir, args) => {
  const result = await run('git', ['-C', repoDir, ...args])
  if (result.exitCode !== 0) throw gitStepError(result, { repoDir, args })
  return result.stdout.trim()
}

const hasRef = async (repoDir, ref) =>
  (await run('git', ['-C', repoDir, 'show-ref', '--verify', '--quiet', ref]))
    .exitCode === 0

const switchToTicketBranch = async ({ repoDir, branch, log }) => {
  if (await hasRef(repoDir, `refs/heads/${branch}`)) {
    await log(`→ checkout existing ${branch}`)
    await git(repoDir, ['checkout', '--quiet', branch])
    return
  }
  if (await hasRef(repoDir, `refs/remotes/origin/${branch}`)) {
    await log(`→ checkout ${branch} tracking origin/${branch}`)
    await git(repoDir, [
      'checkout',
      '--quiet',
      '-b',
      branch,
      '--track',
      `origin/${branch}`
    ])
    return
  }
  await log(`→ checkout -b ${branch}`)
  await git(repoDir, ['checkout', '--quiet', '-b', branch])
}

const isGitCheckout = (repoDir) =>
  statSync(join(repoDir, '.git'), { throwIfNoEntry: false })?.isDirectory() ??
  false

/**
 * Puts one repo on `<type>/<ticket>-<slug>`: fetches origin, checks out
 * and fast-forwards the base, then switches to the branch if it is here,
 * else creates it tracking `origin/<branch>` if origin has it, else
 * creates it from the base. Running it again switches to the same branch.
 * A git step that fails stops it with git's message.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket - An EUDPA key or NO_JIRA, kept as given
 * @param {string} args.repo
 * @param {string} args.slug
 * @param {string} [args.type='feat'] - One of {@link BRANCH_TYPES}
 * @param {string} [args.base='main']
 * @param {(line: string) => Promise<void>} [args.log] - Receives each progress line
 * @returns {Promise<{ticket: string, repo: string, branch: string, base: string, head: string, repoDir: string}>}
 * @throws {TimError} NOT_FOUND when the repo is not a git checkout; UNKNOWN, with `gitExitCode`, when a git step fails
 */
export const setUpTicketBranch = async ({
  workspaceRoot,
  ticket,
  repo,
  slug,
  type = 'feat',
  base = 'main',
  log = async () => {}
}) => {
  const repoDir = repoPath(workspaceRoot, repo)
  if (!isGitCheckout(repoDir)) {
    throw new TimError(
      'NOT_FOUND',
      `Error: repo not found or not a git checkout: ${repoDir}`
    )
  }
  const branch = `${type}/${ticket}-${slug}`

  await log(`→ fetch origin (${repo})`)
  await git(repoDir, ['fetch', '--quiet', 'origin'])
  await log(`→ checkout ${base}`)
  await git(repoDir, ['checkout', '--quiet', base])
  await log('→ pull')
  await git(repoDir, ['pull', '--quiet', '--ff-only'])
  await switchToTicketBranch({ repoDir, branch, log })

  const head = await git(repoDir, ['rev-parse', 'HEAD'])
  return { ticket, repo, branch, base, head, repoDir }
}
