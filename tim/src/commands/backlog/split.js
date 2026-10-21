import { z } from 'zod'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadBacklogSchema } from '../../backlog/backlog-schema.js'
import { readJsonFile, writeJsonAtomic } from '../../backlog/io.js'
import { checkBacklog } from '../../backlog/shape.js'
import {
  defaultMovedBranch,
  indexWithMovedRows,
  planMoveRows
} from '../../backlog/move-rows.js'
import {
  indexWithRowsMovedBack,
  planMoveRowsBack
} from '../../backlog/move-rows-back.js'
import { splitOffOf } from '../../backlog/split-off.js'
import {
  THEMES_FOLDER,
  THEMES_INDEX,
  defaultBranchPrefix,
  planRelink,
  planSplit,
  planSplitOff,
  themeWorkareaOf
} from '../../backlog/split.js'
import {
  normaliseWorkarea,
  workareaBacklogReader,
  workareaDirFor
} from '../../backlog/workarea.js'
import {
  distilLayout,
  readJsonLenient,
  requirementFingerprintOf
} from '../../distil/files.js'
import { TimError } from '../../errors.js'
import { makeBacklogAction, parseOptions } from './shared.js'
import { backlogPathFor } from './rows.js'

const themeIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    '--theme must be a theme id: lower-case words joined by hyphens, such as origin-pages.'
  )

const BRANCH_NAME = /^[A-Za-z0-9][A-Za-z0-9._/-]*[A-Za-z0-9]$/

const rowIdSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    '--rows must be row ids separated by commas, such as inc-210,inc-212.'
  )

const splitOptsSchema = z.object({
  write: z.boolean().optional().default(false),
  relink: z.boolean().optional().default(false),
  theme: z.array(themeIdSchema).optional().default([]),
  branchPrefix: z
    .string()
    .trim()
    .regex(
      BRANCH_NAME,
      '--branch-prefix must be a branch name with no spaces, such as feat/EUDPA-123-plants.'
    )
    .optional(),
  rows: z.array(rowIdSchema).optional().default([]),
  to: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      '--to must be a theme id: lower-case words joined by hyphens, such as origin-pages-b.'
    )
    .optional(),
  branch: z
    .string()
    .trim()
    .regex(
      BRANCH_NAME,
      '--branch must be a branch name with no spaces, such as feat/EUDPA-123-origin-pages-b.'
    )
    .optional(),
  title: z.string().trim().min(1, '--title needs some text.').optional(),
  backFrom: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      '--back-from must be a theme id: lower-case words joined by hyphens, such as origin-pages-b.'
    )
    .optional()
})

const refuseMixedBackFrom = (parsed) => {
  if (!parsed.rows.length) {
    throw new TimError(
      'USAGE',
      'Give --rows with --back-from: the rows to move back from that theme.'
    )
  }
  const others = [
    ['--to', parsed.to !== undefined],
    ['--branch', parsed.branch !== undefined],
    ['--title', parsed.title !== undefined],
    ['--theme', parsed.theme.length > 0],
    ['--relink', parsed.relink],
    ['--branch-prefix', parsed.branchPrefix !== undefined]
  ]
    .filter(([, given]) => given)
    .map(([flag]) => flag)
  if (others.length) {
    throw new TimError(
      'USAGE',
      `Give --rows and --back-from without ${others.join(' or ')}. The rows go back to the backlog you name, on its own branch.`
    )
  }
}

const refuseMixedModes = (parsed) => {
  if (parsed.backFrom !== undefined) {
    refuseMixedBackFrom(parsed)
    return
  }
  const moving = parsed.rows.length > 0 || parsed.to !== undefined
  if (parsed.relink && parsed.theme.length) {
    throw new TimError(
      'USAGE',
      'Give --relink on its own. Splitting a theme off with --theme already relinks the themes split off before it.'
    )
  }
  if (!moving && (parsed.branch !== undefined || parsed.title !== undefined)) {
    throw new TimError(
      'USAGE',
      '--branch and --title go with --rows and --to. To name theme branches, give --branch-prefix.'
    )
  }
  if (!moving) return
  if (!parsed.rows.length || parsed.to === undefined) {
    throw new TimError(
      'USAGE',
      'Give --rows and --to together: the rows to move, and the theme id of the backlog they move to. To move rows back, give --rows and --back-from.'
    )
  }
  if (parsed.relink || parsed.theme.length || parsed.branchPrefix) {
    throw new TimError(
      'USAGE',
      'Give --rows and --to without --theme, --relink or --branch-prefix. Name the new branch with --branch.'
    )
  }
}

