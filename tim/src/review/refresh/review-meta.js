import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../../backlog/io.js'
import { TimError } from '../../errors.js'
import { reviewDir } from '../paths.js'

/**
 * A review's `.review-meta.json`, with its folder and path.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.reviewId
 * @returns {{folder: string, metaPath: string, meta: object}}
 * @throws {TimError} NOT_FOUND when the meta file is missing
 */
export const readReviewMeta = ({ workspaceRoot, reviewId }) => {
  const folder = reviewDir(workspaceRoot, reviewId)
  const metaPath = join(folder, '.review-meta.json')
  if (!existsSync(metaPath)) {
    throw new TimError('NOT_FOUND', `Meta file not found: ${metaPath}`)
  }
  return { folder, metaPath, meta: readJsonFile(metaPath) }
}

/**
 * @param {object} meta - From {@link readReviewMeta}
 * @returns {string[]} The repos of the review's pull requests, once each, in code-point order
 */
export const reposOf = (meta) =>
  [...new Set(meta.prs.map(({ repo }) => repo))].sort()

/**
 * @param {object} meta - From {@link readReviewMeta}
 * @param {string} repo
 * @returns {object[]} The repo's pull requests, in meta order
 */
export const pullRequestsOf = (meta, repo) =>
  meta.prs.filter((pullRequest) => pullRequest.repo === repo)

/**
 * @param {object} meta - From {@link readReviewMeta}
 * @param {string} repo
 * @returns {object[]} Every snapshot change recorded for the repo, oldest first
 */
export const snapshotChangesOf = (meta, repo) =>
  (meta.re_reviews || []).flatMap((snapshot) =>
    Array.isArray(snapshot?.changes)
      ? snapshot.changes.filter((change) => change?.repo === repo)
      : []
  )

/**
 * @param {string} folder - From {@link readReviewMeta}
 * @param {string} repo
 * @returns {string} The review clone of the repo
 */
export const reviewCloneOf = (folder, repo) => join(folder, 'repos', repo)

/**
 * @param {string} dir
 * @returns {boolean} Whether `dir` holds a `.git` folder
 */
export const isCloned = (dir) =>
  statSync(join(dir, '.git'), { throwIfNoEntry: false })?.isDirectory() ?? false
