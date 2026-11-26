import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'
import {
  branchAndTicketOf,
  readEnvelope,
  repoEntryOf,
  reposOf
} from './envelope-repos.js'

const FALLBACK_DEFAULT = 'main'

const git = (dir, args) => run('git', ['-C', dir, ...args])

const succeeds = async (dir, args) => (await git(dir, args)).exitCode === 0

const nonEmptyLines = (text) =>
  text.split('\n').filter((line) => line.trim().length > 0)

const uncommittedFiles = async (dir) => {
  const statusLettersAndSpaceLength = 3
  const { stdout } = await git(dir, ['status', '--porcelain'])
  return nonEmptyLines(stdout).map((line) =>
    line.slice(statusLettersAndSpaceLength)
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

const inspect = async ({ key, folder, path, workspace = false }, branch) => {
  if (!existsSync(join(path, '.git'))) {
    return { key, folder, path, workspace, cloned: false }
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
    workspace,
    cloned: true,
    current,
    dirty,
    hasLocal,
    defaultName
  }
}

const wouldLoseWork = ({ workspace, current, dirty = [] }, branch) =>
  !workspace && current !== branch && dirty.length > 0

const problemsWith = (inspection, branch) => {
  const { folder, cloned, dirty } = inspection
  if (!cloned) return [`${folder} is not cloned at ${inspection.path}.`]
  return [
    wouldLoseWork(inspection, branch)
      ? `${folder} has uncommitted work: ${dirty.join(', ')}. Commit or stash it first.`
      : null
  ].filter(Boolean)
}

const defaultStartPoint = async (path, defaultName) => {
  if (await hasRef(path, `refs/remotes/origin/${defaultName}`)) {
    return `origin/${defaultName}`
  }
  return (await hasRef(path, `refs/heads/${defaultName}`)) ? defaultName : null
}

const startPointFor = async (path, branch, defaultName) =>
  (await hasRef(path, `refs/remotes/origin/${branch}`))
    ? `origin/${branch}`
    : defaultStartPoint(path, defaultName)

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

const withWorkspaceRepo = (repos, workspaceRoot) =>
  repos.some(({ workspace }) => workspace)
    ? repos
    : [...repos, repoEntryOf(workspaceRoot, 'workspace', { path: '.' })]

const countCommitsSince = (path, startPoint) =>
  git(path, ['rev-list', '--count', `${startPoint}..HEAD`])

const commitEmpty = async (path, message) => {
  const commit = await git(path, [
    'commit',
    '--only',
    '--allow-empty',
    '--quiet',
    '-m',
    message
  ])
  return commit.exitCode === 0
    ? { sha: await headOf(path), failure: null }
    : { sha: null, failure: commit.stderr.trim() || commit.stdout.trim() }
}

const addOpeningCommitIfNone = async (
  { path, defaultName },
  { branch, scope }
) => {
  const startPoint = await defaultStartPoint(path, defaultName)
  if (!startPoint) {
    return {
      sha: null,
      failure: `Can't find ${defaultName} to count the commits on ${branch}.`
    }
  }
  const counted = await countCommitsSince(path, startPoint)
  if (counted.exitCode !== 0) {
    return { sha: null, failure: counted.stderr.trim() }
  }
  if (Number(counted.stdout) > 0) return { sha: null, failure: null }
  return commitEmpty(path, `chore(${scope}): open ${branch}`)
}

const readOrigin = async (path, branch, head) => {
  const { exitCode, stdout, stderr } = await git(path, [
    'ls-remote',
    '--heads',
    'origin',
    `refs/heads/${branch}`
  ])
  if (exitCode !== 0) {
    return { onOrigin: null, pushNeeded: null, originError: stderr.trim() }
  }
  const originHead = stdout.split('\t')[0].trim() || null
  return {
    onOrigin: originHead !== null,
    pushNeeded: originHead !== head,
    originError: null
  }
}

const openRepo = async (inspection, result, opening) => {
  if (!result.ok) return result
  const { sha, failure } = await addOpeningCommitIfNone(inspection, opening)
  if (failure) {
    return {
      ...result,
      ok: false,
      errorCode: 'OPENING_COMMIT_FAILED',
      error: failure
    }
  }
  const head = sha ?? result.head
  return {
    ...result,
    head,
    openingCommit: sha,
    ...(await readOrigin(inspection.path, opening.branch, head))
  }
}

const refusalFor = (inspections, problems, branch) => {
  const dirty = inspections.some((inspection) =>
    wouldLoseWork(inspection, branch)
  )
  return new TimError(
    dirty ? 'DIRTY_TREE' : 'USAGE',
    ['Nothing changed.', ...problems].join('\n')
  )
}

/**
 * Put every repo a backlog builds on one branch. A repo already on it is left
 * alone; one that has it locally switches to it; otherwise the branch is cut
 * with `--no-track` from `origin/<branch>` when the remote has it, else from
 * the repo's default branch. Nothing changes if any repo would lose
 * uncommitted work or is not cloned. The workspace repo itself is the
 * exception: its uncommitted files travel with it.
 *
 * With `open`, the branch defaults to the envelope's `branch`, the workspace
 * repo joins the backlog's repos (last, unless the envelope maps it) and each
 * repo with no commits of its own on the branch, counted from its default
 * branch, gets one empty opening commit, made by git's own commit so the
 * repo's hooks run and nothing staged goes into it. Each repo's result then
 * also holds `openingCommit` (the new sha, or null), `onOrigin`, `pushNeeded`
 * and `originError`, read with `git ls-remote origin`; `onOrigin` and
 * `pushNeeded` are null, and `originError` holds git's reason, when origin
 * cannot be read. It never pushes and never calls GitHub.
 * A repo whose opening commit fails has `ok` false and `errorCode`
 * OPENING_COMMIT_FAILED.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {string} [args.branch] - Required unless `open` is set and the envelope names one
 * @param {boolean} [args.open] - Open the branch in every repo and the workspace
 * @returns {Promise<{workarea: string, branch: string, repos: object[]}>}
 * @throws {TimError} DIRTY_TREE or USAGE, before any repo changes
 */
export const runBuildBranch = async ({
  workspaceRoot,
  workarea,
  branch,
  open: opensBranch = false
}) => {
  const { envelope, backlogPath } = readEnvelope(workspaceRoot, workarea)
  const named = opensBranch
    ? branchAndTicketOf(envelope)
    : { branch: null, ticket: null }
  const targetBranch = branch ?? named.branch
  if (!targetBranch) {
    throw new TimError(
      'USAGE',
      `Name a branch, or give the backlog at ${workarea} a branch and use open mode.`
    )
  }
  const envelopeRepos = reposOf(envelope, backlogPath, workspaceRoot)
  const repos = opensBranch
    ? withWorkspaceRepo(envelopeRepos, workspaceRoot)
    : envelopeRepos
  const inspections = await Promise.all(
    repos.map((repo) => inspect(repo, targetBranch))
  )
  const problems = inspections.flatMap((inspection) =>
    problemsWith(inspection, targetBranch)
  )
  if (problems.length > 0) {
    throw refusalFor(inspections, problems, targetBranch)
  }
  const results = await Promise.all(
    inspections.map((inspection) => applyTo(inspection, targetBranch))
  )
  const reported = opensBranch
    ? await Promise.all(
        inspections.map((inspection, index) =>
          openRepo(inspection, results[index], {
            branch: targetBranch,
            scope: named.ticket ?? targetBranch
          })
        )
      )
    : results
  return { workarea, branch: targetBranch, repos: reported }
}
