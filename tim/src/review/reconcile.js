import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'
import {
  fileReviewPathsIn,
  hasBeenReviewed,
  stampReconciled,
  utcSeconds
} from './aggregate.js'
import { textOf } from './items-table.js'
import { addReviewItem } from './items-ledger.js'
import { itemsFilePath, reviewDir } from './paths.js'

const DRY_RUN_ID = '(dry-run)'

const usage = (message) => new TimError('USAGE', message)

const shownAsShell = (value) => textOf(value).replace(/\n+$/, '')

const timestampOf = (value) =>
  value === null || value === undefined || value === false ? '' : textOf(value)

const needsReconciling = (review, { force }) => {
  const reconciledAt = timestampOf(review.reconciled_at)
  return (
    force ||
    reconciledAt === '' ||
    timestampOf(review.reviewed_at) > reconciledAt
  )
}

const partitionReviews = (paths, { force }) =>
  paths.reduce(
    (groups, path) => {
      const review = readJsonFile(path)
      if (!hasBeenReviewed(review)) {
        return { ...groups, unreviewed: [...groups.unreviewed, path] }
      }
      return needsReconciling(review, { force })
        ? { ...groups, toProcess: [...groups.toProcess, { path, review }] }
        : { ...groups, alreadyDone: [...groups.alreadyDone, path] }
    },
    { toProcess: [], alreadyDone: [], unreviewed: [] }
  )

const findingOf = (filePath, todo) => {
  const bestPractice = todo.best_practice
  return {
    file: filePath,
    line: shownAsShell(todo.line),
    severity: shownAsShell(todo.severity),
    category: shownAsShell(todo.category),
    issue: shownAsShell(todo.issue),
    fix: shownAsShell(todo.fix),
    bestPractice:
      bestPractice === null ||
      bestPractice === undefined ||
      bestPractice === false
        ? ''
        : shownAsShell(bestPractice)
  }
}

const descriptionOf = ({ file, line, severity, issue }) =>
  `${file}:${line} [${severity}] ${issue}`

const isFixedIn = (refreshedFiles) => (item) =>
  item.disposition === 'Fix' &&
  item.status === 'Done' &&
  refreshedFiles.includes(item.file)

const spotCheckOf = (itemsPath, refreshedFiles) =>
  readJsonFile(itemsPath)
    .items.filter(isFixedIn(refreshedFiles))
    .map(({ id, file, line, issue, notes }) => ({
      id: id ?? null,
      file: file ?? null,
      line: line ?? null,
      issue: issue ?? null,
      notes: notes ?? null
    }))

const existingPaths = ({ fileReviewsFolder, itemsPath }) => {
  if (!statSync(fileReviewsFolder, { throwIfNoEntry: false })?.isDirectory()) {
    throw new TimError('NOT_FOUND', `No file-reviews dir: ${fileReviewsFolder}`)
  }
  if (!existsSync(itemsPath)) {
    throw new TimError(
      'NOT_FOUND',
      `No items file: ${itemsPath} (run tim review aggregate --write-items first)`
    )
  }
  const paths = fileReviewPathsIn(fileReviewsFolder)
  if (paths.length === 0) {
    throw new TimError(
      'NOT_FOUND',
      `No .review.json files in ${fileReviewsFolder}`
    )
  }
  return paths
}

/**
 * Folds a refresh's findings into a repo's items.<repo>.json. Each file
 * review a reviewer ran since it was last reconciled (or every reviewed
 * one, with `force`) has each finding appended as a new item, then gets
 * `reconciled_at`. A dry run changes nothing. The spot-check lists the
 * items already fixed and done in the files refreshed.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.reviewId]
 * @param {string} [args.repo]
 * @param {boolean} [args.dryRun]
 * @param {boolean} [args.force]
 * @param {() => Date} [args.now]
 * @returns {{reviewId: string, repo: string, dryRun: boolean, refreshed: number, added_count: number, added: string[], added_ids: string[], skipped_already_reconciled: number, skipped_unreviewed: number, spot_check: object[]}}
 * @throws {TimError} USAGE with no review id or repo, or a finding the items file refuses; NOT_FOUND when the repo has no file reviews or no items file
 */
export const reconcileFileReviews = ({
  workspaceRoot,
  reviewId,
  repo,
  dryRun = false,
  force = false,
  now = () => new Date()
}) => {
  if (!reviewId) throw usage('Missing ticket')
  if (!repo) throw usage('Missing --repo')
  const folder = reviewDir(workspaceRoot, reviewId)
  const fileReviewsFolder = join(folder, 'file-reviews', repo)
  const itemsPath = itemsFilePath(folder, repo)
  const paths = existingPaths({ fileReviewsFolder, itemsPath })
  const { toProcess, alreadyDone, unreviewed } = partitionReviews(paths, {
    force
  })
  const added = []
  for (const { path, review } of toProcess) {
    for (const todo of review.todos ?? []) {
      const finding = findingOf(shownAsShell(review.file), todo)
      const id = dryRun
        ? DRY_RUN_ID
        : String(
            addReviewItem({ workspaceRoot, reviewId, repo, ...finding }).id
          )
      added.push({ id, description: descriptionOf(finding) })
    }
    if (!dryRun) stampReconciled(path, utcSeconds(now()))
  }
  const refreshedFiles = toProcess.map(({ review }) =>
    shownAsShell(review.file)
  )
  return {
    reviewId,
    repo,
    dryRun,
    refreshed: toProcess.length,
    added_count: added.length,
    added: added.map(({ description }) => description),
    added_ids: added.map(({ id }) => id),
    skipped_already_reconciled: alreadyDone.length,
    skipped_unreviewed: unreviewed.length,
    spot_check:
      refreshedFiles.length === 0 ? [] : spotCheckOf(itemsPath, refreshedFiles)
  }
}

/**
 * The reconcile result as --json gives it.
 *
 * @param {ReturnType<typeof reconcileFileReviews>} reconciled
 * @returns {object}
 */
export const reconciledJson = ({
  reviewId,
  repo,
  dryRun,
  refreshed,
  ...summary
}) => summary

const spotCheckLine = ({ id, file, line, issue, notes }) => {
  const fixedAt =
    notes === null || notes === false ? '' : ` (fixed at ${textOf(notes)})`
  return `  #${textOf(id)} ${textOf(file)}:${textOf(line)} — ${textOf(issue)}${fixedAt}`
}

/**
 * @param {ReturnType<typeof reconcileFileReviews>} reconciled
 * @returns {string}
 */
export const renderReconciledText = (reconciled) => {
  const lines = [
    `Reconcile ${reconciled.reviewId} / ${reconciled.repo}`,
    '',
    `  Refreshed files:           ${reconciled.refreshed}`,
    `  Already reconciled (skip): ${reconciled.skipped_already_reconciled}`,
    `  Unreviewed placeholders:   ${reconciled.skipped_unreviewed}`,
    `  New items added:           ${reconciled.added_count}`,
    ...(reconciled.dryRun ? ['  (dry-run — no mutations)'] : []),
    ''
  ]
  const addedLines =
    reconciled.added_count === 0
      ? []
      : [
          'Added:',
          ...reconciled.added.map(
            (description, index) =>
              `  #${reconciled.added_ids[index]} — ${description}`
          ),
          ''
        ]
  const spotCheckLines =
    reconciled.spot_check.length === 0
      ? []
      : [
          'Spot-check (Fix+Done items in refreshed files — verify they have not regressed):',
          ...reconciled.spot_check.map(spotCheckLine)
        ]
  return [...lines, ...addedLines, ...spotCheckLines].join('\n')
}
