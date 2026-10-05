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

const STATUS_PREFIX_LENGTH = 3

// A reason travels in `tim build start`'s one JSON line, which an agent copies
// back to the loop word for word, so it names a bounded number of files.
const NAMED_FILES_LIMIT = 20

const namedFiles = (paths) => {
  const named = paths.slice(0, NAMED_FILES_LIMIT).join(', ')
  const rest = paths.length - NAMED_FILES_LIMIT
  return rest > 0 ? `${named} and ${rest} more` : named
}

// A rename or copy is followed by an entry naming the path it came from.
const hasSourceEntry = (status) => /[RC]/.test(status)

// Every uncommitted file one by one, untracked folders opened up, so a file
// added later inside a folder that was already untracked is not mistaken for
// one that was there before. A rename lists both its old and its new path.
const uncommittedFilesOneByOne = async (dir) => {
  const entries = (
    await git(dir, ['status', '--porcelain', '-z', '--untracked-files=all'])
  ).stdout
    .split('\0')
    .filter((entry) => entry.length > 0)
  const files = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    files.push(entry.slice(STATUS_PREFIX_LENGTH))
    if (hasSourceEntry(entry.slice(0, 2))) {
      index += 1
      files.push(entries[index])
    }
  }
  return files
}

// The workspace repo always carries uncommitted programme state (a backlog
// the loop writes, plans, logs) and often somebody's own work in progress, so
// it is never refused for being dirty. What it carries is snapshotted before
// it moves, so no later stage mistakes it for the increment's work, and git
// itself refuses a switch that would overwrite any of it.
const refusalFor = async ({ key, path, workspace }) => {
  if (!existsSync(join(path, '.git'))) return `${key} is not cloned at ${path}.`
  if (workspace) return null
  const dirty = await uncommittedFiles(path)
  return dirty.length > 0
    ? `${key} has uncommitted work, probably from an earlier attempt: ${namedFiles(dirty)}. Nothing was stashed, reset or cleaned: that work is not this step's.`
    : null
}

class BranchStepFailure extends Error {
  constructor(message, stderr = '') {
    super(message)
    this.stderr = stderr
  }
}

const must = async (dir, args, failure) => {
  const result = await git(dir, args)
  if (result.exitCode !== 0) {
    throw new BranchStepFailure(
      `${failure}: ${firstLine(result.stderr) || `git exited ${result.exitCode}`}`,
      result.stderr
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

const sameCommit = async (dir, first, second) => {
  const [firstSha, secondSha] = await Promise.all(
    [first, second].map(async (ref) =>
      (await git(dir, ['rev-parse', ref])).stdout.trim()
    )
  )
  return firstSha === secondSha
}

// A branch with no commits of its own, behind a base that has moved on, has
// nothing to lose, so it is fast-forwarded rather than built on a stale base.
// A branch with any commits of its own is left as it is.
const isBehindBaseOnly = async ({ path }, branch, base) =>
  (await hasRef(path, `refs/remotes/origin/${base}`)) &&
  (await succeeds(path, [
    'merge-base',
    '--is-ancestor',
    branch,
    `origin/${base}`
  ])) &&
  !(await sameCommit(path, branch, `origin/${base}`))

const catchUpToBase = async (repo, branch, base) => {
  if (!(await isBehindBaseOnly(repo, branch, base))) return false
  await must(
    repo.path,
    ['merge', '--quiet', '--ff-only', `origin/${base}`],
    `${repo.key}: can't fast-forward ${branch} to origin/${base}`
  )
  return true
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
    return (await catchUpToBase(repo, branch, base))
      ? { cut: false, from: `origin/${base}`, caughtUpToBase: true }
      : { cut: false, from: null, caughtUpToBase: false }
  }
  if (await hasRef(path, `refs/remotes/origin/${branch}`)) {
    await must(
      path,
      ['checkout', '--quiet', '-b', branch, '--track', `origin/${branch}`],
      `${key}: can't check out ${branch} from origin`
    )
    return { cut: false, from: `origin/${branch}`, caughtUpToBase: false }
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
  return { cut: true, from: `origin/${base}`, caughtUpToBase: false }
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

const wouldOverwrite = (stderr) =>
  /would be overwritten|untracked working tree files would be/.test(stderr)

// git lists each file in the way on its own indented line.
const pathsInTheWay = (stderr) =>
  stderr
    .split('\n')
    .filter((line) => /^\s+\S/.test(line))
    .map((line) => line.trim())

const describeCarriedConflict = (key, branch, stderr) => {
  const paths = pathsInTheWay(stderr)
  const named = paths.length > 0 ? namedFiles(paths) : firstLine(stderr)
  return `${key}: switching to ${branch} would overwrite uncommitted files in the workspace: ${named}. Nothing was stashed, reset or cleaned. Commit or move those files by hand, then run again.`
}

// A switch that would overwrite something the workspace carries fails naming
// the files git listed, so a person can see what is in the way.
const checkOutCarrying = async (repo, branch, base) => {
  try {
    return await checkOut(repo, branch, base)
  } catch (error) {
    if (!(error instanceof BranchStepFailure)) throw error
    if (!wouldOverwrite(error.stderr ?? '')) throw error
    throw new BranchStepFailure(
      describeCarriedConflict(repo.key, branch, error.stderr)
    )
  }
}

const putOnBranch = async (repo, branch, base) => {
  const { key, path, workspace } = repo
  const carried = workspace ? await uncommittedFilesOneByOne(path) : null
  await must(path, ['fetch', '--quiet', 'origin'], `${key}: can't fetch origin`)
  const moved = workspace
    ? await checkOutCarrying(repo, branch, base)
    : await checkOut(repo, branch, base)
  const current = (await git(path, ['branch', '--show-current'])).stdout.trim()
  if (current !== branch) {
    throw new BranchStepFailure(
      `${key} is on ${current || 'no branch'}, not ${branch}.`
    )
  }
  const removedUpstream = await repairUpstream(repo, branch)
  const head = (await git(path, ['rev-parse', '--short', 'HEAD'])).stdout.trim()
  return {
    repo: key,
    path,
    branch,
    head,
    ...moved,
    removedUpstream,
    ...(workspace ? { carried } : {})
  }
}

/**
 * Put each of an increment's repos on its branch, the same name in every one:
 * check it out where it exists locally and fast-forward it to what is pushed,
 * track it where only origin has it, and otherwise cut it with --no-track from
 * a freshly fetched origin/<base>. A local branch with no commits of its own
 * that origin/<base> has moved past is then fast-forwarded to origin/<base>,
 * pushed or not, and its result says `caughtUpToBase: true` and
 * `from: 'origin/<base>'`. A branch with commits of its own is never rebased
 * or merged into. An upstream other than the branch's own is removed. Nothing
 * changes in any repo if one is not cloned or has uncommitted work; a failure
 * part-way stops at that repo.
 *
 * The workspace repo itself (`workspace: true`) is the exception to the
 * uncommitted-work rule: its uncommitted files travel across the switch and
 * the fast-forward, and its result lists them as `carried`: each file that was
 * uncommitted before the increment started, one by one inside an untracked
 * folder too, and both paths of a rename. A switch or fast-forward that would
 * overwrite one of them stops, naming the files.
 *
 * @param {object} args
 * @param {{key: string, path: string, workspace?: boolean}[]} args.repos - In the order to branch them
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