const splitRowIds = (values) =>
  (values ?? []).flatMap((value) =>
    String(value)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  )

/**
 * Validate `tim backlog split`'s options before the backlog is read.
 *
 * @param {object} opts
 * @returns {{write: boolean, relink: boolean, theme: string[], branchPrefix: string|undefined, rows: string[], to: string|undefined, branch: string|undefined, title: string|undefined, backFrom: string|undefined}}
 * @throws {TimError} USAGE
 */
export const parseSplitOpts = (opts) => {
  const parsed = parseOptions(splitOptsSchema, {
    write: opts.write,
    relink: opts.relink,
    theme: opts.theme,
    branchPrefix: opts.branchPrefix,
    rows: splitRowIds(opts.rows),
    to: opts.to,
    branch: opts.branch,
    title: opts.title,
    backFrom: opts.backFrom
  })
  refuseMixedModes(parsed)
  return {
    ...parsed,
    theme: [...new Set(parsed.theme)],
    rows: [...new Set(parsed.rows)]
  }
}

const bodyOf = (value) => `${JSON.stringify(value, null, 2)}\n`

const differsOnDisk = (path, value) =>
  !existsSync(path) || readFileSync(path, 'utf8') !== bodyOf(value)

const refuse = (problems, what) =>
  new TimError(
    'LINT',
    `${problems.length} problems ${what}, so nothing was split:\n${problems.join('\n')}`
  )

const requireThemedParent = (backlog, workarea) => {
  if (typeof backlog.theme === 'string') {
    throw new TimError(
      'USAGE',
      `${workarea} is theme "${backlog.theme}"'s split. Split its parent, ${backlog.parent?.workarea ?? 'the workarea it came from'}, instead.`
    )
  }
  if (!Array.isArray(backlog.themes)) {
    throw new TimError(
      'USAGE',
      `The backlog in ${workarea} has no "themes", so there is nothing to split. Give its sources.json a "themes" rule and distil again.`
    )
  }
}

const readIndex = (path) => (existsSync(path) ? readJsonFile(path) : null)

const themesIndexPathOf = (workspaceRoot, parentWorkarea) =>
  join(
    workareaDirFor(workspaceRoot, parentWorkarea),
    THEMES_FOLDER,
    THEMES_INDEX
  )

const splitProblems = ({ splits, schema, readWorkareaBacklog }) =>
  splits.flatMap((split) =>
    checkBacklog(split.backlog, schema, { readWorkareaBacklog }).problems.map(
      (problem) => `${split.workarea}: ${problem}`
    )
  )

const overlayReader = ({ splits, workarea, backlog, readFromDisk }) => {
  const planned = new Map(
    splits.map((split) => [split.workarea, split.backlog])
  )
  planned.set(workarea, backlog)
  return (other) => planned.get(other) ?? readFromDisk(other)
}

const fingerprintsIn = (workspaceRoot, workarea) => {
  const read = readJsonLenient(
    distilLayout(workareaDirFor(workspaceRoot, workarea)).requirements
  )
  if (!read.exists || read.error) return null
  const requirements = Array.isArray(read.value?.requirements)
    ? read.value.requirements
    : []
  return Object.fromEntries(
    requirements
      .filter((requirement) => typeof requirement?.id === 'string')
      .map((requirement) => [
        requirement.id,
        requirementFingerprintOf(requirement)
      ])
  )
}

const plannedFiles = (files, write) => {
  const checked = files.map((file) => ({
    ...file,
    changed: differsOnDisk(file.path, file.value)
  }))
  if (write) {
    checked
      .filter((file) => file.changed)
      .forEach((file) => writeJsonAtomic(file.path, file.value))
  }
  return new Set(
    checked.filter((file) => file.changed).map((file) => file.path)
  )
}

