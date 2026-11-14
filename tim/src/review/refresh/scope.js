import { existsSync } from 'node:fs'
import { readJsonFile } from '../../backlog/io.js'
import { run } from '../../exec/exec.js'
import { TimError } from '../../errors.js'
import { listReviewItems, renderItemsTsv } from '../items-ledger.js'
import { fileReviewPath } from '../paths.js'
import { writeJsonAtomic } from '../store.js'
import { coverageGapsIn } from './gaps.js'
import { listMergeResolved } from './merge-resolved.js'
import { pullReviewRepos, renderPulledText, anyPullFailed } from './pull.js'
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

const uniqueSorted = (values) =>
  [...new Set(values.filter((value) => value.length > 0))].sort()

const pullFirst = async ({ workspaceRoot, reviewId, repo, log }) => {
  try {
    const pulled = await pullReviewRepos({ workspaceRoot, reviewId, repo })
    const text = renderPulledText(pulled)
    if (text !== null) log(text)
    if (!anyPullFailed(pulled)) return
  } catch (error) {
    log(error.message)
  }
  throw new TimError('UNKNOWN', 'Pull failed')
}

const latestPullRequestOf = (pullRequests) =>
  pullRequests.reduce((latest, pullRequest) =>
    pullRequest.pr >= latest.pr ? pullRequest : latest
  )

const priorShaOf = (meta, repo, originalSha) => {
  const lastSeen = snapshotChangesOf(meta, repo).at(-1)?.current_commit
  return isPresent(lastSeen) && lastSeen !== '' ? lastSeen : originalSha
}

const changedFilesIn = async (dir, window) => {
  const { stdout } = await run('git', [
    '-C',
    dir,
    'diff',
    '--name-only',
    window
  ])
  return stdout.split('\n').filter((line) => line.length > 0)
}

const gapsAcrossPullRequests = ({ reviewFolder, repo, pullRequests, log }) =>
  uniqueSorted(
    pullRequests.flatMap(({ pr }) => {
      try {
        return coverageGapsIn({ reviewFolder, repo, pr })
      } catch (error) {
        log(`Warning: List D leaves out ${repo}#${pr}. ${error.message}`)
        return []
      }
    })
  )

const isOpen = ([, , , , , , , , disposition = '', status = '']) =>
  disposition === '' ||
  ((disposition === 'Fix' || disposition === 'Discuss') &&
    status === 'Not Done')

const idOf = (text) =>
  /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text) ? Number(text) : text

const openItemOf = (cells) => {
  const cell = (index) => cells[index] ?? null
  return {
    repo: cell(0),
    id: idOf(cells[1]),
    file: cell(2),
    line: cell(3),
    severity: cell(4),
    category: cell(5),
    issue: cell(6),
    fix: cell(7),
    disposition: cell(8),
    status: cell(9),
    notes: cell(10)
  }
}

const openItemsInUnchangedFiles = (itemsTsv, repo, changedFiles) =>
  itemsTsv
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.split('\t'))
    .filter((cells) => cells[0] === repo && isOpen(cells))
    .map(openItemOf)
    .filter(({ file }) => !changedFiles.includes(file))

const repoScope = async ({ meta, folder, repo, itemsTsv, log }) => {
  const dir = reviewCloneOf(folder, repo)
  const pullRequests = pullRequestsOf(meta, repo)
  const latest = latestPullRequestOf(pullRequests)
  const currentSha = (
    await run('git', ['-C', dir, 'rev-parse', 'HEAD'])
  ).stdout.trim()
  const priorSha = priorShaOf(meta, repo, latest.commit ?? 'null')
  const noChanges = priorSha === currentSha
  const window = `${priorSha}..${currentSha}`
  const changedFiles = noChanges ? [] : await changedFilesIn(dir, window)
  const mergeResolved = noChanges
    ? []
    : await listMergeResolved({
        repoDir: dir,
        prior: priorSha,
        head: currentSha
      })
  const mergeFiles = new Set(mergeResolved.map(({ file }) => file))
  const shas = { old_sha: priorSha, new_sha: currentSha }
  return {
    repo,
    pr: latest.pr,
    prior_sha: priorSha,
    current_sha: currentSha,
    no_changes: noChanges,
    lists: {
      A: uniqueSorted(changedFiles)
        .filter((file) => !mergeFiles.has(file))
        .map((file) => ({ file, ...shas })),
      B: openItemsInUnchangedFiles(itemsTsv, repo, changedFiles),
      C: mergeResolved.map(({ merge, file }) => ({
        file,
        merge_sha: merge,
        ...shas
      })),
      D: gapsAcrossPullRequests({
        reviewFolder: folder,
        repo,
        pullRequests,
        log
      }).map((file) => ({ file }))
    }
  }
}

