import { join } from 'node:path'
import { TimError } from '../errors.js'

const KEBAB_RUN_ID = /^[a-z0-9-]+$/

/**
 * The places the skill-creator skill reads and writes in a workspace.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @returns {{skillsDir: string, auditsDir: string, interviewsDir: string, settingsPath: string, toolsDir: string}}
 */
export const skillCreatorPaths = (workspaceRoot) => ({
  skillsDir: join(workspaceRoot, '.claude', 'skills'),
  auditsDir: join(workspaceRoot, 'workareas', 'skills-audit'),
  interviewsDir: join(workspaceRoot, 'workareas', 'skill-creator'),
  settingsPath: join(workspaceRoot, '.claude', 'settings.json'),
  toolsDir: join(workspaceRoot, 'tools')
})

/**
 * @param {string} workspaceRoot
 * @param {string} runId - A skill name, checked by {@link assertRunId}
 * @returns {string}
 */
export const decisionsPath = (workspaceRoot, runId) =>
  join(skillCreatorPaths(workspaceRoot).interviewsDir, runId, 'decisions.json')

/**
 * @param {string} runId
 * @returns {string} The run id
 * @throws {TimError} USAGE unless it is lower-case letters, digits and hyphens, not starting with a hyphen
 */
export const assertRunId = (runId) => {
  if (!KEBAB_RUN_ID.test(runId) || runId.startsWith('-')) {
    throw new TimError(
      'USAGE',
      `Invalid run-id (must match ^[a-z0-9-]+$): ${runId}`
    )
  }
  return runId
}
