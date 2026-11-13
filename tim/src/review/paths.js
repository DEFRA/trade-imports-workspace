import { join } from 'node:path'

/**
 * The folder a review keeps its state in. A review id may hold slashes
 * (`local/<repo>/<branch>`), and each one becomes a nested folder.
 *
 * @param {string} workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} reviewId - A ticket key or a `local/<repo>/<branch>` id
 * @returns {string}
 */
export const reviewDir = (workspaceRoot, reviewId) =>
  join(workspaceRoot, 'workareas', 'reviews', reviewId)

/**
 * A repo file path as one file name: every `/` becomes `_`.
 *
 * @param {string} filePath
 * @returns {string}
 */
export const encodeFilePath = (filePath) => filePath.replaceAll('/', '_')

/**
 * @param {string} reviewFolder - From {@link reviewDir}
 * @param {string} repo
 * @returns {string}
 */
export const itemsFilePath = (reviewFolder, repo) =>
  join(reviewFolder, `items.${repo}.json`)

/**
 * @param {string} reviewFolder - From {@link reviewDir}
 * @param {string} repo
 * @param {string} filePath - The reviewed file's path inside the repo
 * @returns {string}
 */
export const fileReviewPath = (reviewFolder, repo, filePath) =>
  join(
    reviewFolder,
    'file-reviews',
    repo,
    `${encodeFilePath(filePath)}.review.json`
  )
