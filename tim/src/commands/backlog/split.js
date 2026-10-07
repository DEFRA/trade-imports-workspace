import { z } from 'zod'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadBacklogSchema } from '../../backlog/backlog-schema.js'
import { readJsonFile, writeJsonAtomic } from '../../backlog/io.js'
import { checkBacklog } from '../../backlog/shape.js'
import {
  THEMES_FOLDER,
  THEMES_INDEX,
  defaultBranchPrefix,
  planSplit
} from '../../backlog/split.js'
import {
  normaliseWorkarea,
  workareaBacklogReader,
  workareaDirFor
} from '../../backlog/workarea.js'
import { TimError } from '../../errors.js'
import { makeBacklogAction, parseOptions } from './shared.js'
import { backlogPathFor } from './rows.js'

const splitOptsSchema = z.object({
  write: z.boolean().optional().default(false),
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
 * @returns {{write: boolean, branchPrefix: string|undefined}}
 * @throws {TimError} USAGE
 */
export const parseSplitOpts = (opts) =>
  parseOptions(splitOptsSchema, {
    write: opts.write,
    branchPrefix: opts.branchPrefix
  })

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

/**
 * Split a themed backlog into one backlog per theme, and index them. Checks
 * the parent first and every split backlog before writing any, and writes
 * only the files that change, and only with `write`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {{write: boolean, branchPrefix: string|undefined}} args.options
 * @returns {object} What was, or would be, written
 * @throws {TimError} USAGE when the backlog has no themes or is itself a split; LINT when it, or a split, is out of shape
 */
export const runSplit = ({ workspaceRoot, workarea: rawWorkarea, options }) => {
  const workarea = normaliseWorkarea(rawWorkarea)
  const path = backlogPathFor(workspaceRoot, workarea)
  const schema = loadBacklogSchema(workspaceRoot)
  const backlog = readJsonFile(path)
  requireThemedParent(backlog, workarea)
  const readFromDisk = workareaBacklogReader(workspaceRoot)

  const parentProblems = checkBacklog(backlog, schema, {
    readWorkareaBacklog: readFromDisk
  }).problems
  if (parentProblems.length) throw refuse(parentProblems, `in ${path}`)

  const indexPath = join(
    workareaDirFor(workspaceRoot, workarea),
    THEMES_FOLDER,
    THEMES_INDEX
  )
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

  const files = [
    ...plan.splits.map((split) => ({
      path: backlogPathFor(workspaceRoot, split.workarea),
      value: split.backlog
    })),
    { path: indexPath, value: plan.index }
  ].map((file) => ({ ...file, changed: differsOnDisk(file.path, file.value) }))
  if (options.write) {
    files
      .filter((file) => file.changed)
      .forEach((file) => writeJsonAtomic(file.path, file.value))
  }
  const changedPaths = new Set(
    files.filter((file) => file.changed).map((file) => file.path)
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
    unthemed: plan.index.unthemed
  }
}

const describeWave = (result, wave) =>
  `  wave ${wave.wave}: ${wave.themes
    .map((id) => result.themes.find((theme) => theme.id === id))
    .map((theme) => `${theme.id} (${theme.rows} rows, ${theme.workarea})`)
    .join(', ')}`

const writeLine = (result) => {
  const changed = [result.index, ...result.themes].filter(
    (file) => file.changed
  )
  if (!changed.length) {
    return 'Nothing changed: the split on disk is already up to date.'
  }
  if (result.written) return `Wrote ${changed.length} files.`
  return `${changed.length} files would change. Add --write to write them.`
}

const renderSplit = (result) =>
  [
    `${result.themes.length} themes, landing in ${result.landingOrder.length} waves. Themes in one wave build in parallel.`,
    ...result.landingOrder.map((wave) => describeWave(result, wave)),
    `${result.crossThemeDependencies.length} rows depend on a row in another theme or in none.`,
    writeLine(result)
  ].join('\n')

export const register = (backlog, { timVersion }) => {
  backlog
    .command('split <workarea>')
    .description(
      "Split a themed backlog into one backlog per theme, under <workarea>/themes/<theme id>/, and write themes.json with the landing order. A dependsOn on another theme's row becomes an externalDependsOn. Checks every split backlog first. A dry run unless given --write"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog split shared/my-programme --json\n' +
        '  tim backlog split shared/my-programme --write --json\n' +
        '  tim backlog split shared/my-programme --branch-prefix feat/EUDPA-123-plants --write\n' +
        'Exits 1, writing nothing, when the backlog or any split backlog is out of shape.'
    )
    .option('--write', 'Write the split backlogs and themes.json')
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
