import { z } from 'zod'
import { readFileSync } from 'node:fs'
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
  createRun,
  SKILLS,
  DEFAULT_SKILL,
  DISPOSITIONS
} from '../../spec/findings.js'
import { loadBaseline } from '../../spec/status.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const runSchema = z.object({
  run: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'A run date looks like 2026-09-24.')
    .optional()
})

const skillSchema = z.object({
  skill: z.enum(Object.keys(SKILLS)).default(DEFAULT_SKILL)
})

const parseRun = (opts) => {
  const result = runSchema.safeParse({ run: opts.run })
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const parseSkill = (opts) => {
  const result = skillSchema.safeParse({
    skill: opts.skill ?? DEFAULT_SKILL
  })
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data.skill
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
    `${counts.total} findings, ${counts.open} still open${counts.unapplied ? `, ${counts.unapplied} accepted but not applied` : ''}.`,
    ...Object.entries(counts.byVerdict).map(
      ([verdict, count]) => `  ${verdict.padEnd(11)} ${count}`
    ),
    counts.bucketOpen
      ? 'The NO ACTION bucket is not yet ruled.'
      : 'The NO ACTION bucket is ruled (or empty).',
    counts.allRuled
      ? 'Everything is ruled and applied — the baseline can be advanced (catch-up only).'
      : 'Not everything is settled — keep walking.'
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

const SKILL_OPTION = [
  '--skill <name>',
  `catchup or cover (default ${DEFAULT_SKILL})`
]

export const register = (spec, { timVersion }) => {
  const findings = spec
    .command('findings')
    .description(
      "A catch-up or cover run's findings — seed them, walk rulings, mark applied, re-render the report"
    )
    .hook('preSubcommand', (thisCommand) => {
      thisCommand.setOptionValue('timVersion', timVersion)
    })

  findings
    .command('seed')
    .description(
      'Create a run from a findings JSON file (skill writes the file, then seeds)'
    )
    .requiredOption('--file <path>', 'Path to a findings payload JSON')
    .option(...SKILL_OPTION)
    .option(
      '--date <date>',
      'Run date YYYY-MM-DD (default: today, or the date field in the file)'
    )
    .option(
      '--force',
      'Overwrite a run that already has rulings (default: refuse)'
    )
    .addHelpText(
      'after',
      '\nExample:\n  tim spec findings seed --skill catchup --file /tmp/findings-payload.json'
    )
    .action(
      action(({ workspaceRoot, command }) => {
        const opts = command.opts()
        const skill = parseSkill(opts)
        let payload
        try {
          payload = JSON.parse(readFileSync(opts.file, 'utf8'))
        } catch (error) {
          throw new TimError(
            'PARSE',
            `Can't read ${opts.file}: ${error.message}`,
            error
          )
        }
        const baseline =
          payload.baseline ??
          (() => {
            const current = loadBaseline(workspaceRoot)
            return {
              verifiedAt: current.verifiedAt,
              verifiedBy: current.verifiedBy
            }
          })()
        const date =
          opts.date ??
          payload.date ??
          new Date().toISOString().slice(0, 10)
        const { runDir, data, reportPath } = createRun({
          workspaceRoot,
          skill,
          date,
          baseline,
          findings: payload.findings ?? [],
          noActionBucket: payload.noActionBucket,
          force: Boolean(opts.force)
        })
        return {
          json: {
            run: relative(workspaceRoot, runDir),
            report: relative(workspaceRoot, reportPath),
            counts: countFindings(data)
          },
          text: `Seeded ${relative(workspaceRoot, runDir)} (${data.findings.length} findings). Report: ${relative(workspaceRoot, reportPath)}.`
        }
      })
    )

  findings
    .command('list')
    .description('Every finding in walk order, with what was decided')
    .option(...RUN_OPTION)
    .option(...SKILL_OPTION)
    .option('--pending', 'Only the findings nobody has ruled yet')
    .addHelpText(
      'after',
      '\nExamples:\n  tim spec findings list --pending\n  tim spec findings list --skill cover --run 2026-09-24 --json'
    )
    .action(
      action(({ workspaceRoot, command }) => {
        const opts = command.opts()
        const skill = parseSkill(opts)
        const runDir = resolveRun({
          workspaceRoot,
          skill,
          ...parseRun(opts)
        })
        const data = loadFindings(runDir, skill)
        const rows = listFindings(data, Boolean(opts.pending))
        return {
          json: {
            skill,
            run: relative(workspaceRoot, runDir),
            findings: rows
          },
          text: renderFindingsList(rows)
        }
      })
    )

  findings
    .command('counts')
    .description('How many findings there are, and how many are still open')
    .option(...RUN_OPTION)
    .option(...SKILL_OPTION)
    .addHelpText('after', '\nExample: tim spec findings counts --json')
    .action(
      action(({ workspaceRoot, command }) => {
        const opts = command.opts()
        const skill = parseSkill(opts)
        const runDir = resolveRun({
          workspaceRoot,
          skill,
          ...parseRun(opts)
        })
        const counts = countFindings(loadFindings(runDir, skill))
        return {
          json: { skill, run: relative(workspaceRoot, runDir), ...counts },
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
    .option(...SKILL_OPTION)
    .option('--accept', "Accept the judge's finding (does not apply the edit yet)")
    .option('--reject', 'The judge was wrong')
    .option('--edit', 'Right direction, different wording — then apply')
    .option('--defer', 'Leave it for a later walk')
    .option('--note <text>', 'One line on why')
    .addHelpText(
      'after',
      '\nExamples:\n  tim spec findings rule F-001 --accept\n  tim spec findings rule F-003 --reject --note "the scenario already covers this"\n  tim spec findings applied F-001'
    )
    .action(
      action(({ workspaceRoot, args, command }) => {
        const [id] = args
        const opts = command.opts()
        const skill = parseSkill(opts)
        const runDir = resolveRun({
          workspaceRoot,
          skill,
          ...parseRun(opts)
        })
        const finding = ruleFinding({
          runDir,
          id,
          disposition: dispositionFrom(opts),
          note: opts.note,
          skill
        })
        writeReport(runDir, skill)
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
    .option(...SKILL_OPTION)
    .addHelpText('after', '\nExample: tim spec findings applied F-001')
    .action(
      action(({ workspaceRoot, args, command }) => {
        const [id] = args
        const opts = command.opts()
        const skill = parseSkill(opts)
        const runDir = resolveRun({
          workspaceRoot,
          skill,
          ...parseRun(opts)
        })
        const finding = markApplied({ runDir, id, skill })
        writeReport(runDir, skill)
        return { json: finding, text: `${finding.id} is applied.` }
      })
    )

  findings
    .command('rule-bucket')
    .description(
      'Record what a person decided about the NO ACTION bucket (catch-up only)'
    )
    .option(...RUN_OPTION)
    .option(...SKILL_OPTION)
    .option('--accept', 'Accept the judge for every capability in the bucket')
    .option('--reject', 'Do not accept it')
    .option('--defer', 'Leave it for a later walk')
    .addHelpText('after', '\nExample: tim spec findings rule-bucket --accept')
    .action(
      action(({ workspaceRoot, command }) => {
        const opts = command.opts()
        const skill = parseSkill(opts)
        if (skill !== 'catchup') {
          throw new TimError(
            'USAGE',
            'The NO ACTION bucket is only for catch-up runs.'
          )
        }
        const runDir = resolveRun({
          workspaceRoot,
          skill,
          ...parseRun(opts)
        })
        const bucket = ruleBucket({
          runDir,
          disposition: dispositionFrom(opts),
          skill
        })
        writeReport(runDir, skill)
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
    .option(...SKILL_OPTION)
    .addHelpText('after', '\nExample: tim spec findings render')
    .action(
      action(({ workspaceRoot, command }) => {
        const opts = command.opts()
        const skill = parseSkill(opts)
        const runDir = resolveRun({
          workspaceRoot,
          skill,
          ...parseRun(opts)
        })
        const path = writeReport(runDir, skill)
        return {
          json: { report: relative(workspaceRoot, path) },
          text: `Wrote ${relative(workspaceRoot, path)}.`
        }
      })
    )
}
