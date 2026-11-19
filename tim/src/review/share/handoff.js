import { mkdtempSync, renameSync, rmdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../../errors.js'
import { run } from '../../exec/exec.js'

const SHARED_PREFIX = 'workareas/shared/'

const gitIn =
  (workspaceRoot) =>
  async (...args) => {
    const result = await run('git', ['-C', workspaceRoot, ...args])
    if (result.exitCode !== 0) {
      throw new TimError(
        'UNKNOWN',
        `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`
      )
    }
    return result.stdout
  }

const hasRef = async (workspaceRoot, ref) =>
  (
    await run('git', [
      '-C',
      workspaceRoot,
      'show-ref',
      '--verify',
      '--quiet',
      ref
    ])
  ).exitCode === 0

const refuseChangesOutsideShared = async (git) => {
  const changes = (await git('status', '--porcelain', '-uall'))
    .split('\n')
    .filter((line) => line !== '' && !line.includes(SHARED_PREFIX))
  if (changes.length > 0) {
    throw new TimError(
      'DIRTY_TREE',
      [
        'Workspace has uncommitted changes outside workareas/shared/:',
        ...changes,
        'Commit or stash before running tim review share, or pass --comment-only to post without a handoff branch.'
      ].join('\n')
    )
  }
}

const checkOutHandoffBranch = async ({ workspaceRoot, git, branch }) => {
  if (await hasRef(workspaceRoot, `refs/heads/${branch}`)) {
    await git('checkout', '--quiet', branch)
  } else if (await hasRef(workspaceRoot, `refs/remotes/origin/${branch}`)) {
    await git(
      'checkout',
      '--quiet',
      '-b',
      branch,
      '--track',
      `origin/${branch}`
    )
  } else {
    await git('checkout', '--quiet', '-b', branch)
  }
}

const switchKeepingSharedCopy = async ({
  workspaceRoot,
  git,
  branch,
  sharedDir
}) => {
  const parking = mkdtempSync(
    join(workspaceRoot, 'workareas', '.share-review-')
  )
  const parked = join(parking, 'payload')
  renameSync(sharedDir, parked)
  try {
    await checkOutHandoffBranch({ workspaceRoot, git, branch })
  } catch (error) {
    renameSync(parked, sharedDir)
    rmdirSync(parking)
    throw error
  }
  rmSync(sharedDir, { recursive: true, force: true })
  renameSync(parked, sharedDir)
  rmdirSync(parking)
}

const commitSharedCopy = async ({ workspaceRoot, git, ticket }) => {
  await git('add', `${SHARED_PREFIX}${ticket}`)
  const staged = await run('git', [
    '-C',
    workspaceRoot,
    'diff',
    '--cached',
    '--quiet'
  ])
  if (staged.exitCode === 0) return false
  await git(
    'commit',
    '--quiet',
    '-m',
    `review(${ticket}): handoff artefacts\n\nPosted by tim review share.`
  )
  return true
}

/**
 * Commits a review's workareas/shared/ copy to its handoff branch and
 * pushes the branch to origin, then returns the workspace to the branch it
 * was on. The branch is the local one when it exists, else origin's,
 * tracked, else a new one from the current branch. The push is never
 * forced.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @param {string} args.branch - The handoff branch
 * @param {string} args.sharedDir - workareas/shared/<ticket>, already copied
 * @returns {Promise<{committed: boolean}>} committed is false when the branch already held this copy
 * @throws {TimError} DIRTY_TREE when the workspace has changes outside workareas/shared/; UNKNOWN when a git step fails
 */
export const pushHandoffBranch = async ({
  workspaceRoot,
  ticket,
  branch,
  sharedDir
}) => {
  const git = gitIn(workspaceRoot)
  await refuseChangesOutsideShared(git)
  const startingBranch = (await git('rev-parse', '--abbrev-ref', 'HEAD')).trim()
  await switchKeepingSharedCopy({ workspaceRoot, git, branch, sharedDir })
  try {
    const committed = await commitSharedCopy({ workspaceRoot, git, ticket })
    await git('push', '--quiet', '-u', 'origin', branch)
    return { committed }
  } finally {
    await git('checkout', '--quiet', startingBranch)
  }
}
