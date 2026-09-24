import { z } from 'zod'
import { relative } from 'node:path'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import {
  resolveRun,
  loadFindings,
  listFindings,
  countFindings,
  ruleFinding,
  markApplied,
  ruleBucket,
  writeReport,
  DISPOSITIONS
} from '../../spec/findings.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const runSchema = z.object({
  run: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'A run date looks like 2026-09-24.')
    .optional()
})

const parseRun = (opts) => {
  const result = runSchema.safeParse({ run: opts.run })
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const dispositionFrom = ({ accept, reject, edit, defer }) => {
  const chosen = DISPOSITIONS.filter(
    (name) => ({ accept, reject, edit, defer })[name]
  )
  if (chosen.length === 0) {
    throw new TimError(
      'USAGE',
      'Say what was decided: --accept, --reject, --edit or --defer.'
    )
  }
  if (chosen.length > 1) {
    throw new TimError(
      'USAGE',
      `Pick one ruling, not ${chosen.length}: ${chosen.join(', ')}.`
    )
  }
  return chosen[0]
}

const rulingOf = (entry) =>
  entry.disposition ? `${entry.disposition}/${entry.status}` : entry.status

/**
 * One line per finding, in walk order.
 *
 * @param {object[]} findings
 * @returns {string}
 */
export const renderFindingsList = (findings) =>
  findings.length === 0
    ? 'No findings.'
    : findings
        .map(
          (finding) =>
            `${finding.id}  ${finding.verdict.padEnd(11)} ${rulingOf(finding).padEnd(18)} ${finding.capability}${finding.anchor ? ` ${finding.anchor}` : ''}`
        )
        .join('\n')

/**
 * @param {object} counts - From countFindings
 * @returns {string}
 */
export const renderFindingsCounts = (counts) =>
  [
    `${counts.total} findings, ${counts.open} still open.`,
    ...Object.entries(counts.byVerdict).map(
      ([verdict, count]) => `  ${verdict.padEnd(11)} ${count}`
    ),
    counts.bucketOpen
      ? 'The NO ACTION bucket is not yet ruled.'
      : 'The NO ACTION bucket is ruled.',
    counts.allRuled
      ? 'Everything is ruled — the baseline can be advanced.'
      : 'Not everything is ruled — do not advance the baseline yet.'
  ].join('\n')

const action = (handler) =>
  async function findingsAction(...args) {
    const command = args.at(-1)
    const globalOpts = command.optsWithGlobals()
    try {
      const workspaceRoot = resolveWorkspaceRoot({
        explicit: globalOpts.workspace
      })
      const result = await handler({ workspaceRoot, args, command })
      emit(
        globalOpts.json
          ? JSON.stringify(
              jsonEnvelope({
                ok: true,
                result: result.json,
                timVersion: globalOpts.timVersion
              })
            )
          : result.text
      )
      process.exit(OK)
    } catch (error) {
      if (globalOpts.json) {
        emit(
          JSON.stringify(
            jsonEnvelope({
              ok: false,
              error: errorPayloadFor(error),
              timVersion: globalOpts.timVersion
            })
          )
        )
      } else {
        emitError(error.message ?? String(error))
      }
      process.exit(exitCodeFor(error))
    }
  }

const RUN_OPTION = [
  '--run <date>',
  'Act on one run, e.g. 2026-09-24. Defaults to the most recent'
]

export const register = (spec, { timVersion }) => {
  const findings = spec
    .command('findings')
    .description(
      "A spec-catchup run's findings — list them, record what was decided, and re-render the report"
    )
    .hook('preSubcommand', (thisCommand) => {
      thisCommand.setOptionValue('timVersion', timVersion)
    })

  findings
    .command('list')
    .description('Every finding in walk order, with what was decided')
    .option(...RUN_OPTION)
    .option('--pending', 'Only the findings nobody has ruled yet')
    .addHelpText(
      'after',
      '\nExamples:\n  tim spec findings list --pending\n  tim spec findings list --run 2026-09-24 --json'
    )
    .action(
      action(({ workspaceRoot, command }) => {
        const opts = command.opts()
        const runDir = resolveRun({ workspaceRoot, ...parseRun(opts) })
        const data = loadFindings(runDir)
        const rows = listFindings(data, Boolean(opts.pending))
        return {
          json: { run: relative(workspaceRoot, runDir), findings: rows },
          text: renderFindingsList(rows)
        }
      })
    )

  findings
    .command('counts')
    .description('How many findings there are, and how many are still open')
    .option(...RUN_OPTION)
    .addHelpText('after', '\nExample: tim spec findings counts --json')
    .action(
      action(({ workspaceRoot, command }) => {
        const runDir = resolveRun({
          workspaceRoot,
          ...parseRun(command.opts())
        })
        const counts = countFindings(loadFindings(runDir))
        return {
          json: { run: relative(workspaceRoot, runDir), ...counts },
          text: renderFindingsCounts(counts)
        }
      })
    )

  findings
    .command('rule <id>')
    .description(
      'Record what a person decided about one finding — the walker calls this per item'
    )
    .option(...RUN_OPTION)
    .option('--accept', 'Apply this finding')
    .option('--reject', 'The judge was wrong')
    .option('--edit', 'Right direction, different wording — then apply')
    .option('--defer', 'Leave it for a later walk')
    .option('--note <text>', 'One line on why')
    .addHelpText(
      'after',
      '\nExamples:\n  tim spec findings rule F-001 --accept\n  tim spec findings rule F-003 --reject --note "the scenario already covers this"'
    )
    .action(
      action(({ workspaceRoot, args, command }) => {
        const [id] = args
        const opts = command.opts()
        const runDir = resolveRun({ workspaceRoot, ...parseRun(opts) })
        const finding = ruleFinding({
          runDir,
          id,
          disposition: dispositionFrom(opts),
          note: opts.note
        })
        writeReport(runDir)
        return {
          json: finding,
          text: `${finding.id} is ${finding.disposition} — ${finding.status}.`
        }
      })
    )

  findings
    .command('applied <id>')
    .description(
      'Mark an accepted finding as applied — the change is on disk. Refuses unless a person accepted it'
    )
    .option(...RUN_OPTION)
    .addHelpText('after', '\nExample: tim spec findings applied F-001')
    .action(
      action(({ workspaceRoot, args, command }) => {
        const [id] = args
        const runDir = resolveRun({
          workspaceRoot,
          ...parseRun(command.opts())
        })
        const finding = markApplied({ runDir, id })
        writeReport(runDir)
        return { json: finding, text: `${finding.id} is applied.` }
      })
    )

  findings
    .command('rule-bucket')
    .description(
      'Record what a person decided about the NO ACTION bucket, which is ruled once rather than per capability'
    )
    .option(...RUN_OPTION)
    .option('--accept', 'Accept the judge for every capability in the bucket')
    .option('--reject', 'Do not accept it')
    .option('--defer', 'Leave it for a later walk')
    .addHelpText('after', '\nExample: tim spec findings rule-bucket --accept')
    .action(
      action(({ workspaceRoot, command }) => {
        const opts = command.opts()
        const runDir = resolveRun({ workspaceRoot, ...parseRun(opts) })
        const bucket = ruleBucket({
          runDir,
          disposition: dispositionFrom(opts)
        })
        writeReport(runDir)
        return {
          json: bucket,
          text: `The NO ACTION bucket is ${bucket.disposition} — ${bucket.status}.`
        }
      })
    )

  findings
    .command('render')
    .description('Rewrite report.md from findings.json')
    .option(...RUN_OPTION)
    .addHelpText('after', '\nExample: tim spec findings render')
    .action(
      action(({ workspaceRoot, command }) => {
        const runDir = resolveRun({
          workspaceRoot,
          ...parseRun(command.opts())
        })
        const path = writeReport(runDir)
        return {
          json: { report: relative(workspaceRoot, path) },
          text: `Wrote ${relative(workspaceRoot, path)}.`
        }
      })
    )
}
