import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../../errors.js'
import { bestPracticeSections, detectedTechOf } from '../../ticket/repo-tech.js'
import {
  alternative,
  interpolated,
  rawOutput,
  uniqueSorted
} from '../../understanding-check/jq-values.js'
import { selectPullRequests } from '../../understanding-check/pull-requests.js'
import { initFileReview } from '../file-review.js'
import { fileReviewPath, reviewDir } from '../paths.js'
import { readPrFiles } from '../pr-facts.js'
import { writeJsonAtomic } from '../store.js'
import { checkOutPullRequestCommit, pinReviewCloneFetch } from './clone.js'
import {
  rawFolder,
  readPullRequestView,
  readSearchedPullRequests
} from './gh-output.js'
import { branchTicketFile, ticketFileFromJira } from './ticket-file.js'
import { hasVerdict } from './verdict.js'

const SHORT_SHA_LENGTH = 7

/**
 * The id a review is kept under: the ticket, or for a branch review the
 * branch without a leading `feature/` and with each `/` as `-`.
 *
 * @param {{ticket?: string, branch?: string}} args
 * @returns {string}
 */
export const reviewIdOf = ({ ticket, branch }) =>
  branch === undefined
    ? ticket
    : branch.replace(/^feature\//, '').replaceAll('/', '-')

const refuseWithoutTicketOrBranch = ({ ticket, branch }) => {
  if (!ticket && branch === undefined) {
    throw new TimError(
      'USAGE',
      'Usage: tim review prepare EUDPA-XXXXX | --branch <name> [--desc <text>] | --local <repo> <branch> [--files F1,F2,...] [--select] [--json]'
    )
  }
}

const textTranscript = () => {
  const chunks = []
  return {
    line: (text) => chunks.push(`${text}\n`),
    raw: (text) => chunks.push(text),
    text: () => chunks.join('')
  }
}

const writeTicketFile = async ({ context, ticket, branch, description }) => {
  const { folder, reviewId, log } = context
  if (branch !== undefined) {
    log(`No-ticket mode: using branch ${branch}`)
    log('Writing ticket.md...')
    writeFileSync(
      join(folder, 'ticket.md'),
      branchTicketFile({ reviewId, branch, description })
    )
    return { type: 'Branch Review', summary: description }
  }
  const { type, summary, markdown } = await ticketFileFromJira({ ticket, log })
  log('Writing ticket.md...')
  writeFileSync(join(folder, 'ticket.md'), markdown)
  return { type, summary }
}

const repoNameOf = (pullRequest) => pullRequest?.repository?.name ?? null

const selectedPullRequests = ({ context, ticket, branch }) => {
  const { folder, log } = context
  log('Finding PRs...')
  const searched = readSearchedPullRequests({
    reviewFolder: folder,
    ticket,
    branch
  })
  if (searched.length === 0) log('No PRs found')
  const selected = selectPullRequests(searched)
  selected.forEach((pullRequest) =>
    log(
      `Selected ${interpolated(repoNameOf(pullRequest))}#${interpolated(pullRequest.number)} (${interpolated(pullRequest.state)}, opened ${interpolated(pullRequest.createdAt ?? null)})`
    )
  )
  return selected
}

const mergedAtOf = (view) => {
  const mergedAt = alternative(view.mergedAt, '')
  return mergedAt === '' || mergedAt === 'null' ? '' : rawOutput(mergedAt)
}

const targetOf = (view) => {
  const merged = mergedAtOf(view) !== ''
  const commit = rawOutput(
    merged ? (view.mergeCommit?.oid ?? null) : (view.headRefOid ?? null)
  )
  return {
    merged,
    commitKind: merged ? 'merge' : 'head',
    commit: commit === '' || commit === 'null' ? null : commit
  }
}

const changedFileCountOf = (view) =>
  Array.isArray(view.files) ? view.files.length : 0

const doneLine = ({ repo, number, commit, commitKind, files, tech }) => {
  const technologies = tech.technologies.join(', ')
  const summary = `  ✓ ${repo}#${number} at ${commit.slice(0, SHORT_SHA_LENGTH)} (${commitKind}, ${files} files)`
  return technologies === '' ? summary : `${summary} [${technologies}]`
}

const preparePullRequest = async ({ context, pullRequest }) => {
  const { folder, workspaceRoot } = context
  const transcript = textTranscript()
  const repo = rawOutput(repoNameOf(pullRequest))
  const number = rawOutput(pullRequest.number)
  const state = rawOutput(pullRequest.state ?? null)
  transcript.line(`Processing ${repo}#${number} (${state})...`)
  const view = readPullRequestView(folder, repo)
  if (view === null) return { transcript }
  const files = changedFileCountOf(view)
  const { merged, commitKind, commit } = targetOf(view)
  if (commit === null) {
    transcript.line(`  Could not get target commit for ${repo}#${number}`)
    return { transcript }
  }
  const dir = join(folder, 'repos', repo)
  const checkedOut = await checkOutPullRequestCommit({
    dir,
    repo,
    commit,
    commitKind,
    transcript
  })
  if (!checkedOut) return { transcript }
  await pinReviewCloneFetch({
    dir,
    pullRequest: number,
    merged,
    transcript
  })
  const tech = detectedTechOf({ workspaceRoot, repoDir: dir })
  transcript.line(doneLine({ repo, number, commit, commitKind, files, tech }))
  return {
    transcript,
    metaEntry: {
      repo,
      pr: pullRequest.number,
      commit,
      state,
      files,
      tech
    }
  }
}

const prepareEveryPullRequest = async ({ context, selected }) => {
  const prepared = await Promise.all(
    selected.map((pullRequest) => preparePullRequest({ context, pullRequest }))
  )
  prepared.forEach(({ transcript }) => context.write(transcript.text()))
  return prepared.filter(({ metaEntry }) => metaEntry !== undefined)
}

const writeBundles = ({ context, entries }) => {
  const { folder, workspaceRoot, log } = context
  log('')
  log('Concatenating best-practices per repo...')
  mkdirSync(join(folder, 'best-practices'), { recursive: true })
  entries.forEach(({ repo, tech }) => {
    writeFileSync(
      join(folder, 'best-practices', `${repo}.md`),
      `# Best practices applicable to ${repo}\n\nConcatenated from \`docs/best-practices/\` at prepare-review time.\nApply these standards when reviewing files in this repo.\n\n${bestPracticeSections({ workspaceRoot, bestPractices: tech.best_practices })}`
    )
    log(`  Created: best-practices/${repo}.md`)
  })
}

const changedFilesOf = (folder, { repo, pr }) => {
  try {
    return readPrFiles({ reviewFolder: folder, repo, pr })
  } catch {
    return null
  }
}

const seedPullRequestPlaceholders = ({ context, entry }) => {
  const { folder, workspaceRoot, reviewId, log } = context
  const files = changedFilesOf(folder, entry)
  if (files === null) return 0
  mkdirSync(join(folder, 'file-reviews', entry.repo), { recursive: true })
  const placeholderFiles = files
    .filter((file) => file !== '')
    .filter((file) => !hasVerdict(fileReviewPath(folder, entry.repo, file)))
  placeholderFiles.forEach((file) => {
    initFileReview({
      workspaceRoot,
      reviewId,
      repo: entry.repo,
      file,
      commit: entry.commit,
      pr: String(entry.pr),
      mode: 'FRESH'
    })
    log(`  Created: ${entry.repo}/${file}`)
  })
  return placeholderFiles.length
}

const seedPlaceholders = ({ context, entries }) => {
  context.log('')
  context.log('Creating file review placeholders...')
  return entries.reduce(
    (created, entry) =>
      created + seedPullRequestPlaceholders({ context, entry }),
    0
  )
}

const isEmptyOrMissing = (path) =>
  (statSync(path, { throwIfNoEntry: false })?.size ?? 0) === 0

const touchStub = ({ path, label, log }) => {
  if (!isEmptyOrMissing(path)) return
  if (!existsSync(path)) writeFileSync(path, '')
  log(`  Created: ${label}`)
}

const seedRepoStubs = ({ context, selected }) => {
  const { folder, log } = context
  log('')
  log('Creating per-repo stubs...')
  const repos = [
    ...new Set(selected.map((pullRequest) => repoNameOf(pullRequest)))
  ].map((repo) => rawOutput(repo))
  repos.forEach((repo) => {
    mkdirSync(join(folder, 'file-reviews', repo), { recursive: true })
    touchStub({
      path: join(folder, `review.${repo}.md`),
      label: `review.${repo}.md`,
      log
    })
    touchStub({
      path: join(folder, 'file-reviews', repo, '_consistency-check.md'),
      label: `${repo}/_consistency-check.md`,
      log
    })
  })
  return repos.length
}

const metaFor = ({ reviewId, ticket, branch, now, entries }) => ({
  id: reviewId,
  ticket: ticket ?? '',
  branch: branch ?? '',
  created: now,
  themes: ['code', 'consistency'],
  best_practices: uniqueSorted(
    entries.flatMap(({ tech }) => tech.best_practices ?? [])
  ),
  prs: entries
})

/**
 * Prepares a ticket's review, or a branch's, from Jira and what `gh` saved
 * in the review's raw folder: writes `ticket.md`, puts a review clone of
 * each selected pull request (one per repo: an open one over any other,
 * then the newest) at its merge commit, or its head when not merged, pins
 * the clone's fetch to the pull request, bakes each repo's best-practices
 * bundle, writes `.review-meta.json`, seeds a placeholder for each changed
 * file `.prs/<repo>-<pr>.json` lists that has no verdict yet and the
 * per-repo stubs, then removes the raw folder. A pull request with no
 * saved view, no target commit or a clone that fails is left out of the
 * meta. Progress goes to `write`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.ticket]
 * @param {string} [args.branch] - Review a branch's pull requests instead of a ticket's
 * @param {string} [args.description] - The branch review's description
 * @param {string} args.now - The time to stamp as `created`
 * @param {(text: string) => void} args.write
 * @returns {Promise<{meta: object, folder: string, ticket?: string, branch?: string, type: string, summary: string, cloned: string[], createdFiles: number, stubRepos: number}>}
 * @throws {TimError} USAGE without a ticket or branch; NOT_FOUND when gh saved no pull requests; when Jira cannot give the ticket
 */
export const prepareReview = async ({
  workspaceRoot,
  ticket,
  branch,
  description,
  now,
  write
}) => {
  refuseWithoutTicketOrBranch({ ticket, branch })
  const reviewId = reviewIdOf({ ticket, branch })
  const folder = reviewDir(workspaceRoot, reviewId)
  const context = {
    workspaceRoot,
    reviewId,
    folder,
    write,
    log: (line) => write(`${line}\n`)
  }
  context.log('Creating review workspace...')
  mkdirSync(join(folder, 'repos'), { recursive: true })
  mkdirSync(join(folder, 'file-reviews'), { recursive: true })

  const { type, summary } = await writeTicketFile({
    context,
    ticket,
    branch,
    description: description ?? `Branch review: ${branch}`
  })
  const selected = selectedPullRequests({ context, ticket, branch })
  const entries = (await prepareEveryPullRequest({ context, selected })).map(
    ({ metaEntry }) => metaEntry
  )
  const meta = metaFor({ reviewId, ticket, branch, now, entries })
  writeJsonAtomic(join(folder, '.review-meta.json'), meta)
  writeBundles({ context, entries })
  const createdFiles = seedPlaceholders({ context, entries })
  const stubRepos = seedRepoStubs({ context, selected })
  rmSync(rawFolder(folder), { recursive: true, force: true })
  return {
    meta,
    folder,
    ticket,
    branch,
    type,
    summary,
    cloned: entries.map(({ repo }) => repo),
    createdFiles,
    stubRepos
  }
}

/**
 * The summary `tim review prepare` prints once a review is ready.
 *
 * @param {Awaited<ReturnType<typeof prepareReview>>} prepared
 * @returns {string}
 */
export const preparedReviewText = ({
  meta,
  folder,
  ticket,
  branch,
  type,
  summary,
  cloned,
  createdFiles,
  stubRepos
}) =>
  [
    '',
    '=== Review Workspace Ready ===',
    ...(branch === undefined
      ? [`Ticket: ${ticket} (${type})`]
      : [`Review: ${meta.id}`, `Branch: ${branch}`]),
    `Summary: ${summary}`,
    `Directory: ${folder}`,
    '',
    'Created:',
    '  ✓ ticket.md',
    '  ✓ .review-meta.json',
    ...cloned.map((repo) => `  ✓ repos/${repo}/`),
    `  ✓ file-reviews/ (${createdFiles} files)`,
    `  ✓ review.{repo}.md stubs (${stubRepos} repos)`,
    `  ✓ _consistency-check.md stubs (${stubRepos} repos)`,
    '',
    `Next: Review each file, write each PR's changed files to .prs/ with gh api, then run tim review verify files ${meta.id}`
  ].join('\n')
