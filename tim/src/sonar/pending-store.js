import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'

const PENDING_PREFIX = 'pending__'
const SEEN_PREFIX = 'seen__'
const SEPARATOR = '__'

const pendingFileName = ({ project, sha }) =>
  `${PENDING_PREFIX}${project}${SEPARATOR}${sha}`

const seenFileName = ({ project, sha }) =>
  `${SEEN_PREFIX}${project}${SEPARATOR}${sha}`

const isRegularFile = (path) => {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

const epochSecondsOf = (text) =>
  /^[+-]?\d+$/.test(text.trim()) ? Number.parseInt(text, 10) : null

const pendingCheckOf = (folder, fileName) => {
  const rest = fileName.slice(PENDING_PREFIX.length)
  const [branch = '', pushedAt = ''] = readFileSync(
    join(folder, fileName),
    'utf8'
  ).split('\n')
  return {
    project: rest.split(SEPARATOR)[0],
    sha: rest.split(SEPARATOR).at(-1),
    branch,
    pushedAt: epochSecondsOf(pushedAt)
  }
}

/**
 * The folder the sonar hooks keep their pending and seen checks in.
 *
 * @param {string} workspaceRoot
 * @returns {string}
 */
export const sonarChecksFolder = (workspaceRoot) =>
  join(workspaceRoot, '.sonar-checks')

/**
 * Every pending check in the folder, in file-name order. A file named
 * `pending__<project>__<sha>` holds the branch on line 1 and the push time
 * in epoch seconds on line 2; `pushedAt` is null when line 2 is missing or
 * not a whole number. Empty when the folder is missing.
 *
 * @param {string} folder
 * @returns {Array<{project: string, sha: string, branch: string, pushedAt: number|null}>}
 */
export const listPendingChecks = (folder) => {
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((fileName) => fileName.startsWith(PENDING_PREFIX))
    .filter((fileName) => isRegularFile(join(folder, fileName)))
    .sort()
    .map((fileName) => pendingCheckOf(folder, fileName))
}

/**
 * Whether a pending check has waited 45 minutes or more. A check with no
 * push time, or a clock that reads zero, never expires.
 *
 * @param {{pushedAt: number|null}} check
 * @param {number} nowSeconds - epoch seconds
 * @returns {boolean}
 */
export const isPendingCheckExpired = ({ pushedAt }, nowSeconds) => {
  const expirySeconds = 2700
  if (pushedAt === null || pushedAt <= 0 || nowSeconds <= 0) return false
  return nowSeconds - pushedAt >= expirySeconds
}

/**
 * @param {string} folder
 * @param {{project: string, sha: string}} commit
 * @returns {boolean}
 */
export const hasSeenCheck = (folder, commit) =>
  existsSync(join(folder, seenFileName(commit)))

/**
 * Writes the pending check for a pushed commit, creating the folder.
 *
 * @param {string} folder
 * @param {{project: string, sha: string, branch: string, pushedAt: number}} check
 */
export const recordPendingCheck = (
  folder,
  { project, sha, branch, pushedAt }
) => {
  mkdirSync(folder, { recursive: true })
  writeFileSync(
    join(folder, pendingFileName({ project, sha })),
    `${branch}\n${pushedAt}\n`
  )
}

/**
 * Removes a pending check without marking it seen.
 *
 * @param {string} folder
 * @param {{project: string, sha: string}} commit
 */
export const dropPendingCheck = (folder, commit) =>
  rmSync(join(folder, pendingFileName(commit)), { force: true })

/**
 * Marks a commit seen, so it is never recorded again, and removes its
 * pending check.
 *
 * @param {string} folder
 * @param {{project: string, sha: string}} commit
 */
export const markCheckSeen = (folder, commit) => {
  writeFileSync(join(folder, seenFileName(commit)), '')
  dropPendingCheck(folder, commit)
}
