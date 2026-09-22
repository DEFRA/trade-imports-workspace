import { z } from 'zod'
import { join, normalize, sep } from 'node:path'
import { readJsonFile, writeJsonAtomic } from '../../backlog/io.js'
import {
  STATUSES,
  checkBacklog,
  nextBuildable,
  setRowFields
} from '../../backlog/shape.js'
import { TimError } from '../../errors.js'
import { makeBacklogAction, parseOptions } from './shared.js'

/**
 * The backlog.json under `workareas/<workarea>/`, the same path the build loop
 * and the BUILD phase take. Refuses an absolute path or one that climbs out
 * of workareas/ before any read.
 *
 * @param {string} workspaceRoot
 * @param {unknown} workarea
 * @returns {string}
 * @throws {TimError} USAGE
 */
export const backlogPathFor = (workspaceRoot, workarea) => {
  if (typeof workarea !== 'string' || !workarea.trim()) {
    throw new TimError('USAGE', 'Name a workarea, such as shared/my-programme.')
  }
  const trimmed = workarea.trim().replace(/\/+$/, '')
  const normalised = normalize(trimmed).split(sep).join('/')
  if (
    trimmed.startsWith('/') ||
    normalised === '..' ||
    normalised.startsWith('../')
  ) {
    throw new TimError(
      'USAGE',
      `Workarea "${workarea}" must be a path inside workareas/, such as shared/my-programme.`
    )
  }
  return join(workspaceRoot, 'workareas', normalised, 'backlog.json')
}

const prSchema = z.object({ url: z.string().min(1) }).passthrough()

const setOptsSchema = z
  .object({
    status: z
      .enum(STATUSES, {
        message: `--status must be one of: ${STATUSES.join(', ')}.`
      })
      .optional(),
    commit: z.string().trim().min(1).optional(),
    ticket: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    note: z.string().trim().min(1).optional(),
    openQuestion: z.string().trim().min(1).optional(),
    pr: z.string().optional()
  })
  .refine((opts) => Object.values(opts).some((value) => value !== undefined), {
    message:
      'Give at least one of --status, --commit, --ticket, --branch, --note, --open-question or --pr.'
  })

const parsePr = (raw) => {
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    throw new TimError('USAGE', `--pr "${raw}" is not valid JSON.`)
  }
  const result = prSchema.safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', '--pr must be a JSON object with a "url".')
  }
  return result.data
}

/**
 * Validate `tim backlog set`'s options before any read.
 *
 * @param {object} opts
 * @returns {object} The changes to apply
 * @throws {TimError} USAGE
 */
export const parseSetOpts = (opts) => {
  const parsed = parseOptions(setOptsSchema, {
    status: opts.status,
    commit: opts.commit,
    ticket: opts.ticket,
    branch: opts.branch,
    note: opts.note,
    openQuestion: opts.openQuestion,
    pr: opts.pr
  })
  return Object.fromEntries(
    Object.entries({
      ...parsed,
      pr: parsed.pr === undefined ? undefined : parsePr(parsed.pr)
    }).filter(([, value]) => value !== undefined)
  )
}

const describeCounts = (counts) =>
  Object.entries(counts)
    .map(([status, count]) => `${count} ${status}`)
    .join(', ')

const renderCheck = (result) =>
  result.total
    ? `${result.total} increments, all in shape: ${describeCounts(result.counts)}.`
    : 'The backlog is in shape, and has no increments yet.'

const renderNext = (result) => result.next ?? 'NONE'

const renderSet = (result) =>
  [
    ...Object.entries(result.changed).map(
      ([field, { before, after }]) =>
        `${result.id} ${field}: ${JSON.stringify(before ?? null)} -> ${JSON.stringify(after)}`
    ),
    Object.keys(result.changed).length
      ? `Written to ${result.path}`
      : `${result.id} already had those values. Nothing written.`
  ].join('\n')

export const register = (backlog, { timVersion }) => {
  backlog
    .command('check <workarea>')
    .description(
      "Check a workarea's backlog.json against the one backlog shape the distiller writes and the build loop reads"
    )
    .addHelpText(
      'after',
      '\nExample: tim backlog check shared/my-programme --json\n' +
        'Exits 1 when anything is out of shape.'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          const result = { path, ...checkBacklog(readJsonFile(path)) }
          if (result.problems.length) {
            throw new TimError(
              'LINT',
              `${result.problems.length} problems in ${path}:\n${result.problems.join('\n')}`
            )
          }
          return result
        },
        renderText: renderCheck,
        timVersion
      })
    )

  backlog
    .command('next <workarea>')
    .description(
      'The next buildable increment: the first not withheld whose every dependency is done. Prints NONE when there is none'
    )
    .addHelpText(
      'after',
      '\nExample: tim backlog next shared/my-programme --json'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          return { path, next: nextBuildable(readJsonFile(path)) }
        },
        renderText: renderNext,
        timVersion
      })
    )

  backlog
    .command('set <workarea> <id>')
    .description(
      'Record build state on one increment: status, commit, ticket and branch are replaced; a note, an open question or a pull request is added'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog set shared/my-programme inc-004 --commit abc1234 --json\n' +
        '  tim backlog set shared/my-programme inc-004 --pr \'{"repo":"frontend","url":"https://github.com/DEFRA/x/pull/9","number":9}\' --json\n' +
        '  tim backlog set shared/my-programme inc-004 --status done --json'
    )
    .option('--status <status>', `One of: ${STATUSES.join(', ')}`)
    .option('--commit <sha>', 'The commit the increment landed as')
    .option('--ticket <key>', 'The Jira key raised for the increment')
    .option('--branch <name>', 'The branch the increment builds on')
    .option('--note <text>', 'A note to add to the increment')
    .option(
      '--open-question <text>',
      'An open question to add to the increment'
    )
    .option(
      '--pr <json>',
      'A pull request as JSON with a "url". Merged into the entry with the same url, or added'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          const id = args[1]
          const changes = parseSetOpts(opts)
          const { backlog: updated, changed } = setRowFields({
            backlog: readJsonFile(path),
            id,
            changes
          })
          if (Object.keys(changed).length) writeJsonAtomic(path, updated)
          return { path, id, changed }
        },
        renderText: renderSet,
        timVersion
      })
    )
}
