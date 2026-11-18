import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync
} from 'node:fs'
import { basename, join } from 'node:path'

const EXCLUDED_FOLDERS = new Set(['repos', '.diffs'])

const isExcludedFolder = (path) =>
  EXCLUDED_FOLDERS.has(basename(path)) && lstatSync(path).isDirectory()

const kindOf = (path) => {
  const stats = lstatSync(path)
  if (stats.isSymbolicLink()) return 'link'
  return stats.isDirectory() ? 'folder' : 'file'
}

const removeEntriesMissingFrom = (source, destination) => {
  for (const name of readdirSync(destination)) {
    const target = join(destination, name)
    if (isExcludedFolder(target)) continue
    const origin = join(source, name)
    if (!existsSync(origin) || kindOf(origin) !== kindOf(target)) {
      rmSync(target, { recursive: true, force: true })
    } else if (kindOf(target) === 'folder') {
      removeEntriesMissingFrom(origin, target)
    }
  }
}

/**
 * Makes `destination` a copy of `source` without any folder named `repos`
 * or `.diffs`, at any depth. Files no longer in `source` are deleted,
 * except inside those excluded folders, which are left as they are.
 *
 * @param {string} source - A review folder
 * @param {string} destination - Its workareas/shared/ copy
 */
export const copyReviewWithoutClones = (source, destination) => {
  mkdirSync(destination, { recursive: true })
  removeEntriesMissingFrom(source, destination)
  cpSync(source, destination, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    verbatimSymlinks: true,
    filter: (path) => path === source || !isExcludedFolder(path)
  })
}
