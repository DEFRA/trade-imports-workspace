import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'

const PACKAGES_FILE_NAME = /^packages\..*\.json$/

/**
 * The folder an npm upgrade run keeps its state in.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} runId - The run's Jira ticket, such as EUDPA-500
 * @returns {string}
 */
export const runFolder = (workspaceRoot, runId) =>
  join(workspaceRoot, 'workareas', 'npm-upgrades', runId)

/**
 * @param {string} folder - From {@link runFolder}
 * @param {string} repo
 * @returns {string} The repo's `packages.<repo>.json`
 */
export const packagesPath = (folder, repo) =>
  join(folder, repo, `packages.${repo}.json`)

/**
 * @param {string} folder - From {@link runFolder}
 * @param {string} repo
 * @returns {string} The folder planners write classification fragments to
 */
export const fragmentsFolder = (folder, repo) =>
  join(folder, repo, 'classifications')

/**
 * A package name as one file name: every `/` becomes `__`.
 *
 * @param {string} packageName
 * @returns {string}
 */
export const fragmentFileName = (packageName) =>
  `${packageName.replaceAll('/', '__')}.json`

export const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

/**
 * @param {string} folder - From {@link runFolder}
 * @throws {TimError} NOT_FOUND when the run folder is missing
 */
export const requireRunFolder = (folder) => {
  if (!isFolder(folder)) {
    throw new TimError('NOT_FOUND', `Run dir not found: ${folder}`)
  }
}

const packagesFilesInRepoFolders = (folder) =>
  readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      readdirSync(join(folder, entry.name))
        .filter((name) => PACKAGES_FILE_NAME.test(name))
        .map((name) => join(folder, entry.name, name))
    )
    .sort()

/**
 * The packages files a run holds, in path order: the one `repo` names when
 * it is there, otherwise every `packages.*.json` one folder down.
 *
 * @param {string} folder - From {@link runFolder}
 * @param {string} [repo]
 * @returns {string[]} Empty when none is there
 */
export const packagesFilesOfRun = (folder, repo) => {
  if (repo) {
    const path = packagesPath(folder, repo)
    return existsSync(path) ? [path] : []
  }
  return packagesFilesInRepoFolders(folder)
}

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

/**
 * Every package row in these files, each with its file's repo (null when
 * the file names none), in file order.
 *
 * @param {string[]} paths - From {@link packagesFilesOfRun}
 * @returns {object[]}
 */
export const packageRowsOf = (paths) =>
  paths
    .map(readJson)
    .flatMap((file) =>
      (file.packages ?? []).map((row) => ({ ...row, repo: file.repo ?? null }))
    )

/**
 * @param {string} path - A packages file
 * @returns {object} The file's parsed JSON
 * @throws {TimError} NOT_FOUND when the file is missing
 */
export const readPackagesFile = (path) => {
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Packages file not found: ${path}`)
  }
  return readJson(path)
}

/**
 * @param {object} packagesFile - From {@link readPackagesFile}
 * @param {string} packageName
 * @returns {boolean}
 */
export const listsPackage = (packagesFile, packageName) =>
  (packagesFile.packages ?? []).some((row) => row.package === packageName)

/**
 * The current time as `date -u +%Y-%m-%dT%H:%M:%SZ` prints it.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export const utcStamp = (now = new Date()) =>
  `${now.toISOString().slice(0, 19)}Z`

/**
 * @param {Record<string, string | undefined>} options - Option name to value
 * @param {string} usage - The command's usage line
 * @throws {TimError} USAGE with the usage line when an option is missing or empty
 */
export const requireOptions = (options, usage) => {
  const missing = Object.entries(options).find(([, value]) => !value)
  if (missing) {
    throw new TimError('USAGE', `Missing --${missing[0]}\n${usage}`)
  }
}

/**
 * @param {string} name - The option, without its dashes
 * @param {string | undefined} value
 * @param {string[]} allowed
 * @param {string} [hint] - Added after the value, as the Bash did
 * @throws {TimError} USAGE when a given value is not one of `allowed`
 */
export const requireOneOf = (name, value, allowed, hint = '') => {
  if (value && !allowed.includes(value)) {
    throw new TimError('USAGE', `Invalid --${name}: ${value}${hint}`)
  }
}
