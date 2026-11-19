import { pinFetch } from '../../exec/git-pin-fetch.js'
import { run } from '../../exec/exec.js'
import {
  isCloned,
  pullRequestsOf,
  readReviewMeta,
  reposOf,
  reviewCloneOf,
  snapshotChangesOf
} from './review-meta.js'

const isPresent = (value) =>
  value !== null && value !== undefined && value !== false

const presentOrUndefined = (value) => (isPresent(value) ? value : undefined)

const commandOutput = ({ stdout, stderr }) =>
  [stdout, stderr].filter(Boolean).join('\n').replace(/\n+$/, '')

const targetOf = (pullRequest, state) =>
  state === 'merged'
    ? {
        includeMain: true,
        targetRef: 'refs/remotes/origin/main',
        deepenRef: 'main'
      }
    : {
        includeMain: false,
        targetRef: `refs/remotes/origin/pr-${pullRequest}`,
        deepenRef: `refs/pull/${pullRequest}/head`
      }

const priorShaOf = (meta, repo) => {
  const lastSeen = presentOrUndefined(
    snapshotChangesOf(meta, repo).at(-1)?.current_commit
  )
  if (lastSeen !== undefined && lastSeen !== '') return lastSeen
  return presentOrUndefined(pullRequestsOf(meta, repo)[0]?.commit)
}

const fetchAndDetach = async (dir, targetRef) => {
  const fetched = await run('git', ['-C', dir, 'fetch', '--quiet', 'origin'])
  if (fetched.exitCode !== 0) return commandOutput(fetched)
  const detached = await run('git', [
    '-C',
    dir,
    'checkout',
    '--quiet',
    '--detach',
    targetRef
  ])
  return detached.exitCode === 0 ? null : commandOutput(detached)
}

const deepenWhenPriorUnreachable = async (dir, priorSha, deepenRef) => {
  if (!isPresent(priorSha) || priorSha === '') return
  const walk = await run('git', [
    '-C',
    dir,
    'rev-list',
    '--quiet',
    `${priorSha}..HEAD`,
    '--'
  ])
  if (walk.exitCode === 0) return
  await run('git', [
    '-C',
    dir,
    'fetch',
    '--quiet',
    '--depth=200',
    'origin',
    deepenRef
  ])
}

const pullRepo = async ({ meta, metaPath, folder, repo }) => {
  const dir = reviewCloneOf(folder, repo)
  if (!isCloned(dir)) {
    return { repo, status: 'skipped', message: 'not cloned' }
  }
  const pullRequests = pullRequestsOf(meta, repo)
  const pullRequest = presentOrUndefined(pullRequests[0]?.pr)
  if (pullRequest === undefined || pullRequest === '') {
    return {
      repo,
      status: 'failed',
      message: 'no PR number in meta',
      text: `no PR number in ${metaPath}`
    }
  }
  const state = presentOrUndefined(pullRequests[0]?.state) ?? 'open'
  const { includeMain, targetRef, deepenRef } = targetOf(pullRequest, state)
  await pinFetch({
    dir,
    mode: 'pr-only',
    pullRequestNumber: String(pullRequest),
    includeMain
  })
  const failure = await fetchAndDetach(dir, targetRef)
  if (failure !== null) {
    return { repo, status: 'failed', message: failure }
  }
  await deepenWhenPriorUnreachable(dir, priorShaOf(meta, repo), deepenRef)
  const { stdout: head } = await run('git', ['-C', dir, 'rev-parse', 'HEAD'])
  return { repo, status: 'ok', head: head.trim() }
}

/**
 * Brings each review clone up to date: pins its fetch refspec to its pull
 * request (and main for a merged one), fetches, and detaches at
 * `origin/pr-<n>`, or `origin/main` for a merged pull request. When the
 * last refresh's commit is not reachable from the new HEAD, it fetches 200
 * more commits. A repo with no clone is skipped.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.reviewId
 * @param {string} [args.repo] - Pull only this repo
 * @returns {Promise<{repo: string, status: 'ok'|'skipped'|'failed', head?: string, message?: string, text?: string}[]>}
 * @throws {TimError} NOT_FOUND when the review has no meta file; USAGE or UNKNOWN when git cannot pin a clone
 */
export const pullReviewRepos = async ({ workspaceRoot, reviewId, repo }) => {
  const { folder, metaPath, meta } = readReviewMeta({
    workspaceRoot,
    reviewId
  })
  const results = []
  for (const reviewRepo of reposOf(meta)) {
    if (repo !== undefined && reviewRepo !== repo) continue
    results.push(await pullRepo({ meta, metaPath, folder, repo: reviewRepo }))
  }
  return results
}

const pulledLine = ({ repo, status, head, message, text }) => {
  if (status === 'skipped') return `  ⚠️  ${repo} — not cloned, skipping`
  if (status === 'ok') return `  ✅ ${repo} — at ${head.slice(0, 7)}`
  if (text !== undefined) return `  ❌ ${repo} — ${text}`
  return `  ❌ ${repo} — fetch/detach failed: ${message}`
}

/**
 * @param {object[]} results - From {@link pullReviewRepos}
 * @returns {string | null} One line per repo; null when there are none
 */
export const renderPulledText = (results) =>
  results.length === 0 ? null : results.map(pulledLine).join('\n')

/**
 * @param {object[]} results - From {@link pullReviewRepos}
 * @returns {object[]} Each repo's result without its text-only wording
 */
export const pulledJson = (results) =>
  results.map(({ text: _text, ...result }) => result)

/**
 * @param {object[]} results - From {@link pullReviewRepos}
 * @returns {boolean}
 */
export const anyPullFailed = (results) =>
  results.some(({ status }) => status === 'failed')
