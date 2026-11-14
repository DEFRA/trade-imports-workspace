import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readJsonFile } from '../../backlog/io.js'
import { TimError } from '../../errors.js'
import { itemsFilePath, reviewDir } from '../paths.js'
import { shareBody, verdictOf } from './body.js'
import { pushHandoffBranch } from './handoff.js'
import { copyReviewWithoutClones } from './shared-copy.js'

const GITHUB_COMMENT_LIMIT = 65536
const TICKET_PREFIX = 'EUDPA-'
const UNKNOWN_REVIEWER = '(unknown)'
const SHORT_SHA_LENGTH = 8

const USAGE =
  'Usage: tim review share EUDPA-XXXXX [--repo R] [--pr N] [--comment-only] [--summary] [--branch B] [--reviewer LOGIN] [--dry-run] [--json]'

const prsInScope = ({ meta, repo, pr }) => {
  const wantedPr = pr === undefined ? undefined : Number(pr)
  if (wantedPr !== undefined && Number.isNaN(wantedPr)) {
    throw new TimError('USAGE', `--pr must be a number. Got "${pr}".`)
  }
  const prs = (meta.prs ?? [])
    .filter((entry) => repo === undefined || entry.repo === repo)
    .filter((entry) => wantedPr === undefined || entry.pr === wantedPr)
  if (prs.length === 0) {
    const repoWords = repo === undefined ? '' : ` repo ${repo}`
    const prWords = pr === undefined ? '' : ` PR ${pr}`
    throw new TimError(
      'NOT_FOUND',
      `No PR matching${repoWords}${prWords} in .review-meta.json prs[]`
    )
  }
  return prs
}

const readMeta = (folder) => {
  const metaPath = join(folder, '.review-meta.json')
  if (!existsSync(metaPath)) {
    throw new TimError('NOT_FOUND', `No .review-meta.json at ${metaPath}`)
  }
  return readJsonFile(metaPath)
}

const readRepoItems = (artefactDir, repo) => {
  const itemsPath = itemsFilePath(artefactDir, repo)
  if (!existsSync(itemsPath)) return null
  const { items } = readJsonFile(itemsPath)
  if (!Array.isArray(items)) {
    throw new TimError('PARSE', `${itemsPath} has no items list.`)
  }
  return items
}

const readVerdict = (artefactDir) => {
  const indexPath = join(artefactDir, 'review-index.md')
  return existsSync(indexPath) ? verdictOf(readFileSync(indexPath, 'utf8')) : ''
}

const reviewedShaOf = (prs, repo) => {
  const commit = prs.find((entry) => entry.repo === repo)?.commit
  return typeof commit === 'string' ? commit.slice(0, SHORT_SHA_LENGTH) : ''
}

const writeBodyFile = ({ ticket, pr, body }) => {
  const path = join(
    tmpdir(),
    `share-review-${ticket}-pr${pr}-${randomBytes(6).toString('hex')}.md`
  )
  writeFileSync(path, body, { flag: 'wx' })
  return path
}

const refuseOverLimit = ({ repo, pr, file, body, summary }) => {
  const size = Buffer.byteLength(body)
  if (size <= GITHUB_COMMENT_LIMIT) return
  throw new TimError(
    'USAGE',
    [
      `Comment body for ${repo}#${pr} is ${size} characters; GitHub accepts ${GITHUB_COMMENT_LIMIT}.`,
      summary
        ? 'Already summarising. Shorten the verdict in review-index.md, or post the detail as an attachment on the ticket.'
        : 'Re-run with --summary to post counts instead of the full item table.',
      `Rendered body left at: ${file}`
    ].join('\n')
  )
}

const renderBodyFiles = ({
  ticket,
  prs,
  artefactDir,
  branch,
  reviewer,
  summary
}) => {
  const verdict = readVerdict(artefactDir)
  return prs.map(({ repo, pr }) => {
    const body = shareBody({
      ticket,
      repo,
      verdict,
      reviewer,
      reviewedSha: reviewedShaOf(prs, repo),
      branch,
      items: readRepoItems(artefactDir, repo),
      hasSummaryFile: existsSync(join(artefactDir, `review.${repo}.md`)),
      summary
    })
    const file = writeBodyFile({ ticket, pr, body })
    refuseOverLimit({ repo, pr, file, body, summary })
    return { repo, pr, file }
  })
}

