import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'

/**
 * The lines a git command prints, run in `cwd`, without blank lines.
 *
 * @param {string} cwd
 * @param {string[]} args
 * @returns {Promise<string[]>}
 * @throws {TimError} UNKNOWN when git exits non-zero, with its stderr
 */
export const gitLines = async (cwd, args) => {
  const { exitCode, stdout, stderr } = await run('git', args, { cwd })
  if (exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `git ${args.join(' ')} failed in ${cwd}: ${stderr.trim()}`
    )
  }
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Whether git has uncommitted changes to one file, staged or not.
 *
 * @param {string} cwd
 * @param {string} file - Relative to cwd
 * @returns {Promise<boolean>}
 */
export const hasUncommittedChanges = async (cwd, file) =>
  (await gitLines(cwd, ['status', '--porcelain', '--', file])).length > 0