const runSplitOff = ({
  workspaceRoot,
  workarea,
  path,
  indexPath,
  schema,
  backlog,
  readFromDisk,
  options,
  now
}) => {
  const plan = planSplitOff({
    backlog,
    workarea,
    themeIds: options.theme,
    branchPrefix:
      options.branchPrefix ?? defaultBranchPrefix(backlog, workarea),
    readWorkareaBacklog: readFromDisk,
    previousIndex: readIndex(indexPath),
    fingerprints: fingerprintsIn(workspaceRoot, workarea),
    at: now().toISOString()
  })
  if (plan.problems.length) {
    throw refuse(plan.problems, 'with the split already on disk')
  }
  const everySplit = [...plan.splits, ...plan.relinkedSplits]
  const reader = overlayReader({
    splits: everySplit,
    workarea,
    backlog: plan.backlog,
    readFromDisk
  })
  const leftProblems = checkBacklog(plan.backlog, schema, {
    readWorkareaBacklog: reader
  }).problems
  if (leftProblems.length) {
    throw refuse(leftProblems, `in the backlog ${path} would keep`)
  }
  const problems = splitProblems({
    splits: everySplit,
    schema,
    readWorkareaBacklog: reader
  })
  if (problems.length) throw refuse(problems, 'in the split backlogs')

  const splitPathOf = (split) => backlogPathFor(workspaceRoot, split.workarea)
  const changedPaths = plannedFiles(
    [
      { path, value: plan.backlog },
      ...everySplit.map((split) => ({
        path: splitPathOf(split),
        value: split.backlog
      })),
      { path: indexPath, value: plan.index }
    ],
    options.write
  )
  return {
    path,
    written: options.write,
    changed: changedPaths.has(path),
    index: { path: indexPath, changed: changedPaths.has(indexPath) },
    splitOff: plan.splits.map((split, position) => ({
      ...plan.pointers[position],
      path: splitPathOf(split),
      wave: split.backlog.parent.wave,
      kept: split.kept,
      removed: split.removed,
      changed: changedPaths.has(splitPathOf(split))
    })),
    relinked: relinkedFilesOf(plan.relinkedSplits, splitPathOf, changedPaths),
    rewired: plan.rewired,
    landingOrder: plan.index.landingOrder
  }
}

const relinkedFilesOf = (relinks, pathOf, changedPaths) =>
  relinks.map((relink) => ({
    workarea: relink.workarea,
    path: pathOf(relink),
    rows: relink.relinked,
    changed: changedPaths.has(pathOf(relink))
  }))

const runRelink = ({
  workspaceRoot,
  workarea,
  path,
  schema,
  backlog,
  readFromDisk,
  options
}) => {
  const relinks = planRelink({
    backlog,
    workarea,
    readWorkareaBacklog: readFromDisk
  })
  const reader = overlayReader({
    splits: relinks,
    workarea,
    backlog,
    readFromDisk
  })
  const problems = [
    ...checkBacklog(backlog, schema, { readWorkareaBacklog: reader }).problems,
    ...splitProblems({ splits: relinks, schema, readWorkareaBacklog: reader })
  ]
  if (problems.length) throw refuse(problems, 'after relinking')
  const pathOf = (relink) => backlogPathFor(workspaceRoot, relink.workarea)
  const changedPaths = plannedFiles(
    relinks.map((relink) => ({ path: pathOf(relink), value: relink.backlog })),
    options.write
  )
  return {
    path,
    written: options.write,
    relinked: relinkedFilesOf(relinks, pathOf, changedPaths)
  }
}

const requireSplitBacklog = (backlog, workarea) => {
  if (typeof backlog.theme === 'string') return
  throw new TimError(
    'USAGE',
    `--rows moves rows out of a theme's split backlog, and ${workarea} is not one. To split a whole theme off a themed backlog, give --theme.`
  )
}

const textsIn = (list) =>
  Array.isArray(list)
    ? list.filter((value) => typeof value === 'string' && value.trim())
    : []

const programmeWorkareas = (parentWorkarea, parentBacklog, index) => [
  parentWorkarea,
  ...textsIn((index?.themes ?? []).map((entry) => entry?.workarea)),
  ...splitOffOf(parentBacklog).map((pointer) => pointer.workarea),
  ...(Array.isArray(parentBacklog?.themes)
    ? parentBacklog.themes
        .filter((theme) => typeof theme?.id === 'string')
        .map((theme) => themeWorkareaOf(parentWorkarea, theme.id))
    : [])
]

const defaultMovedTitle = (backlog, branch) =>
  `Rows moved out of theme "${backlog.theme}" to build on ${branch}`