/**
 * Renders a review's comment body for each pull request in scope, one
 * file each in the system temp folder, for `gh pr comment --body-file` to
 * post. A handoff (no `commentOnly`) first copies the review to
 * workareas/shared/<ticket> without its clones and diffs and, unless
 * `dryRun`, commits that copy to the handoff branch and pushes it.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.ticket] - An `EUDPA-` key
 * @param {string} [args.repo] - Only this repo's pull requests
 * @param {string} [args.pr] - Only pull requests with this number
 * @param {boolean} [args.commentOnly] - No shared copy and no handoff branch
 * @param {boolean} [args.summary] - Counts in place of the full item table
 * @param {string} [args.branch] - The handoff branch; defaults to chore/<ticket>
 * @param {string} [args.reviewer] - The login the bodies name; defaults to (unknown)
 * @param {boolean} [args.dryRun] - Render only: no commit and no push
 * @returns {Promise<{dry_run: boolean, ticket: string, mode: string, branch: string | null, reviewer: string, body_files: {repo: string, pr: number, file: string}[], prs: object[], committed?: boolean}>}
 * @throws {TimError} USAGE with no ticket or a body over GitHub's comment limit; NOT_FOUND with no review or no pull request in scope; DIRTY_TREE when a handoff finds changes outside workareas/shared/
 */
export const shareReview = async ({
  workspaceRoot,
  ticket,
  repo,
  pr,
  commentOnly = false,
  summary = false,
  branch,
  reviewer = UNKNOWN_REVIEWER,
  dryRun = false
}) => {
  if (!ticket?.startsWith(TICKET_PREFIX)) throw new TimError('USAGE', USAGE)
  const reviewFolder = reviewDir(workspaceRoot, ticket)
  const prs = prsInScope({ meta: readMeta(reviewFolder), repo, pr })
  const handoffBranch = commentOnly ? null : (branch ?? `chore/${ticket}`)
  const sharedDir = join(workspaceRoot, 'workareas', 'shared', ticket)
  if (!commentOnly) copyReviewWithoutClones(reviewFolder, sharedDir)
  const bodyFiles = renderBodyFiles({
    ticket,
    prs,
    artefactDir: commentOnly ? reviewFolder : sharedDir,
    branch: handoffBranch,
    reviewer,
    summary
  })
  const shared = {
    dry_run: dryRun,
    ticket,
    mode: commentOnly ? 'comment-only' : 'handoff',
    branch: handoffBranch,
    reviewer,
    body_files: bodyFiles,
    prs
  }
  if (dryRun || commentOnly) return shared
  const { committed } = await pushHandoffBranch({
    workspaceRoot,
    ticket,
    branch: handoffBranch,
    sharedDir
  })
  return { ...shared, committed }
}

const prList = (prs) => prs.map(({ repo, pr }) => `${repo}#${pr}`).join(', ')

const bodyLines = (bodyFiles) =>
  bodyFiles.map(({ repo, pr, file }) => `  - ${repo}#${pr} → ${file}`)

const dryRunText = (shared) =>
  [
    'DRY RUN — no git mutations, no PR comment posted.',
    `Ticket:        ${shared.ticket}`,
    `Mode:          ${shared.mode}`,
    ...(shared.branch === null ? [] : [`Handoff branch: ${shared.branch}`]),
    `PRs in scope:  ${prList(shared.prs)}`,
    `Reviewer:      ${shared.reviewer}`,
    'Rendered bodies:',
    ...bodyLines(shared.body_files),
    '',
    'Inspect a body with: cat <file>'
  ].join('\n')

const postCommand = ({ repo, pr, file }) =>
  `  gh pr comment ${pr} --repo DEFRA/${repo} --body-file ${file}`

const readyText = (shared) =>
  [
    ...(shared.committed === false
      ? [
          `No changes to commit on ${shared.branch} (artefacts already up to date).`
        ]
      : []),
    shared.branch === null
      ? `Review ready to post for ${shared.ticket}.`
      : `Handoff branch pushed for ${shared.ticket}.`,
    '',
    ...(shared.branch === null
      ? []
      : [`Branch:        ${shared.branch} (pushed to origin)`]),
    `Reviewer:      ${shared.reviewer}`,
    'Post each comment with gh:',
    ...shared.body_files.map(postCommand),
    '',
    'Bodies archived at:',
    ...bodyLines(shared.body_files)
  ].join('\n')

/**
 * @param {Awaited<ReturnType<typeof shareReview>>} shared
 * @returns {string}
 */
export const sharedReviewText = (shared) =>
  shared.dry_run ? dryRunText(shared) : readyText(shared)
