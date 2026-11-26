import { z } from 'zod'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  workareaBacklogReader,
  workareaDirFor
} from '../../backlog/workarea.js'
import {
  BACKLOG_SCHEMA_PATH,
  loadBacklogSchema,
  loadIntakeSchema,
  rigoursOf,
  statusesOf
} from '../../backlog/backlog-schema.js'
import { combineCandidatesIn } from '../../backlog/combine-candidates.js'
import { readJsonFile, writeJsonAtomic } from '../../backlog/io.js'
import {
  checkBacklog,
  nextBuildable,
  setRowFields
} from '../../backlog/shape.js'
import { TimError } from '../../errors.js'
import { countOf } from '../../utils/count-of.js'
import { makeBacklogAction, parseOptions } from './shared.js'

/**
 * The backlog.json under `workareas/<workarea>/`. Refuses an absolute path or
 * one that climbs out of workareas/ before any read.
 *
 * @param {string} workspaceRoot
 * @param {unknown} workarea
 * @returns {string}
 * @throws {TimError} USAGE
 */
export const backlogPathFor = (workspaceRoot, workarea) =>
  join(workareaDirFor(workspaceRoot, workarea), 'backlog.json')

const intakeRecordFor = ({ workspaceRoot, workarea, backlog }) => {
  if (typeof backlog?.ticket !== 'string') return undefined
  const intakePath = join(
    workareaDirFor(workspaceRoot, workarea),
    'intake.json'
  )
  return {
    record: existsSync(intakePath) ? readJsonFile(intakePath) : null,
    schema: loadIntakeSchema(workspaceRoot)
  }
}

const prSchema = z.object({ url: z.string().min(1) }).passthrough()

const setOptsSchemaFor = (statuses) =>
  z
    .object({
      status: z
        .enum(statuses, {
          message: `--status must be one of: ${statuses.join(', ')}.`
        })
        .optional(),
      commit: z.string().trim().min(1).optional(),
      ticket: z.string().trim().min(1).optional(),
      branch: z.string().trim().min(1).optional(),
      note: z.string().trim().min(1).optional(),
      openQuestion: z.string().trim().min(1).optional(),
      removeOpenQuestion: z
        .string()
        .regex(/^[1-9]\d*$/, {
          message:
            '--remove-open-question must be the number of an open question, counting from 1.'
        })
        .transform(Number)
        .optional(),
      pr: z.string().optional(),
      merge: z.array(z.string()).optional(),
      dependsOn: z.string().optional(),
      attempt: z.string().optional(),
      rigour: z.string().optional()
    })
    .refine(
      (opts) => Object.values(opts).some((value) => value !== undefined),
      {
        message:
          'Give at least one of --status, --commit, --ticket, --branch, --note, --open-question, --remove-open-question, --pr, --merge, --depends-on, --attempt or --rigour.'
      }
    )

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

const attemptSchema = z
  .object({
    stage: z.enum(['implement', 'review', 'ladder']),
    reason: z.string().trim().min(1),
    at: z.string().trim().min(1),
    planReviewed: z.boolean(),
    work: z.object({ kind: z.enum(['wip', 'patches', 'none']) }).passthrough()
  })
  .passthrough()

const parseAttempt = (raw) => {
  if (raw === 'none') return 'none'
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    throw new TimError('USAGE', `--attempt "${raw}" is not valid JSON.`)
  }
  const result = attemptSchema.safeParse(value)
  if (!result.success) {
    throw new TimError(
      'USAGE',
      '--attempt must be "none", or a JSON object with a "stage" of implement, review or ladder, a "reason", an "at", a "planReviewed" and a "work" with a "kind".'
    )
  }
  return result.data
}

const parseRigour = (raw, rigours) => {
  if (raw === 'none') return 'none'
  if (!rigours.includes(raw)) {
    throw new TimError(
      'USAGE',
      `--rigour must be "none" to clear it, or one of ${rigours.join(', ')}.`
    )
  }
  return raw
}

const MERGE_PATTERN = /^([^=\s]+)=(\S+)$/

const parseMergeEntry = (entry) => {
  const match = MERGE_PATTERN.exec(entry.trim())
  if (!match) {
    throw new TimError(
      'USAGE',
      `--merge "${entry}" must be <repoKey>=<ref>, such as tests=origin/main.`
    )
  }
  return [match[1], match[2]]
}

