import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const isSha = (text) => /^[0-9a-f]{40}$/.test(text)

const readText = (path) => {
  try {
    return readFileSync(path, 'utf8').trim()
  } catch {
    return null
  }
}

const refNamed = (packed, ref) => {
  if (!packed) return null
  for (const line of packed.split('\n')) {
    if (line.startsWith('#') || line.startsWith('^')) continue
    const [sha, name] = line.trim().split(/\s+/)
    if (name === ref && isSha(sha)) return sha
  }
  return null
}

/**
 * The commit a repo checkout is on, read from its `.git` directory rather
 * than by running git, so it can be read inside a synchronous check.
 *
 * Null whenever the commit cannot be read: the path is not a checkout, its
 * `.git` is a file (a worktree), or `HEAD` names a ref nothing resolves. A
 * caller compares this against the value an extract recorded, so "cannot
 * tell" has to be distinguishable from "has moved" — otherwise a repo tim
 * cannot read would be called stale and extracted again for nothing.
 *
 * @param {string} dir - The checkout's directory
 * @returns {string|null}
 */
/**
 * The commit to record in a source's extract, or null when there is none to
 * record: the source is not a repo, so nothing can move under its extract;
 * no workspace root was given to resolve its locator against; or its
 * checkout cannot be read.
 *
 * @param {object} args
 * @param {{kind: string, locator: string}} args.source
 * @param {string} [args.workspaceRoot]
 * @returns {string|null}
 */
export const extractedRepoHead = ({ source, workspaceRoot }) =>
  source?.kind === 'repo' && typeof workspaceRoot === 'string'
    ? repoHeadOf(join(workspaceRoot, source.locator))
    : null

export const repoHeadOf = (dir) => {
  const gitDir = join(dir, '.git')
  try {
    if (!statSync(gitDir).isDirectory()) return null
  } catch {
    return null
  }
  const head = readText(join(gitDir, 'HEAD'))
  if (!head) return null
  if (isSha(head)) return head
  const ref = /^ref:\s*(\S+)$/.exec(head)?.[1]
  if (!ref?.startsWith('refs/')) return null
  const loose = readText(join(gitDir, ref))
  if (loose && isSha(loose)) return loose
  return refNamed(readText(join(gitDir, 'packed-refs')), ref)
}