const runMoveRows = ({
  workspaceRoot,
  workarea,
  path,
  schema,
  backlog,
  readFromDisk,
  options,
  now
}) => {
  requireSplitBacklog(backlog, workarea)
  const sourceProblems = checkBacklog(backlog, schema, {
    readWorkareaBacklog: readFromDisk
  }).problems
  if (sourceProblems.length) throw refuse(sourceProblems, `in ${path}`)

  const parentWorkarea = backlog.parent.workarea
  const indexPath = themesIndexPathOf(workspaceRoot, parentWorkarea)
  const index = readIndex(indexPath)
  const branch = options.branch ?? defaultMovedBranch(backlog, options.to)
  const plan = planMoveRows({
    backlog,
    workarea,
    rowIds: options.rows,
    toTheme: options.to,
    branch,
    readWorkareaBacklog: readFromDisk,
    otherWorkareas: programmeWorkareas(
      parentWorkarea,
      readFromDisk(parentWorkarea),
      index
    ),
    at: now().toISOString()
  })
  const planned = new Map([
    [workarea, plan.backlog],
    [plan.workarea, plan.newBacklog],
    ...plan.relinks.map((relink) => [relink.workarea, relink.backlog])
  ])
  const reader = (other) => planned.get(other) ?? readFromDisk(other)
  const problems = [...planned].flatMap(([plannedWorkarea, plannedBacklog]) =>
    checkBacklog(plannedBacklog, schema, {
      readWorkareaBacklog: reader
    }).problems.map((problem) => `${plannedWorkarea}: ${problem}`)
  )
  if (problems.length) throw refuse(problems, 'after the move')

  const newPath = backlogPathFor(workspaceRoot, plan.workarea)
  const relinkPathOf = (relink) =>
    backlogPathFor(workspaceRoot, relink.workarea)
  const newIndex = index
    ? indexWithMovedRows({
        index,
        fromTheme: backlog.theme,
        fromWorkarea: workarea,
        rowsLeft: plan.backlog.increments.length,
        newBacklog: plan.newBacklog,
        title: options.title ?? defaultMovedTitle(backlog, branch)
      })
    : null
  const changedPaths = plannedFiles(
    [
      { path, value: plan.backlog },
      { path: newPath, value: plan.newBacklog },
      ...plan.relinks.map((relink) => ({
        path: relinkPathOf(relink),
        value: relink.backlog
      })),
      ...(newIndex ? [{ path: indexPath, value: newIndex }] : [])
    ],
    options.write
  )
  return {
    path,
    written: options.write,
    changed: changedPaths.has(path),
    movedTo: {
      theme: options.to,
      workarea: plan.workarea,
      path: newPath,
      branch,
      rows: plan.pointer.increments,
      changed: changedPaths.has(newPath)
    },
    index: newIndex
      ? { path: indexPath, changed: changedPaths.has(indexPath) }
      : null,
    moveRewired: plan.rewired,
    relinked: relinkedFilesOf(plan.relinks, relinkPathOf, changedPaths)
  }
}