const totalsOf = (repos) => {
  const total = (list) =>
    repos.reduce((sum, { lists }) => sum + lists[list].length, 0)
  return {
    list_a: total('A'),
    list_b: total('B'),
    list_c: total('C'),
    list_d: total('D')
  }
}

const snapshotOf = (generated, repos) => ({
  re_review_started: generated,
  changes: repos.map(
    ({
      repo,
      pr,
      prior_sha: prior,
      current_sha: current,
      no_changes: noChanges,
      lists
    }) => ({
      repo,
      pr,
      reviewed_commit: prior,
      current_commit: current,
      changed: !noChanges,
      file_count: lists.A.length + lists.C.length + lists.D.length
    })
  )
})

const clearFindingsToReviewAgain = (folder, repos) => {
  for (const { repo, lists } of repos) {
    for (const { file } of [...lists.A, ...lists.C]) {
      const path = fileReviewPath(folder, repo, file)
      if (!existsSync(path)) continue
      writeJsonAtomic(path, { ...readJsonFile(path), todos: [] })
    }
  }
}

const writeSnapshot = ({ metaPath, meta, folder, scope }) => {
  const snapshot = snapshotOf(scope.generated, scope.repos)
  writeJsonAtomic(metaPath, {
    ...meta,
    re_review: snapshot,
    re_reviews: [...(meta.re_reviews || []), snapshot]
  })
  clearFindingsToReviewAgain(folder, scope.repos)
}

const generatedNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

/**
 * Sorts a review's refresh work into four lists for each cloned repo,
 * over the window from the commit the last refresh saw (or the latest pull
 * request's commit) to the clone's HEAD: A, files changed and not
 * merge-resolved; B, open items in files that did not change; C, files
 * hand-resolved in a merge; D, files a pull request changes that have no
 * file review. It pulls each clone first unless told not to. With
 * `writeSnapshot` it records the window in `.review-meta.json` and clears
 * the findings of every file in lists A and C.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo] - Only this repo
 * @param {boolean} [args.pull=true]
 * @param {boolean} [args.writeSnapshot=false]
 * @param {(text: string) => void} args.log - Takes the pull's report, skipped repos and warnings
 * @returns {Promise<{ticket: string, generated: string, totals: object, repos: object[]}>}
 * @throws {TimError} USAGE without a review id; NOT_FOUND when the review has no meta file; UNKNOWN when the pull fails
 */
export const buildRefreshScope = async ({
  workspaceRoot,
  reviewId,
  repo,
  pull = true,
  writeSnapshot: shouldWriteSnapshot = false,
  log
}) => {
  if (!reviewId) {
    throw new TimError(
      'USAGE',
      'Usage: tim review refresh scope <review-id> [--repo REPO] [--no-pull] [--write-snapshot]'
    )
  }
  const { folder, metaPath, meta } = readReviewMeta({ workspaceRoot, reviewId })
  if (pull) await pullFirst({ workspaceRoot, reviewId, repo, log })
  const itemsTsv =
    renderItemsTsv(listReviewItems({ workspaceRoot, reviewId })) ?? ''
  const repos = []
  for (const reviewRepo of reposOf(meta)) {
    if (repo !== undefined && reviewRepo !== repo) continue
    if (!isCloned(reviewCloneOf(folder, reviewRepo))) {
      log(`Skipping ${reviewRepo}: not cloned`)
      continue
    }
    repos.push(
      await repoScope({ meta, folder, repo: reviewRepo, itemsTsv, log })
    )
  }
  const scope = {
    ticket: reviewId,
    generated: generatedNow(),
    totals: totalsOf(repos),
    repos
  }
  if (shouldWriteSnapshot) writeSnapshot({ metaPath, meta, folder, scope })
  return scope
}

const repoSummaryLine = ({
  repo,
  lists,
  prior_sha: prior,
  current_sha: current
}) =>
  `  ${repo}: A=${lists.A.length}  B=${lists.B.length}  C=${lists.C.length}  D=${lists.D.length}  prior=${prior.slice(0, 7)}..current=${current.slice(0, 7)}`

/**
 * @param {object} scope - From {@link buildRefreshScope}
 * @returns {string} The totals, then one line per repo
 */
export const renderScopeText = ({ ticket, generated, totals, repos }) =>
  [
    `Refresh scope for ${ticket} (generated ${generated})`,
    `  Totals:  A=${totals.list_a} (changed)  B=${totals.list_b} (open inline)  C=${totals.list_c} (merge)  D=${totals.list_d} (gaps)`,
    '',
    ...repos.map(repoSummaryLine)
  ].join('\n')