const parseMerge = (entries) => Object.fromEntries(entries.map(parseMergeEntry))

const ROW_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const parseDependsOn = (raw) => {
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const invalid = ids.filter((id) => !ROW_ID.test(id))
  if (invalid.length) {
    throw new TimError(
      'USAGE',
      `--depends-on must be row ids separated by commas, such as inc-206,inc-210. "${invalid.join('", "')}" is not a row id.`
    )
  }
  return ids
}

const collect = (value, previous = []) => [...previous, value]

/**
 * Validate `tim backlog set`'s options before the backlog is read.
 *
 * @param {object} opts
 * @param {string[]} statuses - The statuses backlog.schema.json allows
 * @param {string[]} rigours - The rigour presets backlog.schema.json allows
 * @returns {object} The changes to apply
 * @throws {TimError} USAGE
 */
export const parseSetOpts = (opts, statuses, rigours) => {
  const parsed = parseOptions(setOptsSchemaFor(statuses), {
    status: opts.status,
    commit: opts.commit,
    ticket: opts.ticket,
    branch: opts.branch,
    note: opts.note,
    openQuestion: opts.openQuestion,
    removeOpenQuestion: opts.removeOpenQuestion,
    pr: opts.pr,
    merge: opts.merge,
    dependsOn: opts.dependsOn,
    attempt: opts.attempt,
    rigour: opts.rigour
  })
  return Object.fromEntries(
    Object.entries({
      ...parsed,
      pr: parsed.pr === undefined ? undefined : parsePr(parsed.pr),
      merge: parsed.merge === undefined ? undefined : parseMerge(parsed.merge),
      dependsOn:
        parsed.dependsOn === undefined
          ? undefined
          : parseDependsOn(parsed.dependsOn),
      attempt:
        parsed.attempt === undefined ? undefined : parseAttempt(parsed.attempt),
      rigour:
        parsed.rigour === undefined
          ? undefined
          : parseRigour(parsed.rigour, rigours)
    }).filter(([, value]) => value !== undefined)
  )
}

const describeCounts = (counts) =>
  Object.entries(counts)
    .map(([status, count]) => `${count} ${status}`)
    .join(', ')

const renderIntake = ({
  ticket,
  readiness,
  statementCount,
  rowsToBuildCount
}) =>
  `${ticket} is ${readiness}: ${countOf(statementCount, 'statement')}, ${countOf(rowsToBuildCount, 'row')} still to build.`

const renderCheck = (result) =>
  [
    result.total
      ? `${result.total} increments, all in shape: ${describeCounts(result.counts)}.`
      : 'The backlog is in shape, and has no increments yet.',
    ...(result.intake ? [renderIntake(result.intake)] : [])
  ].join('\n')

const renderNext = (result) => result.next ?? 'NONE'