const runMoveRowsBack = ({
  workspaceRoot,
  workarea,
  path,
  schema,
  backlog,
  readFromDisk,
  options,
  now
}) => {
  requireSplitBacklog(backlog, workarea)
  const parentWorkarea = backlog.parent.workarea
  const indexPath = themesIndexPathOf(workspaceRoot, parentWorkarea)
  const index = readIndex(indexPath)
  const plan = planMoveRowsBack({
    backlog,
    workarea,
    rowIds: options.rows,
    fromTheme: options.backFrom,
    readWorkareaBacklog: readFromDisk,
    otherWorkareas: programmeWorkareas(
      parentWorkarea,
      readFromDisk(parentWorkarea),
      index
    ),
    at: now().toISOString()
  })
  const planned = new Map([
    [workarea, plan.backlog],
    [plan.workarea, plan.sourceBacklog],
    ...plan.relinks.map((relink) => [relink.workarea, relink.backlog])
  ])
  const reader = (other) => planned.get(other) ?? readFromDisk(other)
  const problems = [...planned].flatMap(([plannedWorkarea, plannedBacklog]) =>
    checkBacklog(plannedBacklog, schema, {
      readWorkareaBacklog: reader
    }).problems.map((problem) => `${plannedWorkarea}: ${problem}`)
  )
  if (problems.length) throw refuse(problems, 'after moving the rows back')

  const sourcePath = backlogPathFor(workspaceRoot, plan.workarea)
  const relinkPathOf = (relink) =>
    backlogPathFor(workspaceRoot, relink.workarea)
  const newIndex = index
    ? indexWithRowsMovedBack({
        index,
        home: {
          theme: backlog.theme,
          workarea,
          rows: plan.backlog.increments.length
        },
        source: {
          theme: options.backFrom,
          workarea: plan.workarea,
          rows: plan.sourceBacklog.increments.length
        },
        rowIds: plan.pointer.increments
      })
    : null
  const changedPaths = plannedFiles(
    [
      { path, value: plan.backlog },
      { path: sourcePath, value: plan.sourceBacklog },
      ...plan.relinks.map((relink) => ({
        path: relinkPathOf(relink),
        value: relink.backlog
      })),
      ...(newIndex ? [{ path: indexPath, value: newIndex }] : [])
    ],
    options.write
  )
  return {
    path,
    written: options.write,
    changed: changedPaths.has(path),
    movedBackFrom: {
      theme: options.backFrom,
      workarea: plan.workarea,
      path: sourcePath,
      rows: plan.pointer.increments,
      rowsLeft: plan.sourceBacklog.increments.length,
      changed: changedPaths.has(sourcePath)
    },
    index: newIndex
      ? { path: indexPath, changed: changedPaths.has(indexPath) }
      : null,
    backRewired: plan.rewired,
    relinked: relinkedFilesOf(plan.relinks, relinkPathOf, changedPaths)
  }
}

/**
 * Split a themed backlog into one backlog per theme, and index them. Checks
 * the parent first and every split backlog before writing any, and writes
 * only the files that change, and only with `write`.
 *
 * With `theme`, splits only those themes off, early: each one's backlog is
 * written as the full split would, its theme and rows leave the parent, and
 * the parent keeps a pointer to it in `splitOff`. The rest of the parent
 * stays as it is, to be ruled on and distilled again.
 *
 * With `relink`, splits nothing: it points every theme split off early that
 * waits on a row a later early split moved out of the parent at that row's
 * new workarea.
 *
 * With `rows` and `to`, given a theme's split backlog, moves those rows into
 * a new split backlog for theme `to`, on its own branch, and leaves a pointer
 * to them in `movedOut` ({@link planMoveRows}). The themes index gains the
 * new theme in the old one's wave.
 *
 * With `rows` and `backFrom`, given the split backlog that moved rows out,
 * moves those rows back from theme `backFrom` ({@link planMoveRowsBack}). The
 * themes index updates both row counts, and a theme left with no rows leaves
 * the landing order.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {{write: boolean, relink: boolean, theme: string[], branchPrefix: string|undefined, rows?: string[], to?: string, branch?: string, title?: string, backFrom?: string}} args.options
 * @param {() => Date} [args.now] - The clock a split-off or moved-out pointer's time is read from
 * @returns {object} What was, or would be, written
 * @throws {TimError} USAGE when the backlog has no themes or is itself a split, a theme cannot be split off, or rows cannot be moved; LINT when it, or a split, is out of shape
 */
