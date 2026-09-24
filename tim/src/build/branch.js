import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'
import { readEnvelopeRepos } from './envelope-repos.js'

const FALLBACK_DEFAULT = 'main'

const git = (dir, args) => run('git', ['-C', dir, ...args])

const succeeds = async (dir, args) => (await git(dir, args)).exitCode === 0

const nonEmptyLines = (text) =>
  text.split('\n').filter((line) => line.trim().length > 0)

// `git status --porcelain` prints two status letters and a space before
// each path.
const PORCELAIN_PREFIX_LENGTH = 3

const uncommittedFiles = async (dir) => {
  const { stdout } = await git(dir, ['status', '--porcelain'])
  return nonEmptyLines(stdout).map((line) =>
    line.slice(PORCELAIN_PREFIX_LENGTH)
  )
}

const currentBranch = async (dir) =>
  (await git(dir, ['branch', '--show-current'])).stdout.trim() || null

const hasRef = (dir, ref) =>
  succeeds(dir, ['show-ref', '--verify', '--quiet', ref])

const defaultBranchName = async (dir) => {
  const { exitCode, stdout } = await git(dir, [
    'symbolic-ref',
    '--short',
    'refs/remotes/origin/HEAD'
  ])
  return exitCode === 0
    ? stdout.trim().replace(/^origin\//, '')
    : FALLBACK_DEFAULT
}

const inspect = async ({ key, folder, path }, branch) => {
  if (!existsSync(join(path, '.git'))) {
    return { key, folder, path, cloned: false }
  }
  const [current, dirty, hasLocal, defaultName] = await Promise.all([
    currentBranch(path),
    uncommittedFiles(path),
    hasRef(path, `refs/heads/${branch}`),
    defaultBranchName(path)
  ])
  return {
    key,
    folder,
    path,
    cloned: true,
    current,
    dirty,
    hasLocal,
    defaultName
  }
}

const problemsWith = (inspection, branch) => {
  const { folder, cloned, current, dirty } = inspection
  if (!cloned) return [`${folder} is not cloned at ${inspection.path}.`]
  return [
    current !== branch && dirty.length > 0
      ? `${folder} has uncommitted work: ${dirty.join(', ')}. Commit or stash it first.`
      : null
  ].filter(Boolean)
}

const startPointFor = async (path, branch, defaultName) => {
  if (await hasRef(path, `refs/remotes/origin/${branch}`)) {
    return `origin/${branch}`
  }
  if (await hasRef(path, `refs/remotes/origin/${defaultName}`)) {
    return `origin/${defaultName}`
  }
  return (await hasRef(path, `refs/heads/${defaultName}`)) ? defaultName : null
}

const checkoutFailed = (result, message) => ({
  ...result,
  ok: false,
  error: message
})

const moveTo = async (inspection, branch) => {
  const { path, current, hasLocal, defaultName } = inspection
  if (current === branch) {
    return {
      created: false,
      switched: false,
      createdFrom: null,
      fetchFailed: false
    }
  }
  if (hasLocal) {
    const checkout = await git(path, ['checkout', '--quiet', branch])
    return {
      created: false,
      switched: checkout.exitCode === 0,
      createdFrom: null,
      fetchFailed: false,
      failure: checkout.exitCode === 0 ? null : checkout.stderr.trim()
    }
  }
  const fetchFailed = !(await succeeds(path, ['fetch', '--quiet', 'origin']))
  const createdFrom = await startPointFor(path, branch, defaultName)
  if (!createdFrom) {
    return {
      created: false,
      switched: false,
      createdFrom: null,
      fetchFailed,
      failure: `Can't find ${defaultName} to cut ${branch} from.`
    }
  }
  const checkout = await git(path, [
    'checkout',
    '--quiet',
    '-b',
    branch,
    '--no-track',
    createdFrom
  ])
  return {
    created: checkout.exitCode === 0,
    switched: checkout.exitCode === 0,
    createdFrom,
    fetchFailed,
    failure: checkout.exitCode === 0 ? null : checkout.stderr.trim()
  }
}

const headOf = async (path) =>
  (await git(path, ['rev-parse', 'HEAD'])).stdout.trim() || null

const applyTo = async (inspection, branch) => {
  const { failure = null, ...moved } = await moveTo(inspection, branch)
  const result = {
    repo: inspection.folder,
    key: inspection.key,
    branch: failure ? inspection.current : branch,
    head: await headOf(inspection.path),
    ...moved,
    uncommitted: inspection.dirty.length,
    ok: true,
    error: null
  }
  return failure ? checkoutFailed(result, failure) : result
}

/**
 * Put every repo a backlog builds on one branch. A repo already on it is left
 * alone; one that has it locally switches to it; otherwise the branch is cut
 * with `--no-track` from `origin/<branch>` when the remote has it, else from
 * the repo's default branch. Nothing changes if any repo would lose
 * uncommitted work or is not cloned.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {string} args.branch
 * @returns {Promise<{workarea: string, branch: string, repos: object[]}>}
 * @throws {TimError} DIRTY_TREE or USAGE, before any repo changes
 */
export const runBuildBranch = async ({ workspaceRoot, workarea, branch }) => {
  const repos = readEnvelopeRepos(workspaceRoot, workarea)
  const inspections = await Promise.all(
    repos.map((repo) => inspect(repo, branch))
  )
  const problems = inspections.flatMap((inspection) =>
    problemsWith(inspection, branch)
  )
  if (problems.length > 0) {
    const dirty = inspections.some(
      ({ current, dirty = [] }) => current !== branch && dirty.length > 0
    )
    throw new TimError(
      dirty ? 'DIRTY_TREE' : 'USAGE',
      ['Nothing changed.', ...problems].join('\n')
    )
  }
  const results = await Promise.all(
    inspections.map((inspection) => applyTo(inspection, branch))
  )
  return { workarea, branch, repos: results }
}
