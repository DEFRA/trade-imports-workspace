import { load as yamlLoad } from 'js-yaml'
import picomatch from 'picomatch'
import { gitLines } from './git-files.js'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'

const WORKFLOWS_DIR = '.github/workflows'
const WORKFLOW_FILE = /\.ya?ml$/

const pushTriggerOf = (on) => {
  if (on === 'push') return { found: true, filters: {} }
  if (Array.isArray(on)) return { found: on.includes('push'), filters: {} }
  if (on && typeof on === 'object' && Object.hasOwn(on, 'push')) {
    return { found: true, filters: on.push ?? {} }
  }
  return { found: false, filters: {} }
}

const asList = (value) => {
  if (value === undefined || value === null) return null
  return Array.isArray(value) ? value.map(String) : [String(value)]
}

const matchesFilter = (value, patterns) =>
  patterns.reduce((matched, pattern) => {
    const negated = pattern.startsWith('!')
    const glob = negated ? pattern.slice(1) : pattern
    if (!picomatch.isMatch(value, glob, { dot: true })) return matched
    return !negated
  }, false)

const branchVerdict = (filters, branch) => {
  const branches = asList(filters.branches)
  const branchesIgnore = asList(filters['branches-ignore'])
  if (branches) {
    return matchesFilter(branch, branches)
      ? null
      : `its push trigger lists no branch matching ${branch}`
  }
  if (branchesIgnore) {
    return matchesFilter(branch, branchesIgnore)
      ? `its push trigger ignores ${branch}`
      : null
  }
  const tagsOnly = asList(filters.tags) || asList(filters['tags-ignore'])
  return tagsOnly ? 'its push trigger fires on tags only' : null
}

const pathVerdict = (filters, files) => {
  const paths = asList(filters.paths)
  const pathsIgnore = asList(filters['paths-ignore'])
  if (paths) {
    return files.some((file) => matchesFilter(file, paths))
      ? null
      : 'no changed file matches its paths'
  }
  if (pathsIgnore) {
    return files.some((file) => !matchesFilter(file, pathsIgnore))
      ? null
      : 'its paths-ignore covers every changed file'
  }
  return null
}

/**
 * Whether a push of the given files to `branch` starts a workflow, by
 * GitHub's push filters: branches, branches-ignore, tags, paths and
 * paths-ignore, with `!` patterns read in order.
 *
 * @param {string} source - The workflow file's YAML
 * @param {{branch: string, files: string[]}} push
 * @returns {{name: string|null, starts: boolean, reason: string}}
 */
export const pushVerdict = (source, { branch, files }) => {
  const workflow = yamlLoad(source) ?? {}
  const name = typeof workflow.name === 'string' ? workflow.name : null
  const { found, filters } = pushTriggerOf(workflow.on)
  if (!found) return { name, starts: false, reason: 'it has no push trigger' }
  const refused = branchVerdict(filters, branch) ?? pathVerdict(filters, files)
  return refused
    ? { name, starts: false, reason: refused }
    : {
        name,
        starts: true,
        reason: `a push to ${branch} with these files starts it`
      }
}

const readAt = async (repoPath, commit, file) => {
  const { exitCode, stdout, stderr } = await run(
    'git',
    ['show', `${commit}:${file}`],
    { cwd: repoPath }
  )
  if (exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `git show ${commit}:${file} failed in ${repoPath}: ${stderr.trim()}`
    )
  }
  return stdout
}

const verdictFor = async (repoPath, commit, file, push) => {
  const source = await readAt(repoPath, commit, file)
  try {
    const verdict = pushVerdict(source, push)
    return { file, ...verdict, name: verdict.name ?? file }
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Can't read ${file} at ${commit} as YAML: ${error.message}`,
      error
    )
  }
}

const filesChangedBy = (repoPath, commit) =>
  gitLines(repoPath, ['diff', '--name-only', `${commit}^1`, commit])

const workflowFilesAt = async (repoPath, commit) =>
  (
    await gitLines(repoPath, [
      'ls-tree',
      '--name-only',
      commit,
      `${WORKFLOWS_DIR}/`
    ])
  ).filter((file) => WORKFLOW_FILE.test(file))

/**
 * The workflows a push of `commit` to `branch` starts, read from the
 * workflow files the repo holds at that commit, against the files the
 * commit changes from its first parent. Each workflow's `name` is the one
 * GitHub gives its runs: the file's `name`, else its path. `starts` lists
 * those names.
 *
 * @param {{repoPath: string, commit: string, branch: string}} options
 * @returns {Promise<{commit: string, branch: string, changedFiles: string[], workflows: object[], starts: string[]}>}
 * @throws {TimError} UNKNOWN when git cannot read the commit, PARSE when a workflow file is not YAML
 */
export const findPushWorkflows = async ({ repoPath, commit, branch }) => {
  const sha = (
    await gitLines(repoPath, ['rev-parse', '--verify', `${commit}^{commit}`])
  )[0]
  const changedFiles = await filesChangedBy(repoPath, sha)
  const push = { branch, files: changedFiles }
  const workflows = await Promise.all(
    (await workflowFilesAt(repoPath, sha)).map((file) =>
      verdictFor(repoPath, sha, file, push)
    )
  )
  return {
    commit: sha,
    branch,
    changedFiles,
    workflows,
    starts: workflows
      .filter((workflow) => workflow.starts)
      .map((workflow) => workflow.name)
  }
}
