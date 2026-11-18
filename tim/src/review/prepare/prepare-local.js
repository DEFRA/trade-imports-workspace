import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { run } from '../../exec/exec.js'
import { TimError } from '../../errors.js'
import { bestPracticeSections, detectedTechOf } from '../../ticket/repo-tech.js'
import { initFileReview } from '../file-review.js'
import { fileReviewPath, reviewDir } from '../paths.js'
import { writeJsonAtomic } from '../store.js'
import { hasVerdict } from './verdict.js'

const isDirectory = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const git = (repoDir, args) => run('git', ['-C', repoDir, ...args])

const linesOf = (text) => text.split('\n').filter((line) => line !== '')

const englishOrder = new Intl.Collator('en', { sensitivity: 'base' })

const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

const sortedUnique = (paths) =>
  [...new Set(paths)].sort(
    (left, right) =>
      englishOrder.compare(left, right) || byCodePoint(left, right)
  )

const refuseUnreviewable = async ({ repo, branch, repoDir }) => {
  if (!repo || !branch) {
    throw new TimError(
      'USAGE',
      'Usage: tim review prepare --local <repo> <branch> [--files F1,F2,...] [--json]'
    )
  }
  if (!isDirectory(join(repoDir, '.git'))) {
    throw new TimError('USAGE', `Not a git repo: ${repoDir}`)
  }
  const found = await git(repoDir, ['rev-parse', '--verify', '--quiet', branch])
  if (found.exitCode !== 0) {
    throw new TimError('NOT_FOUND', `Branch not found in ${repo}: ${branch}`)
  }
}

const mergeBaseOf = async ({ repo, branch, repoDir }) => {
  for (const main of ['origin/main', 'main']) {
    const found = await git(repoDir, ['merge-base', main, branch])
    if (found.exitCode === 0) return found.stdout
  }
  throw new TimError(
    'NOT_FOUND',
    `Can't find a merge-base with origin/main or main for ${branch} in ${repo}`
  )
}

const workingTreeChanges = async ({ repo, branch, repoDir, log }) => {
  const current = (await git(repoDir, ['rev-parse', '--abbrev-ref', 'HEAD']))
    .stdout
  if (current !== branch) {
    log(
      `Note: ${repo}'s checked-out branch is ${current}, not ${branch} — reviewing committed changes only (no working-tree diff).`
    )
    return []
  }
  const staged = await git(repoDir, ['diff', '--name-only', '--cached'])
  const unstaged = await git(repoDir, ['diff', '--name-only'])
  return [...linesOf(staged.stdout), ...linesOf(unstaged.stdout)]
}

const changedFilesFromGit = async ({ repo, branch, repoDir, log }) => {
  const mergeBase = await mergeBaseOf({ repo, branch, repoDir })
  const committed = await git(repoDir, [
    'diff',
    '--name-only',
    `${mergeBase}...${branch}`
  ])
  const working = await workingTreeChanges({ repo, branch, repoDir, log })
  return {
    mergeBase,
    files: sortedUnique([...linesOf(committed.stdout), ...working])
  }
}

const changedFiles = ({ repo, branch, repoDir, fileList, log }) =>
  fileList === undefined
    ? changedFilesFromGit({ repo, branch, repoDir, log })
    : {
        mergeBase: null,
        files: sortedUnique(fileList.split(',').filter((file) => file !== ''))
      }

const branchFile = ({ repo, branch, mergeBase }) =>
  [
    `# ${repo}:${branch} (local review)`,
    '',
    'No Jira ticket, no GitHub PR — this reviews the working branch directly.',
    '',
    '## Merge base with main',
    '',
    `\`${mergeBase ?? 'n/a — file list supplied by the caller'}\``,
    '',
    '## Acceptance criteria',
    '',
    '<!-- No ticket — define acceptance criteria manually, or skip if exploratory. -->',
    ''
  ].join('\n')

const bundleFile = ({ workspaceRoot, repo, tech }) =>
  `# Best practices applicable to ${repo}\n\nConcatenated from \`docs/best-practices/\` at prepare-review-local time.\nApply these standards when reviewing files in this repo.\n${bestPracticeSections({ workspaceRoot, bestPractices: tech.best_practices })}`

