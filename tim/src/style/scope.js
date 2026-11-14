import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import {
  loadCodeStyleRouting,
  topicsForPath
} from '../backlog/standards/code-style-routing.js'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'
import { itemsFilePath, reviewDir } from '../review/paths.js'
import { prFactsCommand, readPrCurrentPaths } from '../review/pr-facts.js'
import { hasVerdict } from '../review/prepare/verdict.js'
import { listMergeResolved } from '../review/refresh/merge-resolved.js'
import {
  isCloned,
  pullRequestsOf,
  reviewCloneOf,
  snapshotChangesOf
} from '../review/refresh/review-meta.js'
import { pullFirst } from '../review/refresh/scope.js'
import { writeJsonAtomic } from '../review/store.js'
import { fileStylePath, styleDir } from './paths.js'

const USAGE =
  'Usage: tim style scope <review-id> [--repo REPO] [--no-pull] [--write-snapshot] [--json]'

const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

const uniqueSorted = (values) => [...new Set(values)].sort(byCodePoint)

const readMetas = ({ workspaceRoot, reviewId }) => {
  const styleFolder = styleDir(workspaceRoot, reviewId)
  const styleMetaPath = join(styleFolder, '.style-meta.json')
  if (!existsSync(styleMetaPath)) {
    throw new TimError('NOT_FOUND', `Style meta not found: ${styleMetaPath}`)
  }
  const reviewFolder = reviewDir(workspaceRoot, reviewId)
  const reviewMetaPath = join(reviewFolder, '.review-meta.json')
  if (!existsSync(reviewMetaPath)) {
    throw new TimError(
      'NOT_FOUND',
      `Review meta not found: ${reviewMetaPath} (cloned repos live there)`
    )
  }
  return {
    styleFolder,
    styleMetaPath,
    styleMeta: readJsonFile(styleMetaPath),
    reviewFolder,
    reviewMeta: readJsonFile(reviewMetaPath)
  }
}

const lastSeenCommit = (meta, repo) => {
  const commit = snapshotChangesOf(meta, repo).at(-1)?.current_commit
  return [undefined, null, false, ''].includes(commit) ? undefined : commit
}

const latestPullRequest = (reviewMeta, repo) =>
  pullRequestsOf(reviewMeta, repo).reduce(
    (latest, pullRequest) =>
      latest === null || pullRequest.pr >= latest.pr ? pullRequest : latest,
    null
  )

const gitLines = async (dir, args) => {
  const { stdout, exitCode } = await run('git', ['-C', dir, ...args])
  return exitCode === 0 ? stdout.split('\n').filter((line) => line !== '') : []
}

const headOf = async (dir) => {
  const { stdout, exitCode, stderr } = await run('git', [
    '-C',
    dir,
    'rev-parse',
    'HEAD'
  ])
  if (exitCode !== 0) throw new TimError('UNKNOWN', stderr)
  return stdout.trim()
}

const mergeResolvedIn = async (dir, prior, head) => {
  try {
    return await listMergeResolved({ repoDir: dir, prior, head })
  } catch {
    return []
  }
}

const coverageGaps = ({
  styleFolder,
  reviewFolder,
  repo,
  pr,
  isSource,
  log
}) => {
  try {
    return readPrCurrentPaths({ reviewFolder, repo, pr })
      .filter((file) => file !== '' && isSource(file))
      .filter((file) => !hasVerdict(fileStylePath(styleFolder, repo, file)))
  } catch {
    log(`Warning: failed to fetch PR files for DEFRA/${repo} #${pr}`)
    log(`  Write them with: ${prFactsCommand(reviewFolder, repo, pr)}`)
    return []
  }
}

const repoItems = (styleFolder, repo) => {
  const path = itemsFilePath(styleFolder, repo)
  if (!existsSync(path)) return []
  return readJsonFile(path).items.map((item) => ({ ...item, repo }))
}

const isOpenItem = ({ disposition, status }) =>
  (disposition ?? '') === '' ||
  ((disposition === 'Fix' || disposition === 'Discuss') &&
    (status ?? '') === 'Not Done')

const itemsFor = (items, file) => items.filter((item) => item.file === file)

const windowOf = async ({ dir, styleMeta, reviewMeta, repo, pullRequest }) => {
  const currentSha = await headOf(dir)
  const priorSha =
    lastSeenCommit(styleMeta, repo) ??
    lastSeenCommit(reviewMeta, repo) ??
    String(pullRequest?.commit ?? null)
  return { priorSha, currentSha, noChanges: priorSha === currentSha }
}

const listsFor = async ({ dir, window, items, isSource, gaps }) => {
  const { priorSha, currentSha, noChanges } = window
  const shas = { old_sha: priorSha, new_sha: currentSha }
  const changedFiles = noChanges
    ? []
    : await gitLines(dir, ['diff', '--name-only', `${priorSha}..${currentSha}`])
  const mergeResolved = noChanges
    ? []
    : (await mergeResolvedIn(dir, priorSha, currentSha)).filter(({ file }) =>
        isSource(file)
      )
  const mergeFiles = new Set(mergeResolved.map(({ file }) => file))
  return {
    A: uniqueSorted(changedFiles.filter(isSource))
      .filter((file) => !mergeFiles.has(file))
      .map((file) => ({ file, ...shas, prior_items: itemsFor(items, file) })),
    B: items.filter(
      (item) => isOpenItem(item) && !changedFiles.includes(item.file)
    ),
    C: mergeResolved.map(({ merge, file }) => ({
      file,
      merge_sha: merge,
      ...shas,
      prior_items: itemsFor(items, file)
    })),
    D: gaps.map((file) => ({ file }))
  }
}

