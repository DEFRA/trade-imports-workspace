import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const toRelPosix = (repoDir, absPath) =>
  relative(repoDir, absPath).split(sep).join('/')

/**
 * List every file under `repoDir`, relative to it, walked once. Symlinks
 * are not followed and unreadable entries are skipped, matching `grep -r`.
 *
 * @param {object} args
 * @param {string} args.repoDir
 * @param {string[]} [args.skip] - Absolute paths to skip entirely (their
 *   own subtree is not walked) — used to skip nested repo folders,
 *   `workareas/` and `.claude/worktrees/` when walking the workspace root
 * @returns {string[]} relative, `/`-separated paths
 */
export const listRepoFiles = ({ repoDir, skip = [] }) => {
  const skipSet = new Set(skip)

  const walk = (dirAbs) => {
    let entries
    try {
      entries = readdirSync(dirAbs, { withFileTypes: true })
    } catch {
      return []
    }
    return entries
      .filter((entry) => !skipSet.has(join(dirAbs, entry.name)))
      .filter((entry) => !entry.isSymbolicLink())
      .flatMap((entry) => {
        const abs = join(dirAbs, entry.name)
        if (entry.isDirectory()) return walk(abs)
        return entry.isFile() ? [toRelPosix(repoDir, abs)] : []
      })
  }

  return walk(repoDir)
}

/**
 * Test one file's content against `regex`, line by line — grep is
 * line-based, so this keeps a `.` in a pattern from spanning lines.
 * Returns `false`, rather than throwing, when the file cannot be read.
 *
 * @param {string} absPath
 * @param {RegExp} regex
 * @returns {boolean}
 */
export const fileMatchesLine = (absPath, regex) => {
  let content
  try {
    content = readFileSync(absPath, 'utf8')
  } catch {
    return false
  }
  return content.split('\n').some((line) => regex.test(line))
}
