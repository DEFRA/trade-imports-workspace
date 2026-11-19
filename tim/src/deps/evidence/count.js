import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../../exec/exec.js'
import { TimError } from '../../errors.js'

const NO_MATCHES = 1

/**
 * The checkout a repo name points at: `tim` is the workspace's own `tim`
 * folder, any other name a clone under `repos/`.
 *
 * @param {string} workspaceRoot
 * @param {string} repo
 * @returns {string}
 * @throws {TimError} NOT_FOUND when the checkout is missing
 */
export const evidenceRepoPath = (workspaceRoot, repo) => {
  const repoPath =
    repo === 'tim'
      ? join(workspaceRoot, 'tim')
      : join(workspaceRoot, 'repos', repo)
  if (!existsSync(repoPath)) {
    throw new TimError('NOT_FOUND', `Can't find ${repo} at ${repoPath}.`)
  }
  return repoPath
}

const sumOfFileCounts = (stdout) =>
  stdout
    .split('\n')
    .filter((line) => line !== '')
    .reduce((total, line) => total + Number(line.split(':').at(-1)), 0)

/**
 * How many lines of a checkout's git-tracked files contain a fixed-string
 * pattern. Uncommitted edits to tracked files count. Untracked files,
 * binary files and every `package-lock.json` do not.
 *
 * @param {string} repoPath - A folder inside a git work tree
 * @param {string} pattern - Matched as a fixed string, not a regular expression
 * @returns {Promise<number>}
 * @throws {TimError} USAGE for an empty pattern, NOT_FOUND when the folder is not in a git work tree
 */
export const countPatternHits = async (repoPath, pattern) => {
  if (!pattern) {
    throw new TimError('USAGE', 'Give a pattern to count.')
  }
  if (!existsSync(repoPath)) {
    throw new TimError('NOT_FOUND', `Can't find the folder ${repoPath}.`)
  }
  const result = await run(
    'git',
    [
      'grep',
      '-F',
      '-I',
      '-c',
      '-e',
      pattern,
      '--',
      '.',
      ':(exclude,glob)**/package-lock.json'
    ],
    { cwd: repoPath }
  )
  if (result.exitCode === NO_MATCHES) return 0
  if (result.exitCode !== 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't search the tracked files in ${repoPath}: ${result.stderr.trim()}`
    )
  }
  return sumOfFileCounts(result.stdout)
}
