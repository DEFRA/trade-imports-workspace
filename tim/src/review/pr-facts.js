import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'

const changedFileSchema = z.looseObject({
  filename: z.string(),
  previous_filename: z.string().nullish()
})

const pageSchema = z.array(changedFileSchema)

const factsSchema = z.union([z.array(pageSchema), pageSchema])

/**
 * Where a pull request's changed files are kept for a review.
 *
 * @param {string} reviewFolder - From `reviewDir`
 * @param {string} repo
 * @param {number | string} pr
 * @returns {string}
 */
export const prFactsPath = (reviewFolder, repo, pr) =>
  join(reviewFolder, '.prs', `${repo}-${pr}.json`)

/**
 * The command that writes a pull request's facts file.
 *
 * @param {string} reviewFolder - From `reviewDir`
 * @param {string} repo
 * @param {number | string} pr
 * @returns {string}
 */
export const prFactsCommand = (reviewFolder, repo, pr) =>
  `gh api repos/DEFRA/${repo}/pulls/${pr}/files --paginate --slurp > ${prFactsPath(reviewFolder, repo, pr)}`

const pagesOf = (facts) =>
  facts.length > 0 && Array.isArray(facts[0]) ? facts : [facts]

/**
 * Every path a pull request changes, from the facts file
 * `gh api repos/DEFRA/<repo>/pulls/<pr>/files --paginate --slurp` writes:
 * each file's path, then, for a rename, the path it had before.
 *
 * @param {object} args
 * @param {string} args.reviewFolder - From `reviewDir`
 * @param {string} args.repo
 * @param {number | string} args.pr
 * @returns {string[]}
 * @throws {TimError} NOT_FOUND when the facts file is missing; PARSE when it does not hold the pull request's files
 */
export const readPrFiles = ({ reviewFolder, repo, pr }) => {
  const path = prFactsPath(reviewFolder, repo, pr)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find the changed files of ${repo}#${pr}. Write them with:\n  ${prFactsCommand(reviewFolder, repo, pr)}`
    )
  }
  const parsed = factsSchema.safeParse(readJsonFile(path))
  if (!parsed.success) {
    throw new TimError(
      'PARSE',
      `${path} does not hold the changed files of ${repo}#${pr}. Write it again with:\n  ${prFactsCommand(reviewFolder, repo, pr)}`
    )
  }
  return pagesOf(parsed.data)
    .flat()
    .flatMap(({ filename, previous_filename: previousFilename }) =>
      previousFilename ? [filename, previousFilename] : [filename]
    )
}
