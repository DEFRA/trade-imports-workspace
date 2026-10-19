import { basename } from 'node:path'
import { TimError } from '../../errors.js'

const REPO_NAME_PREFIX = 'tradeimports'

const comparableName = (name) => {
  const lettersAndDigits = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return lettersAndDigits.startsWith(REPO_NAME_PREFIX)
    ? lettersAndDigits.slice(REPO_NAME_PREFIX.length)
    : lettersAndDigits
}

const namesOf = (key, repo) => (repo.rel ? [key, basename(repo.rel)] : [key])

const keysMatching = (repos, requestedKey) => {
  const wanted = comparableName(requestedKey)
  return Object.entries(repos)
    .filter(([key, repo]) =>
      namesOf(key, repo).some((name) => comparableName(name) === wanted)
    )
    .map(([key]) => key)
}

const validKeysList = (repos) =>
  Object.keys(repos)
    .map((key) => `\`${key}\``)
    .join(', ')

/**
 * The repo key a `--files` or `--repo-level` value names. An exact key
 * wins. Otherwise a short form resolves when exactly one repo matches it:
 * the key or the repo's folder name, ignoring case, punctuation and the
 * `trade-imports-` prefix, so `plants-frontend`, `plantsFrontend` and
 * `trade-imports-plants-frontend` all name the same repo.
 *
 * @param {Record<string, {abs: string, rel: string}>} repos
 * @param {string} requestedKey
 * @returns {string}
 * @throws {TimError} USAGE when no repo, or more than one, matches
 */
export const resolveRepoKey = (repos, requestedKey) => {
  if (repos[requestedKey]) return requestedKey
  const matches = keysMatching(repos, requestedKey)
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    throw new TimError(
      'USAGE',
      `Repo key \`${requestedKey}\` could mean ${matches.map((key) => `\`${key}\``).join(' or ')}. Use one of those.`
    )
  }
  throw new TimError(
    'USAGE',
    `Can't find repo key \`${requestedKey}\`. Use one of ${validKeysList(repos)}, or name a programme with --programme.`
  )
}