export const runSplit = ({
  workspaceRoot,
  workarea: rawWorkarea,
  options,
  now = () => new Date()
}) => {
  const workarea = normaliseWorkarea(rawWorkarea)
  const path = backlogPathFor(workspaceRoot, workarea)
  const schema = loadBacklogSchema(workspaceRoot)
  const backlog = readJsonFile(path)
  const readFromDisk = workareaBacklogReader(workspaceRoot)
  if (options.backFrom !== undefined) {
    return runMoveRowsBack({
      workspaceRoot,
      workarea,
      path,
      schema,
      backlog,
      readFromDisk,
      options,
      now
    })
  }
  if (options.rows?.length) {
    return runMoveRows({
      workspaceRoot,
      workarea,
      path,
      schema,
      backlog,
      readFromDisk,
      options,
      now
    })
  }
  requireThemedParent(backlog, workarea)
  if (options.relink) {
    return runRelink({
      workspaceRoot,
      workarea,
      path,
      schema,
      backlog,
      readFromDisk,
      options
    })
  }

  const parentProblems = checkBacklog(backlog, schema, {
    readWorkareaBacklog: readFromDisk
  }).problems
  if (parentProblems.length) throw refuse(parentProblems, `in ${path}`)

  const indexPath = themesIndexPathOf(workspaceRoot, workarea)
  if (options.theme.length) {
    return runSplitOff({
      workspaceRoot,
      workarea,
      path,
      indexPath,
      schema,
      backlog,
      readFromDisk,
      options,
      now
    })
  }
  const plan = planSplit({
    backlog,
    workarea,
    branchPrefix:
      options.branchPrefix ?? defaultBranchPrefix(backlog, workarea),
    readWorkareaBacklog: readFromDisk,
    previousIndex: readIndex(indexPath)
  })
  if (plan.problems.length) {
    throw refuse(plan.problems, 'with the split already on disk')
  }
  const problems = splitProblems({
    splits: plan.splits,
    schema,
    readWorkareaBacklog: overlayReader({
      splits: plan.splits,
      workarea,
      backlog,
      readFromDisk
    })
  })
  if (problems.length) throw refuse(problems, 'in the split backlogs')

  const changedPaths = plannedFiles(
    [
      ...plan.splits.map((split) => ({
        path: backlogPathFor(workspaceRoot, split.workarea),
        value: split.backlog
      })),
      { path: indexPath, value: plan.index }
    ],
    options.write
  )

  return {
    path,
    written: options.write,
    index: { path: indexPath, changed: changedPaths.has(indexPath) },
    themes: plan.splits.map((split) => {
      const splitPath = backlogPathFor(workspaceRoot, split.workarea)
      return {
        id: split.theme,
        workarea: split.workarea,
        path: splitPath,
        branch: split.backlog.branch,
        wave: split.backlog.parent.wave,
        rows: split.backlog.increments.length,
        kept: split.kept,
        removed: split.removed,
        changed: changedPaths.has(splitPath)
      }
    }),
    landingOrder: plan.index.landingOrder,
    crossThemeDependencies: plan.index.crossThemeDependencies,
    unthemed: plan.index.unthemed,
    splitOff: splitOffOf(backlog).map((pointer) => ({
      id: pointer.theme,
      workarea: pointer.workarea,
      branch: pointer.branch
    }))
  }
}

const countOf = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

const describeTheme = (result, id) => {
  const theme = result.themes.find((candidate) => candidate.id === id)
  if (theme) return `${theme.id} (${theme.rows} rows, ${theme.workarea})`
  const splitOff = result.splitOff.find((candidate) => candidate.id === id)
  return `${id} (split off early, on ${splitOff?.branch ?? 'its own branch'})`
}

const describeWave = (result, wave) =>
  `  wave ${wave.wave}: ${wave.themes
    .map((id) => describeTheme(result, id))
    .join(', ')}`

const writeLine = (files, written) => {
  const changed = files.filter((file) => file.changed)
  if (!changed.length) {
    return 'Nothing changed: the split on disk is already up to date.'
  }
  if (written) return `Wrote ${changed.length} files.`
  return `${changed.length} files would change. Add --write to write them.`
}

const splitOffLine = (result) =>
  result.splitOff.length
    ? [
        `Left out ${countOf(result.splitOff.length, 'theme')} already split off, which build on their own branches: ${result.splitOff.map((theme) => `${theme.id} (${theme.branch})`).join(', ')}.`
      ]
    : []

const renderFullSplit = (result) =>
  [
    `${result.themes.length} themes, landing in ${result.landingOrder.length} waves. Themes in one wave build in parallel.`,
    ...result.landingOrder.map((wave) => describeWave(result, wave)),
    ...splitOffLine(result),
    `${result.crossThemeDependencies.length} rows depend on a row in another theme or in none.`,
    writeLine([result.index, ...result.themes], result.written)
  ].join('\n')

const describeSplitOff = (theme) =>
  `Theme "${theme.theme}" (${countOf(theme.increments.length, 'row')}, ${countOf(theme.requirements.length, 'requirement')}) moves to ${theme.workarea}, to build on ${theme.branch}.`

const describeWaits = (entries, heading, none) =>
  entries.length
    ? [
        heading,
        ...entries.map(
          (entry) =>
            `  ${entry.id} waits for ${entry.dependsOn} in ${entry.workarea}`
        )
      ]
    : [none]

