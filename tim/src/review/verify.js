import { existsSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import { utcSeconds } from './aggregate.js'
import { encodeFilePath, reviewDir } from './paths.js'
import { readPrFiles } from './pr-facts.js'

const PERCENT = 100

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const isFile = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isFile() ?? false

const refuse = (message) => new TimError('NOT_FOUND', `Error: ${message}`)

const refuseMissingReviewId = (reviewId, check) => {
  if (!reviewId) {
    throw new TimError(
      'USAGE',
      `Usage: tim review verify ${check} <review-id> [--json]`
    )
  }
}

/**
 * How far a set of checks has got: the totals, the coverage text and
 * whether nothing is left to do.
 *
 * @param {object} args
 * @param {{status: string}[]} args.entries - Each `reviewed`, `pending` or `missing`
 * @param {number} args.coverageWhenEmpty - The percentage shown when there are no entries and something is pending
 * @returns {{total: number, reviewed: number, pending: number, coverage: string, complete: boolean}}
 */
const progressOf = ({ entries, coverageWhenEmpty }) => {
  const total = entries.length
  const reviewed = entries.filter(({ status }) => status === 'reviewed').length
  const pending = total - reviewed
  const percentage =
    total > 0 ? Math.floor((reviewed * PERCENT) / total) : coverageWhenEmpty
  return {
    total,
    reviewed,
    pending,
    coverage: pending === 0 ? '100%' : `${percentage}%`,
    complete: pending === 0
  }
}

const hasVerdict = (path) => {
  try {
    const verdict = readJsonFile(path).verdict
    return verdict !== null && verdict !== undefined
  } catch {
    return false
  }
}

const verdictStatusOf = (path) => {
  if (!existsSync(path)) return 'missing'
  return hasVerdict(path) ? 'reviewed' : 'pending'
}

const checklistMarkdown = ({
  title,
  reviewId,
  verifiedAt,
  totals,
  progress,
  checklist,
  result
}) =>
  [
    `# ${title}`,
    '',
    `**Ticket:** ${reviewId}`,
    `**Last Verified:** ${verifiedAt}`,
    ...totals,
    `**Coverage:** ${progress.coverage}`,
    '',
    `## ${checklist.heading}`,
    '',
    ...checklist.rows,
    '',
    '## Verification Result',
    '',
    ...result,
    ''
  ].join('\n')

const resultLines = ({
  progress,
  confirmed,
  incomplete,
  pendingHeading,
  pendingLines
}) =>
  progress.complete
    ? [`- [x] **CONFIRMED: ${confirmed}**`]
    : [
        `- [ ] **INCOMPLETE: ${progress.pending} ${incomplete}**`,
        '',
        `### ${pendingHeading}`,
        '',
        ...pendingLines
      ]

const FILE_STATUS_LABELS = {
  reviewed: '✅ Reviewed',
  pending: '⏳ Pending',
  missing: '❌ Missing'
}

const fileChecklistRows = ([header, separator], entries) => [
  header,
  separator,
  ...entries.map(
    ({ repo, path, status }, index) =>
      `| ${index + 1} | ${repo} | \`${path}\` | ${FILE_STATUS_LABELS[status]} |`
  )
]

const pendingFiles = (entries) =>
  entries.filter(({ status }) => status !== 'reviewed')

const readMeta = (metaPath, missingMessage) => {
  if (!existsSync(metaPath)) throw refuse(missingMessage)
  return readJsonFile(metaPath)
}

const uniqueRepos = (prs) => [...new Set(prs.map(({ repo }) => repo))]

const consistencyStatusOf = (stubPath) => {
  if (!isFile(stubPath)) return 'missing'
  return statSync(stubPath).size > 0 ? 'reviewed' : 'pending'
}

const CONSISTENCY_STATUS_LABELS = {
  reviewed: '✅ Complete',
  pending: '⏳ Pending',
  missing: '❌ Missing'
}

const DEFAULT_THEMES = ['code']

const openPrReview = (workspaceRoot, reviewId) => {
  const folder = reviewDir(workspaceRoot, reviewId)
  if (!isFolder(folder)) {
    throw refuse('Review directory not found. Run tim review prepare first.')
  }
  const meta = readMeta(
    join(folder, '.review-meta.json'),
    'Meta file not found. Run tim review prepare first.'
  )
  return { folder, meta, fileReviewsFolder: join(folder, 'file-reviews') }
}

/**
 * Checks each repo of a review has a consistency check that is not empty,
 * and writes the checklist to file-reviews/_CONSISTENCY_VERIFICATION.md.
 * A review whose themes leave out `consistency` is skipped, and nothing is
 * written.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {() => Date} [args.now]
 * @returns {object} The progress, or `{ticket, skipped: true, reason, themes}`
 * @throws {TimError} USAGE with no review id; NOT_FOUND when the review, its meta file or its file-reviews folder is missing
 */
export const verifyConsistency = ({
  workspaceRoot,
  reviewId,
  now = () => new Date()
}) => {
  refuseMissingReviewId(reviewId, 'consistency')
  const { meta, fileReviewsFolder } = openPrReview(workspaceRoot, reviewId)
  if (!isFolder(fileReviewsFolder)) {
    throw refuse(
      'File reviews directory not found. Run tim review prepare first.'
    )
  }
  const themes = (meta.themes ?? DEFAULT_THEMES).join(',')
  if (!themes.includes('consistency')) {
    return {
      ticket: reviewId,
      skipped: true,
      reason: 'consistency theme not enabled for this review',
      themes
    }
  }
  const entries = uniqueRepos(meta.prs ?? []).map((repo) => ({
    repo,
    status: consistencyStatusOf(
      join(fileReviewsFolder, repo, '_consistency-check.md')
    )
  }))
  const progress = progressOf({ entries, coverageWhenEmpty: PERCENT })
  const pendingRepos = pendingFiles(entries).map(({ repo }) => repo)
  const verificationPath = join(
    fileReviewsFolder,
    '_CONSISTENCY_VERIFICATION.md'
  )
  writeFileSync(
    verificationPath,
    checklistMarkdown({
      title: 'Consistency Review Coverage Verification',
      reviewId,
      verifiedAt: utcSeconds(now()),
      totals: [
        `**Total repos:** ${progress.total}`,
        `**Consistency checks completed:** ${progress.reviewed}`
      ],
      progress,
      checklist: {
        heading: 'Repo Checklist',
        rows: [
          '| # | Repository | Status |',
          '|---|------------|--------|',
          ...entries.map(
            ({ repo, status }, index) =>
              `| ${index + 1} | ${repo} | ${CONSISTENCY_STATUS_LABELS[status]} |`
          )
        ]
      },
      result: resultLines({
        progress,
        confirmed: 'All consistency checks complete',
        incomplete: 'repo(s) pending consistency review',
        pendingHeading: 'Pending',
        pendingLines: pendingRepos.map(
          (repo) =>
            `- \`${repo}\` → \`file-reviews/${repo}/_consistency-check.md\``
        )
      })
    })
  )
  return {
    ticket: reviewId,
    ...progress,
    pending_repos: pendingRepos,
    verificationPath
  }
}

const progressReport = ({ heading, unit, progress, ticket }) => [
  '',
  `=== ${heading} ===`,
  `Ticket: ${ticket}`,
  `Coverage: ${progress.reviewed} / ${progress.total} ${unit} (${progress.coverage})`,
  ''
]

/**
 * @param {ReturnType<typeof verifyConsistency>} verified
 * @returns {string}
 */
export const renderConsistencyText = (verified) => {
  if (verified.skipped) {
    return [
      `Consistency theme not enabled for ${verified.ticket} (themes: ${verified.themes})`,
      'Re-run tim review prepare to add consistency stubs.'
    ].join('\n')
  }
  return [
    ...progressReport({
      heading: 'Consistency Coverage Verification',
      unit: 'repos',
      progress: verified,
      ticket: verified.ticket
    }),
    ...(verified.complete
      ? ['✅ All consistency checks complete']
      : [
          `⏳ Pending ${verified.pending} consistency check(s):`,
          ...verified.pending_repos.map((repo) => `  - ${repo}`)
        ]),
    '',
    `Updated: ${verified.verificationPath}`,
    ...(verified.complete
      ? ['', 'Ready to write repo summaries and review.md.']
      : [])
  ].join('\n')
}

const fileProgressResult = ({
  reviewId,
  entries,
  coverageWhenEmpty,
  verificationPath
}) => {
  const progress = progressOf({ entries, coverageWhenEmpty })
  return {
    ticket: reviewId,
    ...progress,
    pending_files: pendingFiles(entries).map(
      ({ repo, path }) => `${repo}|${path}`
    ),
    verificationPath
  }
}

const fileVerificationMarkdown = ({
  title,
  reviewId,
  now,
  totalLabel,
  reviewedLabel,
  checklistHeading,
  checklistHeader,
  confirmed,
  incomplete,
  entries,
  verified
}) =>
  checklistMarkdown({
    title,
    reviewId,
    verifiedAt: utcSeconds(now()),
    totals: [
      `**${totalLabel}:** ${verified.total}`,
      `**${reviewedLabel}:** ${verified.reviewed}`
    ],
    progress: verified,
    checklist: {
      heading: checklistHeading,
      rows: fileChecklistRows(checklistHeader, entries)
    },
    result: resultLines({
      progress: verified,
      confirmed,
      incomplete,
      pendingHeading: 'Pending Reviews',
      pendingLines: pendingFiles(entries).map(
        ({ repo, path }) => `- \`${repo}/${path}\``
      )
    })
  })

/**
 * Checks each source file a code style review lists in .style-meta.json
 * has a .style.json with a verdict, and writes the checklist to
 * file-reviews/_STYLE_VERIFICATION.md.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {() => Date} [args.now]
 * @returns {object} The progress, with each pending file as `repo|path`
 * @throws {TimError} USAGE with no review id; NOT_FOUND when the style review, its meta file or its file-reviews folder is missing
 */
export const verifyStyleCoverage = ({
  workspaceRoot,
  reviewId,
  now = () => new Date()
}) => {
  refuseMissingReviewId(reviewId, 'style')
  const folder = join(
    workspaceRoot,
    'workareas',
    'code-style-reviews',
    reviewId
  )
  if (!isFolder(folder)) {
    throw refuse(
      `Code style review directory not found: ${folder}. Run CODE_STYLE_REVIEWER step 1-3 first.`
    )
  }
  const meta = readMeta(
    join(folder, '.style-meta.json'),
    '.style-meta.json not found. Run CODE_STYLE_REVIEWER step 3 first.'
  )
  const fileReviewsFolder = join(folder, 'file-reviews')
  if (!isFolder(fileReviewsFolder)) {
    throw refuse('file-reviews directory not found.')
  }
  const entries = (meta.source_files ?? []).map(({ repo, path }) => ({
    repo,
    path,
    status: verdictStatusOf(
      join(fileReviewsFolder, repo, `${encodeFilePath(path)}.style.json`)
    )
  }))
  const verificationPath = join(fileReviewsFolder, '_STYLE_VERIFICATION.md')
  const verified = fileProgressResult({
    reviewId,
    entries,
    coverageWhenEmpty: PERCENT,
    verificationPath
  })
  writeFileSync(
    verificationPath,
    fileVerificationMarkdown({
      title: 'Code Style Review Coverage Verification',
      reviewId,
      now,
      totalLabel: 'Total source files changed',
      reviewedLabel: 'Files reviewed',
      checklistHeading: 'Source Files Checklist',
      checklistHeader: [
        '| # | Repository | File | Status |',
        '|---|------------|------|--------|'
      ],
      confirmed: 'All source files have been style-reviewed',
      incomplete: 'file(s) pending style review',
      entries,
      verified
    })
  )
  return verified
}

const changedFileEntries = ({ folder, fileReviewsFolder, prs }) =>
  prs.flatMap(({ repo, pr }) =>
    readPrFiles({ reviewFolder: folder, repo, pr }).map((path) => ({
      repo,
      path,
      status: verdictStatusOf(
        join(fileReviewsFolder, repo, `${encodeFilePath(path)}.review.json`)
      )
    }))
  )

/**
 * Checks each file a review's pull requests change, as the facts files
 * under .prs/ list them, has a .review.json with a verdict, and writes the
 * checklist to file-reviews/_VERIFICATION.md. A review with no pull
 * requests, such as a local one, has nothing to check.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {() => Date} [args.now]
 * @returns {object} The progress, with each pending file as `repo|path`
 * @throws {TimError} USAGE with no review id; NOT_FOUND when the review, its meta file, its file-reviews folder or a pull request's facts file is missing
 */
export const verifyFileCoverage = ({
  workspaceRoot,
  reviewId,
  now = () => new Date()
}) => {
  refuseMissingReviewId(reviewId, 'files')
  const { folder, meta, fileReviewsFolder } = openPrReview(
    workspaceRoot,
    reviewId
  )
  if (!isFolder(fileReviewsFolder)) {
    throw refuse(
      'File reviews directory not found. Run init-file-reviews.sh first.'
    )
  }
  const entries = changedFileEntries({
    folder,
    fileReviewsFolder,
    prs: meta.prs ?? []
  })
  const verificationPath = join(fileReviewsFolder, '_VERIFICATION.md')
  const verified = fileProgressResult({
    reviewId,
    entries,
    coverageWhenEmpty: 0,
    verificationPath
  })
  writeFileSync(
    verificationPath,
    fileVerificationMarkdown({
      title: 'File Review Coverage Verification',
      reviewId,
      now,
      totalLabel: 'Total files changed',
      reviewedLabel: 'Files reviewed',
      checklistHeading: 'Changed Files Checklist',
      checklistHeader: [
        '| # | Repository | Changed File | Status |',
        '|---|------------|--------------|--------|'
      ],
      confirmed: 'All files have been reviewed',
      incomplete: 'file(s) pending review',
      entries,
      verified
    })
  )
  return verified
}

const fileCoverageText =
  ({ heading, done, pendingLabel, ready }) =>
  (verified) =>
    [
      ...progressReport({
        heading,
        unit: 'files',
        progress: verified,
        ticket: verified.ticket
      }),
      ...(verified.complete
        ? [`✅ ${done}`]
        : [
            `⏳ Pending ${verified.pending} ${pendingLabel}:`,
            ...verified.pending_files.map(
              (entry) => `  - ${entry.replace('|', '/')}`
            )
          ]),
      '',
      `Updated: ${verified.verificationPath}`,
      ...(verified.complete ? ['', ready] : [])
    ].join('\n')

export const renderStyleCoverageText = fileCoverageText({
  heading: 'Style Coverage Verification',
  done: 'All source files style-reviewed',
  pendingLabel: 'style review(s)',
  ready: 'Ready to write per-repo summaries and code-style-review.md.'
})

export const renderFileCoverageText = fileCoverageText({
  heading: 'Coverage Verification',
  done: 'All files reviewed',
  pendingLabel: 'review(s)',
  ready: 'Ready to write review-index.md and review.{repo}.md summaries.'
})

/**
 * The progress as the --json result, without the checklist path.
 *
 * @param {object} verified
 * @returns {object}
 */
export const verifiedJson = ({ verificationPath, themes, ...verified }) =>
  verified
