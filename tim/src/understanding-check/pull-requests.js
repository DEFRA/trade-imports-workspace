import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { compareJq } from './jq-values.js'
import { checkFolder } from './paths.js'

/**
 * The folder the skill saves what `gh` gives back into, before `prepare`
 * reads it: `prs.json` from `gh search prs`, then `<repo>.sha` from
 * `gh pr view` and `<repo>.diff` from `gh pr diff` for each selected pull
 * request.
 *
 * @param {string} folder - From `checkFolder`
 * @returns {string}
 */
export const rawFolder = (folder) => join(folder, '.raw')

const noPullRequestsError = (ticket) =>
  new TimError(
    'NOT_FOUND',
    `Error: No PRs found for ${ticket} — cannot run understanding-check`
  )

const parsedPullRequests = (path) => {
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''
  if (text.trim() === '') return []
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new TimError('PARSE', `${path} is not valid JSON: ${error.message}`)
  }
}

/**
 * The pull requests `gh search prs` found for a ticket, as saved in the
 * raw folder.
 *
 * @param {string} folder - From `checkFolder`
 * @param {string} ticket
 * @returns {object[]}
 * @throws {TimError} NOT_FOUND when the file is missing or lists none, PARSE when it is not a JSON array
 */
export const readPullRequests = (folder, ticket) => {
  const path = join(rawFolder(folder), 'prs.json')
  const pullRequests = parsedPullRequests(path)
  if (!Array.isArray(pullRequests)) {
    throw new TimError('PARSE', `${path} does not hold a list of pull requests`)
  }
  if (pullRequests.length === 0) throw noPullRequestsError(ticket)
  return pullRequests
}

const repoNameOf = (pullRequest) => pullRequest?.repository?.name ?? null

const byRepoName = (pullRequests) =>
  [...pullRequests]
    .sort((left, right) => compareJq(repoNameOf(left), repoNameOf(right)))
    .reduce((groups, pullRequest) => {
      const last = groups.at(-1)
      if (
        last &&
        compareJq(repoNameOf(last[0]), repoNameOf(pullRequest)) === 0
      ) {
        return [...groups.slice(0, -1), [...last, pullRequest]]
      }
      return [...groups, [pullRequest]]
    }, [])

const newestPreferringOpen = (group) => {
  const open = group.filter(({ state }) => state === 'OPEN')
  const candidates = open.length > 0 ? open : group
  return [...candidates]
    .sort((left, right) =>
      compareJq(left.createdAt ?? null, right.createdAt ?? null)
    )
    .at(-1)
}

/**
 * One pull request per repo, in repo-name order: an open one over any
 * other, then the most recently created.
 *
 * @param {object[]} pullRequests - From {@link readPullRequests}
 * @returns {object[]}
 */
export const selectPullRequests = (pullRequests) =>
  byRepoName(pullRequests).map(newestPreferringOpen)

/**
 * The pull requests to fetch for a ticket's check, one per repo.
 *
 * @param {{workspaceRoot: string, ticket: string}} args
 * @returns {object[]}
 * @throws {TimError} As {@link readPullRequests} does
 */
export const selectedPullRequestsFor = ({ workspaceRoot, ticket }) =>
  selectPullRequests(
    readPullRequests(checkFolder(workspaceRoot, ticket), ticket)
  )

/**
 * Each selected pull request as `<repo> <number>`, one a line.
 *
 * @param {object[]} selected - From {@link selectPullRequests}
 * @returns {string}
 */
export const selectedText = (selected) =>
  selected
    .map((pullRequest) => `${repoNameOf(pullRequest)} ${pullRequest.number}`)
    .join('\n')
