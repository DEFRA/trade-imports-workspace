import { basename, join, normalize, sep } from 'node:path'
import { z } from 'zod'
import { readJsonFile } from '../backlog/io.js'
import { backlogPathFor } from '../commands/backlog/rows.js'
import { TimError } from '../errors.js'

const repoEntrySchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .refine((path) => {
      const normalised = normalize(path).split(sep).join('/')
      return !path.startsWith('/') && !normalised.startsWith('..')
    }, 'must be a folder inside the workspace, such as repos/trade-imports-plants-frontend')
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
 * map lists them.
 *
 * @param {string} workspaceRoot
 * @param {string} workarea - A path under workareas/, such as shared/my-programme
 * @returns {{key: string, folder: string, path: string}[]}
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
  return Object.entries(result.data).map(([key, { path }]) => ({
    key,
    folder: basename(path),
    path: join(workspaceRoot, path)
  }))
}
