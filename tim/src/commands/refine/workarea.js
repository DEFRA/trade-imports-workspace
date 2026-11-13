import { join } from 'node:path'

/**
 * The folder a ticket's refinement keeps its files in.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} ticket - The ticket key as the user typed it
 * @returns {string}
 */
export const refinementDir = (workspaceRoot, ticket) =>
  join(workspaceRoot, 'workareas', 'ticket-refinement', ticket)

/**
 * @param {string} refinementFolder - From {@link refinementDir}
 * @returns {string}
 */
export const metaPath = (refinementFolder) =>
  join(refinementFolder, '.refinement-meta.json')

/**
 * The review stub `tim refine prepare` fills in.
 *
 * @param {string} workspaceRoot
 * @returns {string}
 */
export const reviewTemplatePath = (workspaceRoot) =>
  join(
    workspaceRoot,
    '.claude',
    'skills',
    'ticket-refiner',
    'assets',
    'refinement-template.md'
  )

/**
 * An ISO-8601 UTC time to the second, `YYYY-MM-DDTHH:MM:SSZ`.
 *
 * @param {Date} now
 * @returns {string}
 */
export const utcSeconds = (now) => now.toISOString().replace(/\.\d+Z$/, 'Z')
