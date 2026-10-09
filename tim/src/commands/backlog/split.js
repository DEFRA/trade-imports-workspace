import { z } from 'zod'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadBacklogSchema } from '../../backlog/backlog-schema.js'
import { readJsonFile, writeJsonAtomic } from '../../backlog/io.js'
import { checkBacklog } from '../../backlog/shape.js'
import { splitOffOf } from '../../backlog/split-off.js'
import {
  THEMES_FOLDER,
  THEMES_INDEX,
  defaultBranchPrefix,
  planRelink,
  planSplit,
  planSplitOff
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

const splitOptsSchema = z.object({
  write: z.boolean().optional().default(false),
  relink: z.boolean().optional().default(false),
  theme: z.array(themeIdSchema).optional().default([]),
  branchPrefix: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9._/-]*[A-Za-z0-9]$/,
      '--branch-prefix must be a branch name with no spaces, such as feat/EUDPA-123-plants.'
    )
    .optional()
})

/**
 * Validate `tim backlog split`'s options before the backlog is read.
 *
 * @param {object} opts
 * @returns {{write: boolean, relink: boolean, theme: string[], branchPrefix: string|undefined}}
 * @throws {TimError} USAGE
 */
export const parseSplitOpts = (opts) => {
  const parsed = parseOptions(splitOptsSchema, {
    write: opts.write,
    relink: opts.relink,
    theme: opts.theme,
    branchPrefix: opts.branchPrefix
  })
  if (parsed.relink && parsed.theme.length) {
    throw new TimError(
      'USAGE',
      'Give --relink on its own. Splitting a theme off with --theme already relinks the themes split off before it.'
    )
  }
  return { ...parsed, theme: [...new Set(parsed.theme)] }
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
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {{write: boolean, relink: boolean, theme: string[], branchPrefix: string|undefined}} args.options
 * @param {() => Date} [args.now] - The clock a split-off pointer's time is read from
 * @returns {object} What was, or would be, written
 * @throws {TimError} USAGE when the backlog has no themes or is itself a split, or a theme cannot be split off; LINT when it, or a split, is out of shape
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
  requireThemedParent(backlog, workarea)
  const readFromDisk = workareaBacklogReader(workspaceRoot)
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

  const indexPath = join(
    workareaDirFor(workspaceRoot, workarea),
    THEMES_FOLDER,
    THEMES_INDEX
  )
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

const describeRelinks = (relinked) =>
  relinked.length
    ? [
        'Rows that now wait for a row where an early split moved it:',
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

const renderSplit = (result) => {
  if (result.rewired) return renderSplitOff(result)
  if (result.relinked) return renderRelink(result)
  return renderFullSplit(result)
}

const collect = (value, previous) => previous.concat([value])

export const register = (backlog, { timVersion }) => {
  backlog
    .command('split <workarea>')
    .description(
      "Split a themed backlog into one backlog per theme, under <workarea>/themes/<theme id>/, and write themes.json with the landing order. A dependsOn on another theme's row becomes an externalDependsOn. Checks every split backlog first. With --theme, splits only that theme off, early: its rows leave the main backlog, which keeps a pointer to them in splitOff. A dry run unless given --write"
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
        'Exits 1, writing nothing, when the backlog or any split backlog is out of shape.\n' +
        'Exits 2 when --theme names a theme the backlog does not have, or one already split off.'
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
