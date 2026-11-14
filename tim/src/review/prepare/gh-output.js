import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../../errors.js'

/**
 * The folder the review skill saves what `gh` gives back into before
 * `tim review prepare` reads it: `prs.json` from `gh search prs`, then
 * `<repo>.json` from `gh pr view` for each selected pull request.
 * `prepare` removes it once the review is ready.
 *
 * @param {string} reviewFolder - From `reviewDir`
 * @returns {string}
 */
export const rawFolder = (reviewFolder) => join(reviewFolder, '.raw')

/**
 * The `gh search prs` command that saves a review's pull requests.
 *
 * @param {object} args
 * @param {string} args.reviewFolder
 * @param {string} [args.ticket]
 * @param {string} [args.branch]
 * @returns {string}
 */
export const searchCommand = ({ reviewFolder, ticket, branch }) => {
  const saved = join(rawFolder(reviewFolder), 'prs.json')
  return branch === undefined
    ? `gh search prs ${ticket} --owner DEFRA --json number,title,repository,url,state,createdAt > ${saved}`
    : `gh search prs head:${branch} --owner DEFRA --json number,title,repository,url,state > ${saved}`
}

const parsedJson = (path, text) => {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new TimError('PARSE', `${path} is not valid JSON: ${error.message}`)
  }
}

/**
 * The pull requests `gh search prs` saved for a review. An empty file is
 * none found.
 *
 * @param {object} args
 * @param {string} args.reviewFolder
 * @param {string} [args.ticket]
 * @param {string} [args.branch]
 * @returns {object[]}
 * @throws {TimError} NOT_FOUND, naming the gh command, when nothing was saved; PARSE when the file is not a JSON array
 */
export const readSearchedPullRequests = ({ reviewFolder, ticket, branch }) => {
  const path = join(rawFolder(reviewFolder), 'prs.json')
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `Error: Can't find the pull requests gh found. Save them with:\n  ${searchCommand({ reviewFolder, ticket, branch })}`
    )
  }
  const text = readFileSync(path, 'utf8')
  if (text.trim() === '') return []
  const pullRequests = parsedJson(path, text)
  if (!Array.isArray(pullRequests)) {
    throw new TimError('PARSE', `${path} does not hold a list of pull requests`)
  }
  return pullRequests
}

/**
 * What `gh pr view` saved for a repo's selected pull request, or null when
 * nothing usable was saved.
 *
 * @param {string} reviewFolder
 * @param {string} repo
 * @returns {object | null}
 */
export const readPullRequestView = (reviewFolder, repo) => {
  const path = join(rawFolder(reviewFolder), `${repo}.json`)
  if (!existsSync(path)) return null
  try {
    const view = JSON.parse(readFileSync(path, 'utf8'))
    return view !== null && typeof view === 'object' ? view : null
  } catch {
    return null
  }
}