const renderSplitOff = (result) =>
  [
    ...result.splitOff.map(describeSplitOff),
    `The main backlog no longer has ${result.splitOff.length === 1 ? 'this theme or its rows' : 'these themes or their rows'}. It keeps a pointer to each in "splitOff", so a re-distil does not draft them again.`,
    ...describeWaits(
      result.rewired.left,
      'Rows left in the main backlog that now wait for a row in a split backlog:',
      'No row left in the main backlog waits for a row that moved.'
    ),
    ...describeWaits(
      result.rewired.moved,
      'Rows that moved that wait for a row in another backlog:',
      'No row that moved waits for a row in another backlog.'
    ),
    ...describeRelinks(result.rewired.relinked),
    writeLine(
      [
        { changed: result.changed },
        result.index,
        ...result.splitOff,
        ...result.relinked
      ],
      result.written
    )
  ].join('\n')

const describeRelinks = (
  relinked,
  heading = 'Rows that now wait for a row where an early split moved it:'
) =>
  relinked.length
    ? [
        heading,
        ...relinked.map(
          (entry) =>
            `  ${entry.id} waits for ${entry.dependsOn} in ${entry.workarea}`
        )
      ]
    : []

const renderRelink = (result) => {
  const rows = result.relinked.flatMap((file) => file.rows)
  if (!rows.length) {
    return 'No theme split off early waits on a row another split has moved.'
  }
  return [
    ...describeRelinks(rows),
    writeLine(result.relinked, result.written)
  ].join('\n')
}

const describeDropped = (dropped) =>
  dropped.length
    ? [
        'Dependencies dropped because the row is already done, so the new branch has it:',
        ...dropped.map(
          (entry) => `  ${entry.id} no longer waits for ${entry.dependsOn}`
        )
      ]
    : []

const renderMoveRows = (result) =>
  [
    `${countOf(result.movedTo.rows.length, 'row')} (${result.movedTo.rows.join(', ')}) move to ${result.movedTo.workarea}, theme "${result.movedTo.theme}", to build on ${result.movedTo.branch}.`,
    'The backlog they leave keeps a pointer to them in "movedOut", so nothing drafts them again.',
    ...describeWaits(
      result.moveRewired.left,
      'Rows left behind that now wait for a moved row:',
      'No row left behind waits for a moved row.'
    ),
    ...describeWaits(
      result.moveRewired.moved,
      'Moved rows that wait for a row left behind:',
      'No moved row waits for a row left behind.'
    ),
    ...describeDropped(result.moveRewired.dropped),
    ...describeRelinks(
      result.moveRewired.relinked,
      'Rows in other backlogs that now wait for a moved row in its new workarea:'
    ),
    writeLine(
      [
        { changed: result.changed },
        result.movedTo,
        ...(result.index ? [result.index] : []),
        ...result.relinked
      ],
      result.written
    )
  ].join('\n')

const describeLeftAway = (movedBackFrom) =>
  movedBackFrom.rowsLeft
    ? `${movedBackFrom.workarea} keeps ${countOf(movedBackFrom.rowsLeft, 'row')} to build on its own branch.`
    : `${movedBackFrom.workarea} has no rows left, so nothing builds there. Theme "${movedBackFrom.theme}" leaves the landing order.`

const renderMoveRowsBack = (result) =>
  [
    `${countOf(result.movedBackFrom.rows.length, 'row')} (${result.movedBackFrom.rows.join(', ')}) move back from theme "${result.movedBackFrom.theme}" to this backlog, with every field they had.`,
    describeLeftAway(result.movedBackFrom),
    'The backlog they leave keeps a pointer to them in "movedBack", so neither machine builds them twice.',
    ...describeWaits(
      result.backRewired.home,
      'Rows here that now wait for a returning row in this backlog:',
      'No row here waited for a returning row.'
    ),
    ...describeWaits(
      result.backRewired.away,
      'Rows left away that now wait for a returning row here:',
      'No row left away waits for a returning row.'
    ),
    ...describeRelinks(
      result.backRewired.relinked,
      'Rows in other backlogs that now wait for a returning row here:'
    ),
    writeLine(
      [
        { changed: result.changed },
        result.movedBackFrom,
        ...(result.index ? [result.index] : []),
        ...result.relinked
      ],
      result.written
    )
  ].join('\n')

