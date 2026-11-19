import { basename, join, normalize, sep } from 'node:path'
import { z } from 'zod'
import { readJsonFile } from '../backlog/io.js'
import { backlogPathFor } from '../commands/backlog/rows.js'
import { TimError } from '../errors.js'

/**
 * The folder name the workspace repo itself goes by, wherever it is cloned:
 * gates.json keys its rungs by it, and the canonical clone (CLAUDE.md rule 1)
 * is called it.
 */
export const WORKSPACE_FOLDER = 'trade-imports-workspace'

const posix = (path) => normalize(path).split(sep).join('/')

const isWorkspaceRoot = (path) => posix(path) === '.'

const repoEntrySchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .refine((path) => {
      const normalised = posix(path)
      return !path.startsWith('/') && !normalised.startsWith('..')
    }, 'must be a folder inside the workspace, such as repos/trade-imports-plants-frontend, or "." for the workspace repo itself'),
  requireApproval: z.boolean().optional()
})

const reposSchema = z.record(z.string().min(1), repoEntrySchema)

const problemWith = (repos, result) => {
  if (repos === undefined) return 'it has none'
  if (result.success) return 'it is empty'
  const [{ path, message }] = result.error.issues
  return `${path.join('.')} ${message}`
}

/**
 * The repos a backlog builds, from its envelope `repos` map, in the order the
 * map lists them. A repo at "." is the workspace repo itself: its folder is
 * always trade-imports-workspace, and `workspace` is true. `requireApproval`
 * is true when a person must approve the repo's pull request before it merges.
 *
 * @param {string} workspaceRoot
 * @param {string} workarea - A path under workareas/, such as shared/my-programme
 * @returns {{key: string, folder: string, path: string, workspace: boolean, requireApproval: boolean}[]}
 * @throws {TimError} USAGE when the backlog has no usable `repos` map; NOT_FOUND or PARSE from the read
 */
export const readEnvelopeRepos = (workspaceRoot, workarea) => {
  const backlogPath = backlogPathFor(workspaceRoot, workarea)
  const { repos } = readJsonFile(backlogPath)
  const result = reposSchema.safeParse(repos)
  if (!result.success || Object.keys(result.data).length === 0) {
    const detail = problemWith(repos, result)
    throw new TimError(
      'USAGE',
      `The backlog at ${backlogPath} needs a repos map naming each repo's path (${detail}).`
    )
  }
  return Object.entries(result.data).map(
    ([key, { path, requireApproval }]) => ({
      key,
      folder: isWorkspaceRoot(path) ? WORKSPACE_FOLDER : basename(path),
      path: join(workspaceRoot, path),
      workspace: isWorkspaceRoot(path),
      requireApproval: requireApproval ?? false
    })
  )
}

/**
 * The repos among `repos` that `keys` names, in the envelope's own order. An
 * empty or absent `keys` means every repo, so a caller that scopes nothing
 * behaves as it always has.
 *
 * @param {{key: string}[]} repos - From {@link readEnvelopeRepos}
 * @param {string[]} [keys] - Envelope repo keys to keep
 * @returns {{key: string}[]}
 * @throws {TimError} USAGE when a key is not in the envelope
 */
export const reposNamedBy = (repos, keys) => {
  if (keys === undefined || keys.length === 0) return repos
  const known = new Set(repos.map(({ key }) => key))
  const unknown = keys.filter((key) => !known.has(key))
  if (unknown.length > 0) {
    throw new TimError(
      'USAGE',
      `The backlog has no repo ${unknown.join(', ')}. It builds ${[...known].join(', ')}.`
    )
  }
  return repos.filter(({ key }) => keys.includes(key))
}