const seedPlaceholders = ({ context, files, head }) => {
  const { workspaceRoot, reviewId, folder, repo, log } = context
  const placeholderFiles = files.filter(
    (file) => !hasVerdict(fileReviewPath(folder, repo, file))
  )
  placeholderFiles.forEach((file) => {
    initFileReview({
      workspaceRoot,
      reviewId,
      repo,
      file,
      commit: head,
      mode: 'FRESH'
    })
    log(`  Created: ${repo}/${file}`)
  })
  return placeholderFiles.length
}

const touchStub = (path) => {
  if (!existsSync(path)) writeFileSync(path, '')
}

/**
 * Prepares a review of a branch of a workspace repo, with no ticket and no
 * pull request, under `workareas/reviews/local/<repo>/<branch>`: the
 * changed files are those committed since the merge-base with origin/main
 * (else main), plus staged and unstaged ones when the branch is checked
 * out, or exactly `fileList`. Writes `branch.md`, the best-practices
 * bundle, `.review-meta.json`, a placeholder for each changed file with no
 * verdict yet and the stubs. Progress goes to `log`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.repo] - A folder under `repos/`
 * @param {string} [args.branch]
 * @param {string} [args.fileList] - Comma-separated paths inside the repo
 * @param {string} args.now - The time to stamp as `created`
 * @param {(line: string) => void} args.log
 * @returns {Promise<{meta: object, folder: string, createdFiles: number}>}
 * @throws {TimError} USAGE without a repo and branch or when the repo is not a git repo; NOT_FOUND for an unknown branch or no merge-base
 */
export const prepareLocalReview = async ({
  workspaceRoot,
  repo,
  branch,
  fileList,
  now,
  log
}) => {
  const repoDir = join(workspaceRoot, 'repos', repo ?? '')
  await refuseUnreviewable({ repo, branch, repoDir })
  const reviewId = `local/${repo}/${branch}`
  const folder = reviewDir(workspaceRoot, reviewId)
  mkdirSync(join(folder, 'file-reviews', repo), { recursive: true })
  log(`Local review workspace: ${folder}`)

  const { mergeBase, files } = await changedFiles({
    repo,
    branch,
    repoDir,
    fileList,
    log
  })
  log(`Changed files (${files.length}):`)
  files.forEach((file) => log(`  ${file}`))

  writeFileSync(
    join(folder, 'branch.md'),
    branchFile({ repo, branch, mergeBase })
  )

  log('')
  log('Detecting technologies...')
  const tech = detectedTechOf({ workspaceRoot, repoDir })
  mkdirSync(join(folder, 'best-practices'), { recursive: true })
  writeFileSync(
    join(folder, 'best-practices', `${repo}.md`),
    bundleFile({ workspaceRoot, repo, tech })
  )

  const head = (await git(repoDir, ['rev-parse', branch])).stdout
  const meta = {
    id: reviewId,
    local: true,
    repo,
    branch,
    mergeBase,
    head,
    created: now,
    files,
    tech
  }
  writeJsonAtomic(join(folder, '.review-meta.json'), meta)

  const context = { workspaceRoot, reviewId, folder, repo, log }
  const createdFiles = seedPlaceholders({ context, files, head })
  touchStub(join(folder, `review.${repo}.md`))
  touchStub(join(folder, 'file-reviews', repo, '_consistency-check.md'))
  return { meta, folder, createdFiles }
}

/**
 * The summary `tim review prepare --local` prints once a review is ready.
 *
 * @param {Awaited<ReturnType<typeof prepareLocalReview>>} prepared
 * @returns {string}
 */
export const preparedLocalReviewText = ({ meta, folder, createdFiles }) =>
  [
    '',
    '=== Local Review Workspace Ready ===',
    `Repo: ${meta.repo}`,
    `Branch: ${meta.branch}`,
    `Directory: ${folder}`,
    '',
    'Created:',
    '  ✓ branch.md',
    '  ✓ .review-meta.json',
    `  ✓ best-practices/${meta.repo}.md`,
    `  ✓ file-reviews/ (${createdFiles} files)`,
    '',
    meta.files.length === 0
      ? 'Note: no changed files found — nothing to review.'
      : `Next: review each file, then run tim review verify files ${meta.id}`
  ].join('\n')