const repoScope = async ({ metas, repo, isSource, log }) => {
  const { styleFolder, styleMeta, reviewFolder, reviewMeta } = metas
  const dir = reviewCloneOf(reviewFolder, repo)
  const pullRequest = latestPullRequest(reviewMeta, repo)
  const pr = pullRequest?.pr ?? null
  const window = await windowOf({
    dir,
    styleMeta,
    reviewMeta,
    repo,
    pullRequest
  })
  const gaps = coverageGaps({
    styleFolder,
    reviewFolder,
    repo,
    pr,
    isSource,
    log
  })
  const lists = await listsFor({
    dir,
    window,
    items: repoItems(styleFolder, repo),
    isSource,
    gaps
  })
  return {
    repo,
    pr,
    prior_sha: window.priorSha,
    current_sha: window.currentSha,
    no_changes: window.noChanges,
    lists
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
  changes: repos.map((scoped) => ({
    repo: scoped.repo,
    pr: scoped.pr,
    reviewed_commit: scoped.prior_sha,
    current_commit: scoped.current_sha,
    changed: !scoped.no_changes,
    file_count:
      scoped.lists.A.length + scoped.lists.C.length + scoped.lists.D.length
  }))
})

const writeSnapshot = ({ styleMetaPath, styleMeta, generated, repos }) => {
  const snapshot = snapshotOf(generated, repos)
  writeJsonAtomic(styleMetaPath, {
    ...styleMeta,
    re_review: snapshot,
    re_reviews: [...(styleMeta.re_reviews ?? []), snapshot]
  })
}

const generatedNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

const scopedRepos = async ({ metas, repo, isSource, log }) => {
  const repos = []
  for (const styleRepo of uniqueSorted(
    metas.styleMeta.source_files.map((sourceFile) => sourceFile.repo)
  )) {
    if (repo !== undefined && styleRepo !== repo) continue
    const dir = reviewCloneOf(metas.reviewFolder, styleRepo)
    if (!isCloned(dir)) {
      log(`Skipping ${styleRepo}: not cloned at ${dir}`)
      continue
    }
    repos.push(await repoScope({ metas, repo: styleRepo, isSource, log }))
  }
  return repos
}

/**
 * Sorts a code style review's refresh work into four lists for each repo
 * with source files and a review clone, over the window from the commit
 * the last style refresh saw (else the last review refresh, else the
 * latest pull request's commit) to the clone's HEAD, keeping only files
 * the code-style routing maps to a topic: A, files changed and not
 * merge-resolved, each with its items; B, open items in files that did not
 * change; C, files hand-resolved in a merge, each with its items; D, files
 * the latest pull request changes with no style verdict, read from
 * `.prs/<repo>-<pr>.json` in the review folder. It pulls the clones first
 * unless told not to. With `writeSnapshot` it records the window in
 * `.style-meta.json`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId] - A ticket key
 * @param {string} [args.repo] - Only this repo
 * @param {boolean} [args.pull=true]
 * @param {boolean} [args.writeSnapshot=false]
 * @param {(text: string) => void} args.log - Takes the pull's report, skipped repos and warnings
 * @returns {Promise<{ticket: string, generated: string, totals: object, repos: object[]}>}
 * @throws {TimError} USAGE without a review id; NOT_FOUND when the style or review meta is missing; UNKNOWN when the pull fails
 */
export const buildStyleScope = async ({
  workspaceRoot,
  reviewId,
  repo,
  pull = true,
  writeSnapshot: shouldWriteSnapshot = false,
  log
}) => {
  if (!reviewId) throw new TimError('USAGE', USAGE)
  const metas = readMetas({ workspaceRoot, reviewId })
  if (pull) await pullFirst({ workspaceRoot, reviewId, repo, log })
  const routing = loadCodeStyleRouting(workspaceRoot)
  const isSource = (file) => topicsForPath(routing, file).length > 0
  const repos = await scopedRepos({ metas, repo, isSource, log })
  const generated = generatedNow()
  if (shouldWriteSnapshot) {
    writeSnapshot({ ...metas, generated, repos })
  }
  return { ticket: reviewId, generated, totals: totalsOf(repos), repos }
}

const repoSummaryLine = ({
  repo,
  lists,
  prior_sha: prior,
  current_sha: current
}) =>
  `  ${repo}: A=${lists.A.length}  B=${lists.B.length}  C=${lists.C.length}  D=${lists.D.length}  prior=${prior.slice(0, 7)}..current=${current.slice(0, 7)}`

/**
 * @param {Awaited<ReturnType<typeof buildStyleScope>>} scope
 * @returns {string} The totals, then one line per repo
 */
export const renderStyleScopeText = ({ ticket, generated, totals, repos }) =>
  [
    `Style refresh scope for ${ticket} (generated ${generated})`,
    `  Totals:  A=${totals.list_a} (changed source)  B=${totals.list_b} (open inline)  C=${totals.list_c} (merge)  D=${totals.list_d} (gaps)`,
    '',
    ...repos.map(repoSummaryLine)
  ].join('\n')
