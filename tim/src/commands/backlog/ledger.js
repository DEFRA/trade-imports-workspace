import { z } from 'zod'
import { loadProgramme } from '../../backlog/programme.js'
import { recordRuling } from '../../backlog/rule.js'
import { checkDecisionsPage } from '../../backlog/decisions-page.js'
import {
  QUESTION_ID,
  DECISION_ID,
  REQUIREMENT_ID,
  OPTION_ID,
  ISO_DATE_OR_DATETIME
} from '../../backlog/profiles/requirements-v2.ledger.js'
import { INCREMENT_ID } from '../../backlog/state-schema.js'
import { TimError } from '../../errors.js'
import {
  makeBacklogAction,
  parseProgrammeKey,
  parseOptions,
  opIdSchema,
  expectShaSchema
} from './shared.js'

const collect = (value, previous) => previous.concat([value])

const questionIdSchema = z
  .string()
  .regex(QUESTION_ID, 'must look like q-<slug> (letters, digits and hyphens).')

/**
 * Validate the `<question>` positional before any read (D4): a question
 * number, a position or a headline is refused with exit 2, never resolved
 * against the live file.
 *
 * @param {unknown} value
 * @returns {string}
 * @throws {TimError} USAGE
 */
const parseQuestionId = (value) => {
  const result = questionIdSchema.safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', `question: ${result.error.issues[0].message}`)
  }
  return result.data
}

const appliesToIdSchema = z
  .string()
  .refine((value) => REQUIREMENT_ID.test(value) || INCREMENT_ID.test(value), {
    message: 'must look like req-001 or inc-001.'
  })

const ruleOptsSchema = z
  .object({
    option: z
      .string()
      .regex(OPTION_ID, 'must be a single capital letter.')
      .optional(),
    by: z
      .string()
      .trim()
      .min(1, 'Give --by.')
      .regex(
        /^[a-z][a-z0-9-]*$/,
        'must be a lower-case name ("sam", "default", or a delegate).'
      ),
    at: z
      .string()
      .trim()
      .min(1, 'Give --at.')
      .regex(ISO_DATE_OR_DATETIME, 'must be an ISO date or date-time.'),
    words: z.string().trim().min(1).optional(),
    note: z.string().trim().min(1).optional(),
    tentative: z.boolean().optional().default(false),
    supersedes: z
      .string()
      .regex(DECISION_ID, 'must look like d-001.')
      .optional(),
    appliesTo: z.array(appliesToIdSchema).optional().default([]),
    opId: opIdSchema.optional(),
    expectSha: expectShaSchema.optional()
  })
  .superRefine((opts, ctx) => {
    const isDefault = opts.by === 'default'
    if (isDefault) {
      if (opts.tentative) {
        ctx.addIssue({
          code: 'custom',
          message: '"--by default" cannot be combined with "--tentative".'
        })
      }
      return
    }
    if (!opts.option) {
      ctx.addIssue({ code: 'custom', message: 'Give --option.' })
    }
    if (!opts.words) {
      ctx.addIssue({ code: 'custom', message: 'Give --words.' })
    }
    if (!opts.note) {
      ctx.addIssue({ code: 'custom', message: 'Give --note.' })
    }
  })

const checkPageOptsSchema = z.object({
  page: z.string().trim().min(1, 'Give --page.')
})

const changeLine = (change) =>
  `${change.target} ${change.field}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}`

const renderRule = (result) => {
  if (result.decision.status === 'tentative') {
    return [
      `Recorded as tentative. ${result.question.id} is ${result.question.status}. Nothing else changed.`,
      `Written to ${result.path}`,
      ...(result.notes ?? [])
    ].join('\n')
  }
  const lines = [
    `${result.decision.id} recorded for ${result.question.id}: option ${result.decision.chosen}, ${result.decision.status}.`,
    ...result.changes.map(changeLine),
    `Written to ${result.path}`,
    ...(result.notes ?? [])
  ]
  if (result.reverse?.length) {
    lines.push('To change it:', ...result.reverse)
  }
  return lines.join('\n')
}

const renderCheckPage = (result) =>
  `The page matches backlog.json for ${result.matched === 1 ? 'one' : result.matched} question${result.matched === 1 ? '' : 's'}.`

/**
 * Adds `rule` and `question check-page` to the `tim backlog` command
 * (DESIGN 4.2).
 *
 * @param {import('commander').Command} backlog
 * @param {object} args
 * @param {string} args.timVersion
 */
export const register = (backlog, { timVersion }) => {
  backlog
    .command('rule <programme> <question>')
    .description('Record and apply a ruling on one question, in one write')
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog rule requirements-pipeline q-notification-list-scope --option A --by sam --at 2026-09-21T10:00:00Z --words "Own org only." --note "Security: a cross-org list is a data-isolation failure." --json\n' +
        '  tim backlog rule requirements-pipeline q-house-rules-source --by default --at 2026-09-21T10:00:00Z --json'
    )
    .option('--option <letter>', 'The chosen option, a single capital letter')
    .option('--by <who>', 'Who is ruling: sam, a named delegate, or "default"')
    .option(
      '--at <iso>',
      'An ISO date or date-time; tim never reads the clock for a ruling'
    )
    .option('--words <text>', "The ruler's own words, kept verbatim")
    .option('--note <text>', 'Why, in one sentence')
    .option('--tentative', 'Record a hedge as tentative without applying it')
    .option('--supersedes <d-NNN>', 'The decision this ruling changes')
    .option(
      '--applies-to <id>',
      'A requirement or increment id this ruling covers. Repeatable',
      collect,
      []
    )
    .option(
      '--op-id <id>',
      'An idempotency key. Replaying the same id is a no-op that prints the original result'
    )
    .option(
      '--expect-sha <sha>',
      'The sha256 this run is based on. Refused if the backlog has changed since'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const key = parseProgrammeKey(args[0], 'programme')
          const questionId = parseQuestionId(args[1])
          const parsed = parseOptions(ruleOptsSchema, opts)
          const profile = loadProgramme({ workspaceRoot, key })
          return recordRuling({
            profile,
            questionId,
            option: parsed.option,
            by: parsed.by,
            at: parsed.at,
            words: parsed.words,
            note: parsed.note,
            tentative: parsed.tentative,
            supersedes: parsed.supersedes,
            appliesTo: parsed.appliesTo,
            opId: parsed.opId,
            expectSha: parsed.expectSha
          })
        },
        renderText: renderRule,
        timVersion
      })
    )

  const question = backlog
    .command('question')
    .description('Ledger records a person must or may decide')

  question
    .command('check-page <programme>')
    .description(
      "Check the hand-written decisions page's ids, defaults and blocked increments against backlog.json"
    )
    .addHelpText(
      'after',
      '\nExample: tim backlog question check-page requirements-pipeline --page design/decisions-for-sam.md --json'
    )
    .requiredOption('--page <file>', 'The decisions page to check')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const key = parseProgrammeKey(args[0], 'programme')
          const parsed = parseOptions(checkPageOptsSchema, opts)
          const profile = loadProgramme({ workspaceRoot, key })
          return checkDecisionsPage({ profile, pagePath: parsed.page })
        },
        renderText: renderCheckPage,
        timVersion
      })
    )
}
