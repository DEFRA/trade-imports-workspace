import { join } from 'node:path'
import { encodeFilePath } from '../review/paths.js'

/**
 * The folder a code style review keeps its state in. A review id may hold
 * slashes (`local/<repo>/<branch>`), and each one becomes a nested folder.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} reviewId - A ticket key or a `local/<repo>/<branch>` id
 * @returns {string}
 */
export const styleDir = (workspaceRoot, reviewId) =>
  join(workspaceRoot, 'workareas', 'code-style-reviews', reviewId)

/**
 * @param {string} styleFolder - From {@link styleDir}
 * @param {string} repo
 * @param {string} filePath - The reviewed file's path inside the repo
 * @returns {string}
 */
export const fileStylePath = (styleFolder, repo, filePath) =>
  join(
    styleFolder,
    'file-reviews',
    repo,
    `${encodeFilePath(filePath)}.style.json`
  )
