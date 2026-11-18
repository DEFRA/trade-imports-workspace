import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { uniqueTempPathFor } from '../backlog/tmp-path.js'
import { itemsFilePath } from './paths.js'

/**
 * Writes text through a sibling temp file and a rename, creating the
 * folder first.
 *
 * @param {string} path
 * @param {string} text
 */
export const writeTextAtomic = (path, text) => {
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = uniqueTempPathFor(path)
  writeFileSync(tempPath, text, 'utf8')
  renameSync(tempPath, path)
}

/**
 * Writes JSON as `jq` prints it, through a sibling temp file and a rename,
 * creating the folder first.
 *
 * @param {string} path
 * @param {any} value
 */
export const writeJsonAtomic = (path, value) =>
  writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`)

const isItemsFileName = (name) =>
  name.startsWith('items.') && name.endsWith('.json')

const itemsFilesIn = (reviewFolder, repo) => {
  if (repo !== undefined) {
    const path = itemsFilePath(reviewFolder, repo)
    return existsSync(path) ? [path] : []
  }
  return readdirSync(reviewFolder)
    .filter(isItemsFileName)
    .map((name) => join(reviewFolder, name))
    .sort()
}

const itemsWithRepo = ({ repo = null, items }) =>
  items.map((item) => ({ ...item, repo }))

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

/**
 * Every item of a review, each with its repo (null when its items file
 * names none), in items-file name order. Null when no items file matches;
 * an empty array when items files match but hold no items.
 *
 * @param {string} reviewFolder - From `reviewDir`
 * @param {object} [opts]
 * @param {string} [opts.repo] - Read only this repo's items file
 * @returns {object[] | null}
 * @throws {TimError} NOT_FOUND when the review folder is missing or is not a folder
 */
export const readReviewItems = (reviewFolder, { repo } = {}) => {
  if (!isFolder(reviewFolder)) {
    throw new TimError(
      'NOT_FOUND',
      `Review workspace not found: ${reviewFolder}`
    )
  }
  const itemsFiles = itemsFilesIn(reviewFolder, repo)
  if (itemsFiles.length === 0) {
    return null
  }
  return itemsFiles.map(readJsonFile).flatMap(itemsWithRepo)
}

/**
 * These items as the review's items JSON text: nothing at all
 * when no items file matched, else the JSON array and a newline, which is
 * `[]` when the items files hold no items.
 *
 * @param {object[] | null} items - From {@link readReviewItems}
 * @returns {string}
 */
export const reviewItemsJsonText = (items) =>
  items === null ? '' : `${JSON.stringify(items, null, 2)}\n`
