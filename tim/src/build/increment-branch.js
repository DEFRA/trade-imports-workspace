import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../exec/exec.js'

const git = (dir, args) => run('git', ['-C', dir, ...args])

const succeeds = async (dir, args) => (await git(dir, args)).exitCode === 0

const hasRef = (dir, ref) =>
  succeeds(dir, ['show-ref', '--verify', '--quiet', ref])

const firstLine = (text) => text.trim().split('\n')[0] ?? ''

const uncommittedFiles = async (dir) =>
  (await git(dir, ['status', '--porcelain'])).stdout
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => line.slice(3))

const refusalFor = async ({ key, path }) => {
  if (!existsSync(join(path, '.git'))) return `${key} is not cloned at ${path}.`
  const dirty = await uncommittedFiles(path)
  return dirty.length > 0
    ? `${key} has uncommitted work, probably from an earlier attempt: ${dirty.join(', ')}. Nothing was stashed, reset or cleaned: that work is not this step's.`
    : null
}

class BranchStepFailure extends Error {}

const must = async (dir, args, failure) => {
  const result = await git(dir, args)
  if (result.exitCode !== 0) {
    throw new BranchStepFailure(
      `${failure}: ${firstLine(result.stderr) || `git exited ${result.exitCode}`}`
    )
  }
  return result
}

// A local branch picks up anything already pushed, by fast-forward only. A
// remote branch that is gone has merged and been deleted: nothing to pick up.
const catchUp = async ({ key, path }, branch) => {
  if (!(await hasRef(path, `refs/remotes/origin/${branch}`))) return
  await must(
    path,
    ['merge', '--quiet', '--ff-only', `origin/${branch}`],
    `${key}: ${branch} has diverged from origin/${branch}, so a human needs to reconcile it`
  )
}

const checkOut = async (repo, branch, base) => {
  const { key, path } = repo
  if (await hasRef(path, `refs/heads/${branch}`)) {
    await must(
      path,
      ['checkout', '--quiet', branch],
      `${key}: can't check out ${branch}`
    )
    await catchUp(repo, branch)
    return { cut: false, from: null }
  }
  if (await hasRef(path, `refs/remotes/origin/${branch}`)) {
    await must(
      path,
      ['checkout', '--quiet', '-b', branch, '--track', `origin/${branch}`],
      `${key}: can't check out ${branch} from origin`
    )
    return { cut: false, from: `origin/${branch}` }
  }
  if (!(await hasRef(path, `refs/remotes/origin/${base}`))) {
    throw new BranchStepFailure(
      `${key}: can't find origin/${base} to cut ${branch} from.`
    )
  }
  await must(
    path,
    ['checkout', '--quiet', '-b', branch, '--no-track', `origin/${base}`],
    `${key}: can't cut ${branch} from origin/${base}`
  )
  return { cut: true, from: `origin/${base}` }
}

// The branch's upstream must be its own remote branch, or none. An upstream
// on any other branch is how a push once landed on the base branch, so it is
// removed rather than trusted.
const repairUpstream = async ({ path }, branch) => {
  const upstream = await git(path, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    `${branch}@{upstream}`
  ])
  const name = upstream.stdout.trim()
  if (upstream.exitCode !== 0 || name === `origin/${branch}`) return null
  await must(
    path,
    ['branch', '--unset-upstream', branch],
    `can't remove the upstream ${name}`
  )
  return name
}

const putOnBranch = async (repo, branch, base) => {
  const { key, path } = repo
  await must(path, ['fetch', '--quiet', 'origin'], `${key}: can't fetch origin`)
  const moved = await checkOut(repo, branch, base)
  const current = (await git(path, ['branch', '--show-current'])).stdout.trim()
  if (current !== branch) {
    throw new BranchStepFailure(
      `${key} is on ${current || 'no branch'}, not ${branch}.`
    )
  }
  const removedUpstream = await repairUpstream(repo, branch)
  const head = (await git(path, ['rev-parse', '--short', 'HEAD'])).stdout.trim()
  return { repo: key, path, branch, head, ...moved, removedUpstream }
}

/**
 * Put each of an increment's repos on its branch, the same name in every one:
 * check it out where it exists locally and fast-forward it to what is pushed,
 * track it where only origin has it, and otherwise cut it with --no-track from
 * a freshly fetched origin/<base>. An upstream other than the branch's own is
 * removed. Nothing changes in any repo if one is not cloned or has
 * uncommitted work; a failure part-way stops at that repo.
 *
 * @param {object} args
 * @param {{key: string, path: string}[]} args.repos - In the order to branch them
 * @param {string} args.branch
 * @param {string} args.base
 * @returns {Promise<{ok: boolean, repos: object[], reason: string|null}>}
 */
export const branchIncrementRepos = async ({ repos, branch, base }) => {
  const refusals = (await Promise.all(repos.map(refusalFor))).filter(Boolean)
  if (refusals.length > 0) {
    return {
      ok: false,
      repos: [],
      reason: ['Nothing changed.', ...refusals].join(' ')
    }
  }
  const done = []
  for (const repo of repos) {
    try {
      done.push(await putOnBranch(repo, branch, base))
    } catch (error) {
      if (!(error instanceof BranchStepFailure)) throw error
      return { ok: false, repos: done, reason: error.message }
    }
  }
  return { ok: true, repos: done, reason: null }
}
