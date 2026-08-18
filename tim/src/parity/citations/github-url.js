import { execFileSync } from 'node:child_process'

/**
 * Build a GitHub permalink for one citation.
 *
 * Always the full forty-character sha. A short sha resolves today and stops
 * resolving the moment the repo grows a colliding prefix, and these links are
 * meant to be pasted to a colleague months from now.
 *
 * @param {object} args
 * @param {{owner: string, repo: string}} args.repo
 * @param {string} args.sha - Full sha
 * @param {string} args.path - Repo-relative
 * @param {{start: number, end: number}|null} [args.lines]
 * @returns {string}
 */
export const permalink = ({ repo, sha, path, lines }) => {
  const base = `https://github.com/${repo.owner}/${repo.repo}/blob/${sha}/${path}`
  if (!lines) return base
  return lines.end && lines.end !== lines.start
    ? `${base}#L${lines.start}-L${lines.end}`
    : `${base}#L${lines.start}`
}

const gitOk = (repoPath, args) => {
  try {
    execFileSync('git', ['-C', repoPath, ...args], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Does the file exist at that commit? Local check only.
 *
 * HTTP link-checking would make the build non-deterministic, offline-hostile
 * and rate-limited, and it would not answer a different question: a citation
 * that fails this check is a finding about the finding, not a broken link.
 *
 * @param {string} repoPath
 * @param {string} sha
 * @param {string} path
 * @returns {boolean}
 */
export const existsAtCommit = (repoPath, sha, path) =>
  gitOk(repoPath, ['cat-file', '-e', `${sha}:${path}`])

/**
 * The blob id of a file at a commit. Two citations with the same blob are the
 * same bytes, which is how the report knows a stored snippet is still exactly
 * what the permalink shows.
 *
 * @param {string} repoPath
 * @param {string} sha
 * @param {string} path
 * @returns {string|null}
 */
export const blobId = (repoPath, sha, path) => {
  try {
    return execFileSync(
      'git',
      ['-C', repoPath, 'rev-parse', `${sha}:${path}`],
      {
        encoding: 'utf8'
      }
    ).trim()
  } catch {
    return null
  }
}
