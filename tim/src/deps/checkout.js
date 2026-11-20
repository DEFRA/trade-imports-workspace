import { join } from 'node:path'

export const WORKSPACE_NPM_PROJECT = 'tim'

/**
 * The folder a dependency-sets repo name points at: `tim` is the
 * workspace's own `tim` folder, any other name a clone under `repos/`.
 * Whether the folder exists is left to the caller.
 *
 * @param {string} workspaceRoot
 * @param {string} repo
 * @returns {string}
 */
export const depsCheckoutPath = (workspaceRoot, repo) =>
  repo === WORKSPACE_NPM_PROJECT
    ? join(workspaceRoot, 'tim')
    : join(workspaceRoot, 'repos', repo)