const renderCombineCandidates = (result) =>
  [
    `${result.rowsToBuild} rows still to build, ${countOf(result.candidates.length, 'pair')} to look at for combining.`,
    ...result.candidates.map(
      ({ rows: [earlier, later], reason }) =>
        `${earlier} and ${later}: ${reason}`
    ),
    ...(result.withoutTouches.length
      ? [
          `No touches, so paired only by what they wait on: ${result.withoutTouches.join(', ')}.`
        ]
      : [])
  ].join('\n')

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
      `Check a workarea's backlog.json against ${BACKLOG_SCHEMA_PATH}, that every dependency is in the backlog with no cycle, that its themes keep to their own code, and that every externalDependsOn row is in its own workarea's backlog. A backlog that names a ticket is also held to the intake.json beside it: every criterion of a row still to build (todo or blocked) ends with a bracket citing this ticket's statement ids, a repo or a ruling; every acceptance criterion is covered by a todo, blocked or done row or says why it is not built; a question holds the launch only for a named cause; an escalation is recorded when its signals trip, and then no row is left to build; and the backlog has no themes`
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
          const schema = loadBacklogSchema(workspaceRoot)
          const backlog = readJsonFile(path)
          const result = {
            path,
            ...checkBacklog(backlog, schema, {
              readWorkareaBacklog: workareaBacklogReader(workspaceRoot),
              intakeRecord: intakeRecordFor({
                workspaceRoot,
                workarea: args[0],
                backlog
              })
            })
          }
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
      "The next buildable increment: the first not withheld whose every dependency is done, including each externalDependsOn row in its own workarea's backlog. Prints NONE when there is none"
    )
    .addHelpText(
      'after',
      '\nExample: tim backlog next shared/my-programme --json'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          return {
            path,
            next: nextBuildable(readJsonFile(path), {
              readWorkareaBacklog: workareaBacklogReader(workspaceRoot)
            })
          }
        },
        renderText: renderNext,
        timVersion
      })
    )

  backlog
    .command('combine-candidates <workarea>')
    .description(
      'List the rows still to build that suit combining: pairs that share a code area, or where one waits only on the other. Counts the rows still to build and names those with no touches. Changes no file'
    )
    .addHelpText(
      'after',
      '\nExample: tim backlog combine-candidates shared/my-programme --json'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          return { path, ...combineCandidatesIn(readJsonFile(path)) }
        },
        renderText: renderCombineCandidates,
        timVersion
      })
    )

  backlog
    .command('set <workarea> <id>')
    .description(
      'Record build state on one increment: status, commit, ticket, branch, dependencies, the last failed attempt and rigour are replaced; a note, an open question or a pull request is added; an open question is removed by its number; a merge ref is set per repo'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog set shared/my-programme inc-004 --commit abc1234 --json\n' +
        '  tim backlog set shared/my-programme inc-004 --pr \'{"repo":"frontend","url":"https://github.com/DEFRA/x/pull/9","number":9}\' --json\n' +
        '  tim backlog set shared/my-programme inc-004 --status done --json\n' +
        '  tim backlog set shared/my-programme inc-004 --status dropped --note "Not needed any more" --json\n' +
        '  tim backlog set shared/my-programme inc-004 --remove-open-question 1 --json\n' +
        '  tim backlog set shared/my-programme inc-004 --merge tests=origin/main --json\n' +
        '  tim backlog set shared/my-programme inc-009 --depends-on inc-004,inc-007 --json\n' +
        '  tim backlog set shared/my-programme inc-009 --depends-on "" --json\n' +
        '  tim backlog set shared/my-programme inc-004 --attempt \'{"stage":"ladder","reason":"ladder-red","at":"2026-10-30T11:00:00Z","planReviewed":true,"work":{"kind":"wip","branch":"feat/EUDPA-900-x","sha":"abc1234"}}\' --json\n' +
        '  tim backlog set shared/my-programme inc-004 --attempt none --json\n' +
        '  tim backlog set shared/my-programme inc-004 --rigour fast --json\n'
    )
    .option(
      '--status <status>',
      `One of the statuses in ${BACKLOG_SCHEMA_PATH}`
    )
    .option('--commit <sha>', 'The commit the increment landed as')
    .option('--ticket <key>', 'The Jira key raised for the increment')
    .option('--branch <name>', 'The branch the increment builds on')
    .option('--note <text>', 'A note to add to the increment')
    .option(
      '--open-question <text>',
      'An open question to add to the increment'
    )
    .option(
      '--remove-open-question <number>',
      'Remove the open question with this number, counting from 1. tim backlog notes <workarea> <id> --open-questions lists them numbered'
    )
    .option(
      '--pr <json>',
      'A pull request as JSON with a "url". Merged into the entry with the same url, or added'
    )
    .option(
      '--merge <repoKey=ref>',
      "A ref the branch lifecycle merges into that repo before it builds the increment, such as tests=origin/main. The repo must be in the increment's repos. Repeat for more than one repo",
      collect
    )
    .option(
      '--depends-on <ids>',
      'Replace the rows the increment waits for in this backlog, separated by commas. Give "" for none'
    )
    .option(
      '--attempt <json>',
      'How far the last failed attempt got, as JSON with a "stage" of implement, review or ladder, a "reason", an "at", a "planReviewed" and a "work". "none" clears it, and so does recording a --commit'
    )
    .option(
      '--rigour <preset>',
      'How much of the pipeline this row gets, overriding the run\'s rigour: full, standard or fast. "none" clears it, and `tim build rigour <workarea>` proposes one'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          const id = args[1]
          const schema = loadBacklogSchema(workspaceRoot)
          const changes = parseSetOpts(
            opts,
            statusesOf(schema),
            rigoursOf(schema)
          )
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
