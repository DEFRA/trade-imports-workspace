import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import {
  loadCodeStyleRouting,
  topicsForPath
} from '../backlog/standards/code-style-routing.js'
import { TimError } from '../errors.js'
import { reviewDir } from '../review/paths.js'
import { prFactsCommand, prFactsPath, readPrFiles } from '../review/pr-facts.js'
import {
  prepareLocalReview,
  preparedLocalReviewText
} from '../review/prepare/prepare-local.js'
import { hasVerdict } from '../review/prepare/verdict.js'
import { writeJsonAtomic } from '../review/store.js'
import { initFileStyle } from './file-style.js'
import { fileStylePath, styleDir } from './paths.js'
import { bakeStyleBundle } from './rules-bundle.js'

const reviewMetaPath = (workspaceRoot, reviewId) =>
  join(reviewDir(workspaceRoot, reviewId), '.review-meta.json')

const readPreparedReviewMeta = (workspaceRoot, reviewId) => {
  const path = reviewMetaPath(workspaceRoot, reviewId)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `Review workspace missing: ${path}\nPrepare it first with the review skill's Step 1: save the pull requests with gh, then run tim review prepare ${reviewId}`
    )
  }
  return readJsonFile(path)
}

const changedPathsOf = ({ reviewFolder, pullRequest: { repo, pr, files } }) => {
  const paths = readPrFiles({ reviewFolder, repo, pr })
  if (paths.length === 0 && files > 0) {
    throw new TimError(
      'PARSE',
      `${repo}#${pr} changes ${files} files, but ${prFactsPath(reviewFolder, repo, pr)} lists none. Write it again with:\n  ${prFactsCommand(reviewFolder, repo, pr)}`
    )
  }
  return paths
}

const sourceFilesOf = ({ routing, entries }) =>
  entries
    .map((entry) => ({ ...entry, topics: topicsForPath(routing, entry.path) }))
    .filter(({ topics }) => topics.length > 0)

const pullRequestEntries = ({ reviewFolder, meta }) =>
  meta.prs.flatMap((pullRequest) =>
    changedPathsOf({ reviewFolder, pullRequest }).map((path) => ({
      repo: pullRequest.repo,
      path,
      pr: pullRequest.pr,
      commit: pullRequest.commit
    }))
  )

const seedPlaceholders = ({ workspaceRoot, reviewId, folder, sourceFiles }) => {
  const unreviewed = sourceFiles.filter(
    ({ repo, path }) => !hasVerdict(fileStylePath(folder, repo, path))
  )
  unreviewed.forEach(({ repo, path, pr, commit }) =>
    initFileStyle({
      workspaceRoot,
      reviewId,
      repo,
      file: path,
      commit,
      pr: pr === undefined ? undefined : JSON.stringify(pr),
      mode: 'FRESH'
    })
  )
  return unreviewed.length
}

const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

const repoTopicPairs = (sourceFiles) =>
  [
    ...new Set(
      sourceFiles.flatMap(({ repo, topics }) =>
        topics.map((topic) => `${repo}\t${topic}`)
      )
    )
  ]
    .sort(byCodePoint)
    .map((pair) => pair.split('\t'))

const bakeBundles = ({ workspaceRoot, reviewId, sourceFiles, repoDirOf }) =>
  repoTopicPairs(sourceFiles).map(([repo, topic]) => {
    bakeStyleBundle({
      workspaceRoot,
      reviewId,
      repo,
      topic,
      repoDir: repoDirOf(repo)
    })
    return `style-rules.${repo}.${topic}.md`
  })

const writeStyleWorkspace = ({
  workspaceRoot,
  reviewId,
  meta,
  repoDirOf,
  noneFound,
  log
}) => {
  const folder = styleDir(workspaceRoot, reviewId)
  if (meta.source_files.length === 0) log(noneFound)
  writeJsonAtomic(join(folder, '.style-meta.json'), meta)
  log('Creating per-file .style.json placeholders...')
  const createdFiles = seedPlaceholders({
    workspaceRoot,
    reviewId,
    folder,
    sourceFiles: meta.source_files
  })
  log('Baking per-(repo, topic) style-rules bundles...')
  const bundles = bakeBundles({
    workspaceRoot,
    reviewId,
    sourceFiles: meta.source_files,
    repoDirOf
  })
  return { meta, folder, createdFiles, bundles }
}

const startStyleWorkspace = ({ workspaceRoot, reviewId, log }) => {
  log('Creating code-style workspace...')
  mkdirSync(join(styleDir(workspaceRoot, reviewId), 'file-reviews'), {
    recursive: true
  })
  log('Discovering reviewable source files...')
}