const renderSplit = (result) => {
  if (result.movedBackFrom) return renderMoveRowsBack(result)
  if (result.movedTo) return renderMoveRows(result)
  if (result.rewired) return renderSplitOff(result)
  if (result.relinked) return renderRelink(result)
  return renderFullSplit(result)
}

const collect = (value, previous) => previous.concat([value])

export const register = (backlog, { timVersion }) => {
  backlog
    .command('split <workarea>')
    .description(
      "Split a themed backlog into one backlog per theme, under <workarea>/themes/<theme id>/, and write themes.json with the landing order. A dependsOn on another theme's row becomes an externalDependsOn. Checks every split backlog first. With --theme, splits only that theme off, early: its rows leave the main backlog, which keeps a pointer to them in splitOff. With --rows and --to, given a theme's split backlog, moves those rows into a new theme's backlog beside it, to build on a second machine: the old backlog keeps a pointer to them in movedOut. With --rows and --back-from, given the backlog that moved rows out, moves them back from that theme so this machine builds them: the theme they leave keeps a pointer to them in movedBack. A dry run unless given --write"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog split shared/my-programme --json\n' +
        '  tim backlog split shared/my-programme --write --json\n' +
        '  tim backlog split shared/my-programme --branch-prefix feat/EUDPA-123-plants --write\n' +
        '  tim backlog split shared/my-programme --theme origin-pages --json\n' +
        '  tim backlog split shared/my-programme --theme origin-pages --write --json\n' +
        '  tim backlog split shared/my-programme --relink --write --json\n' +
        '  tim backlog split shared/my-programme/themes/origin-pages --rows inc-004,inc-007 --to origin-pages-b --json\n' +
        '  tim backlog split shared/my-programme/themes/origin-pages --rows inc-004,inc-007 --to origin-pages-b --branch feat/EUDPA-123-origin-pages-b --write --json\n' +
        '  tim backlog split shared/my-programme/themes/origin-pages --rows inc-004,inc-007 --back-from origin-pages-b --json\n' +
        '  tim backlog split shared/my-programme/themes/origin-pages --rows inc-004,inc-007 --back-from origin-pages-b --write --json\n' +
        'With --back-from, each row keeps every field and its status, and goes back before the first row here that waits for it.\n' +
        'The movedOut pointer loses the rows and is dropped once empty. A theme left with no rows leaves the landing order in themes.json.\n' +
        'With --rows, a moved row stops waiting for a row left behind that is done, because the new branch is cut from the old one.\n' +
        'Any other dependency between the two backlogs becomes an externalDependsOn, and every other backlog in the programme\n' +
        'that waits for a moved row is pointed at its new workarea.\n' +
        'Exits 1, writing nothing, when the backlog or any split backlog is out of shape.\n' +
        'Exits 2 when --theme names a theme the backlog does not have, or one already split off,\n' +
        'or when --rows names a row the backlog does not have, or one that is not todo or blocked,\n' +
        'or when --back-from names a theme this backlog moved no rows to, or one of --rows did not move there.'
    )
    .option('--write', 'Write the split backlogs and themes.json')
    .option(
      '--relink',
      'Split nothing. Point each theme split off early at the new workarea of any row it waits on that a later early split moved'
    )
    .option(
      '--theme <id>',
      'Split only this theme off, early, and take it and its rows out of the main backlog. Give it more than once for more than one theme',
      collect,
      []
    )
    .option(
      '--branch-prefix <prefix>',
      'The part of each theme branch before its theme id. Default feat/NO_JIRA-<programme>'
    )
    .option(
      '--rows <ids>',
      "Move these rows, separated by commas, out of a theme's split backlog with --to, or back into it with --back-from",
      collect,
      []
    )
    .option(
      '--to <theme id>',
      'The new theme the --rows move to. Its backlog is written to <parent>/themes/<theme id>/'
    )
    .option(
      '--branch <name>',
      "The branch the new theme builds on. Default the split backlog's branch with its theme id swapped for --to"
    )
    .option('--title <text>', "The new theme's title in themes.json")
    .option(
      '--back-from <theme id>',
      'Move the --rows back from this theme, which this backlog moved them to with --to'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) =>
          runSplit({
            workspaceRoot,
            workarea: args[0],
            options: parseSplitOpts(opts)
          }),
        renderText: renderSplit,
        timVersion
      })
    )
}
