import { z } from 'zod'
import { OK } from '../../constants/exitCodes.js'
import { SIGNED_OFF_CHANGED } from '../../constants/specExitCodes.js'
import { TimError } from '../../errors.js'
import { diffSpecCommits } from '../../spec/diff.js'
import { diffSignedOff } from '../../spec/signed-off/diff.js'
import { makeSpecAction } from './shared.js'

const NAME_THE_CHANGES =
  'Name at least one commit with --commit, such as a merge commit on main, or a range with --range.'
const NAME_WHAT_TO_CHECK =
  'Name what to check with --commit, --range, or --repo and --base.'

const optionsSchema = z
  .object({
    commit: z.array(z.string().trim().min(1)).default([]),
    range: z.array(z.string().trim().min(1)).default([]),
    signedOff: z.boolean().default(false),
    repo: z
      .string()
      .trim()
      .regex(/^[\w.-]+$/, 'Give --repo as a folder name under repos/.')
      .optional(),
    base: z.string().trim().min(1).optional()
  })
  .superRefine((options, context) => {
    const complain = (message) => context.addIssue({ code: 'custom', message })
    if ((options.repo === undefined) !== (options.base === undefined)) {
      complain('Give --repo and --base together.')
      return
    }
    const namesChanges = options.commit.length + options.range.length > 0
    if (!options.signedOff) {
      if (options.repo !== undefined) {
        complain('--repo and --base work with --signed-off only.')
      } else if (!namesChanges) {
        complain(NAME_THE_CHANGES)
      }
      return
    }
    if (!namesChanges && options.repo === undefined) {
      complain(NAME_WHAT_TO_CHECK)
    }
  })

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const collect = (value, previous = []) => [...previous, value]

const SHORT_SHA_LENGTH = 12

const scenarioLine = ({ change, id, capability, name, coverage }) =>
  `  ${change.padEnd(8)} ${(id ?? '(no id)').padEnd(24)} ${capability.padEnd(40)} ${name}${coverage ? ` [${coverage}]` : ''}`

const changeLines = (label, scenarios) => [
  `${label}: ${scenarios.length === 0 ? 'no scenario changed' : `${scenarios.length} scenario(s)`}`,
  ...scenarios.map(scenarioLine)
]

const skippedLines = (skipped) =>
  skipped.map(({ reason }) => `Skipped: ${reason}.`)

/**
 * The plain-text report of `tim spec diff`.
 *
 * @param {{commits: object[], ranges?: object[], skipped: {commit: string, reason: string}[]}} result
 * @returns {string}
 */
export const renderSpecDiffText = ({ commits, ranges = [], skipped }) =>
  [
    ...commits.flatMap(({ sha, scenarios }) =>
      changeLines(sha.slice(0, SHORT_SHA_LENGTH), scenarios)
    ),
    ...ranges.flatMap(({ range, scenarios }) => changeLines(range, scenarios)),
    ...skippedLines(skipped)
  ].join('\n')

const signedOffLines = ({ change, id, capability, name, why }) => [
  `  ${change.padEnd(12)} ${(id ?? '(no id)').padEnd(24)} ${capability.padEnd(40)} ${name}`,
  `    ${why}`
]

const ticketDraftLines = (ticketDraft) =>
  ticketDraft
    ? ['', 'Ticket draft:', ticketDraft.summary, '', ticketDraft.description]
    : []

/**
 * The plain-text report of `tim spec diff --signed-off`.
 *
 * @param {{signedOff: object[], skipped: {commit: string, reason: string}[], ticketDraft: object|null}} result
 * @returns {string}
 */
export const renderSignedOffText = ({ signedOff, skipped, ticketDraft }) =>
  [
    signedOff.length === 0
      ? 'No signed-off scenario changes.'
      : `${signedOff.length} change(s) to signed-off scenarios need a person to approve or refuse them:`,
    ...signedOff.flatMap(signedOffLines),
    ...skippedLines(skipped),
    ...ticketDraftLines(ticketDraft)
  ].join('\n')

const runDiff = ({ workspaceRoot }, parsed) =>
  parsed.signedOff
    ? diffSignedOff({
        workspaceRoot,
        commits: parsed.commit,
        ranges: parsed.range,
        repo: parsed.repo,
        base: parsed.base
      })
    : diffSpecCommits({
        workspaceRoot,
        commits: parsed.commit,
        ranges: parsed.range
      })

const renderDiffText = (result) =>
  result.signedOff === undefined
    ? renderSpecDiffText(result)
    : renderSignedOffText(result)

const exitCodeForDiff = (result) =>
  result.signedOff?.length > 0 ? SIGNED_OFF_CHANGED : OK

export const register = (program, { timVersion }) => {
  program
    .command('diff')
    .description(
      "Say what each commit or range changed in the Behaviour Spec, scenario by scenario: added, changed (name or steps), removed, or coverage (only its coverage.json entry changed), with each scenario's coverage after. A commit compares with its first parent, base..head from base to head, and base...head from their merge base. Reads the workspace repo's local git only: fetch first. A commit or range it cannot find is listed under skipped. result.touched is every scenario id they added, changed or re-proved. Exits 0 whatever it finds. With --signed-off it reports only changes to signed-off scenarios in result.signedOff, with result.ticketDraft for a person to approve or refuse them, and exits 3 when it finds any."
    )
    .option(
      '--commit <sha>',
      'A commit in the workspace repo; repeat for several',
      collect
    )
    .option(
      '--range <base..head>',
      'A range in the workspace repo, such as main..HEAD or main...HEAD; repeat for several',
      collect
    )
    .option(
      '--signed-off',
      'Report only changes to signed-off scenarios: added already signed off, name or steps changed, removed, or the Signed off mark removed. Exits 3 when it finds any, 0 when it finds none'
    )
    .option(
      '--repo <name>',
      "With --signed-off and --base: a repo under repos/. Reports each signed-off scenario in the workspace's openspec/ whose linked test in that repo is edited or deleted"
    )
    .option(
      '--base <ref>',
      'With --repo: the ref in that repo to compare its files with, committed and uncommitted, such as origin/main'
    )
    .addHelpText(
      'after',
      '\nExit codes with --signed-off: 0 nothing found, 3 a signed-off scenario changes, 2 a usage error.\n' +
        '\nExamples:\n' +
        '  tim spec diff --commit 575f5f3c --json\n' +
        '  tim spec diff --commit e310d0af --commit 72fb2eda\n' +
        '  tim spec diff --range main...HEAD --signed-off\n' +
        '  tim spec diff --signed-off --range origin/main...HEAD --repo trade-imports-plants-frontend --base origin/main --json'
    )
    .action(
      makeSpecAction({
        parseOptions,
        run: runDiff,
        renderText: renderDiffText,
        exitCodeForResult: exitCodeForDiff,
        timVersion
      })
    )
}
