import { existsSync, statSync } from 'node:fs'
import { TimError } from '../../errors.js'
import { fileReviewPath, reviewDir } from '../paths.js'
import { readPrCurrentPaths } from '../pr-facts.js'

/**
 * The files one pull request changes that have no `.review.json`, in the
 * order its facts file lists them. The facts file is
 * `.prs/<repo>-<pr>.json`, which
 * `gh api repos/DEFRA/<repo>/pulls/<pr>/files --paginate --slurp` writes.
 *
 * @param {object} args
 * @param {string} args.reviewFolder - From `reviewDir`
 * @param {string} args.repo
 * @param {number | string} args.pr
 * @returns {string[]}
 * @throws {TimError} NOT_FOUND when the facts file is missing; PARSE when it does not hold the pull request's files
 */
export const coverageGapsIn = ({ reviewFolder, repo, pr }) =>
  readPrCurrentPaths({ reviewFolder, repo, pr })
    .filter((file) => file.length > 0)
    .filter((file) => !existsSync(fileReviewPath(reviewFolder, repo, file)))

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

/**
 * {@link coverageGapsIn} for a review named by its id.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {string} [args.pr]
 * @returns {string[]}
 * @throws {TimError} USAGE without a review id, repo or pull request; NOT_FOUND when the review folder or the facts file is missing
 */
export const listCoverageGaps = ({ workspaceRoot, reviewId, repo, pr }) => {
  if (!reviewId || !repo || !pr) {
    throw new TimError(
      'USAGE',
      'Usage: tim review refresh gaps <review-id> --repo REPO --pr NUMBER'
    )
  }
  const reviewFolder = reviewDir(workspaceRoot, reviewId)
  if (!isFolder(reviewFolder)) {
    throw new TimError('NOT_FOUND', `Review dir not found: ${reviewFolder}`)
  }
  return coverageGapsIn({ reviewFolder, repo, pr })
}

/**
 * @param {string[]} gaps
 * @returns {string | null} One path per line; null when there are none
 */
export const renderGapsText = (gaps) =>
  gaps.length === 0 ? null : gaps.join('\n')