/**
 * Prepares a ticket's code style review from its review workspace: each
 * file a pull request changes (and, for a rename, its old path) that the
 * code-style routing maps to a topic becomes a source file. It writes
 * `.style-meta.json`, a placeholder for each source file with no verdict
 * yet, and one rules bundle per repo and topic, built against the review
 * clone. Progress goes to `log`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId] - A ticket key
 * @param {string} args.now - The time to stamp as `created`
 * @param {(line: string) => void} args.log
 * @returns {{meta: object, folder: string, createdFiles: number, bundles: string[]}}
 * @throws {TimError} USAGE without a review id; NOT_FOUND when the review workspace or a pull request's `.prs/` file is missing; PARSE when a `.prs/` file lists no files for a pull request that changes some
 */
export const prepareStyleReview = ({ workspaceRoot, reviewId, now, log }) => {
  if (!reviewId) {
    throw new TimError('USAGE', 'Usage: tim style prepare <review-id> [--json]')
  }
  const reviewMeta = readPreparedReviewMeta(workspaceRoot, reviewId)
  const reviewFolder = reviewDir(workspaceRoot, reviewId)
  const entries = pullRequestEntries({ reviewFolder, meta: reviewMeta })
  const routing = loadCodeStyleRouting(workspaceRoot)
  startStyleWorkspace({ workspaceRoot, reviewId, log })
  return writeStyleWorkspace({
    workspaceRoot,
    reviewId,
    meta: {
      id: reviewId,
      created: now,
      source_files: sourceFilesOf({ routing, entries })
    },
    repoDirOf: (repo) => join(reviewFolder, 'repos', repo),
    noneFound: 'No reviewable source files found across any PR.',
    log
  })
}

/**
 * Prepares a code style review of a branch of a workspace repo, with no
 * ticket and no pull request, under `local/<repo>/<branch>`: it prepares
 * the local review first, as `tim review prepare --local` does, reporting
 * to `reviewLog`, then takes each changed file the code-style routing maps
 * to a topic, as {@link prepareStyleReview} does. Bundles are built against
 * `repos/<repo>`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.repo] - A folder under `repos/`
 * @param {string} [args.branch]
 * @param {string} [args.fileList] - Comma-separated paths inside the repo
 * @param {string} args.now - The time to stamp as `created`
 * @param {(line: string) => void} args.log
 * @param {(line: string) => void} args.reviewLog
 * @returns {Promise<{meta: object, folder: string, createdFiles: number, bundles: string[]}>}
 * @throws {TimError} USAGE without a repo and branch or when the repo is not a git repo; NOT_FOUND for an unknown branch or no merge-base
 */
export const prepareLocalStyleReview = async ({
  workspaceRoot,
  repo,
  branch,
  fileList,
  now,
  log,
  reviewLog
}) => {
  if (!repo || !branch) {
    throw new TimError(
      'USAGE',
      'Usage: tim style prepare --local <repo> <branch> [--files F1,F2,...] [--json]'
    )
  }
  log('Preparing local review workspace (changed-file discovery)...')
  const prepared = await prepareLocalReview({
    workspaceRoot,
    repo,
    branch,
    fileList,
    now,
    log: reviewLog
  })
  reviewLog(preparedLocalReviewText(prepared))
  const reviewId = prepared.meta.id
  const routing = loadCodeStyleRouting(workspaceRoot)
  startStyleWorkspace({ workspaceRoot, reviewId, log })
  const entries = prepared.meta.files.map((path) => ({
    repo,
    path,
    commit: prepared.meta.head
  }))
  return writeStyleWorkspace({
    workspaceRoot,
    reviewId,
    meta: {
      id: reviewId,
      local: true,
      repo,
      branch,
      created: now,
      source_files: sourceFilesOf({ routing, entries })
    },
    repoDirOf: () => join(workspaceRoot, 'repos', repo),
    noneFound: 'No reviewable source files found on this branch.',
    log
  })
}

const createdLines = ({ createdFiles, bundles }) => [
  'Created:',
  '  ✓ .style-meta.json',
  `  ✓ file-reviews/ (${createdFiles} placeholders)`,
  ...bundles.map((bundle) => `  ✓ ${bundle}`)
]

const nextLine = (meta, where) =>
  meta.source_files.length === 0
    ? `Note: no reviewable source files ${where} — no code-style review needed.`
    : 'Next: spawn STYLE_FILE_REVIEWER subagents (FRESH Step 4).'

/**
 * The summary `tim style prepare` prints once a style review is ready.
 *
 * @param {ReturnType<typeof prepareStyleReview>} prepared
 * @returns {string}
 */
export const preparedStyleText = (prepared) => {
  const { meta, folder } = prepared
  const heading = meta.local
    ? [
        '=== Local Code-Style Workspace Ready ===',
        `Repo: ${meta.repo}`,
        `Branch: ${meta.branch}`
      ]
    : ['=== Code-Style Workspace Ready ===', `Ticket: ${meta.id}`]
  return [
    '',
    ...heading,
    `Directory: ${folder}`,
    '',
    ...createdLines(prepared),
    '',
    nextLine(meta, meta.local ? 'on this branch' : 'in this PR')
  ].join('\n')
}
