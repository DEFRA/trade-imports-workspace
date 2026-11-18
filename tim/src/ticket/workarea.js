import { join } from 'node:path'

/**
 * The folder a ticket's plan and its pre-baked context live in.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} ticket - The ticket key as the user typed it
 * @returns {string}
 */
export const planningDir = (workspaceRoot, ticket) =>
  join(workspaceRoot, 'workareas', 'ticket-planning', ticket)
