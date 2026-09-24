import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import { computeSpecGaps } from '../../spec/gaps.js'
import { renderStalenessLine } from '../../spec/status.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z
  .object({
    none: z.boolean().optional().default(false),
    partial: z.boolean().optional().default(false),
    unitOnly: z.boolean().optional().default(false),
    scenario: z.string().trim().min(1).optional(),
    capability: z.string().trim().min(1).optional()
  })
  .superRefine((opts, ctx) => {
    const narrowing = opts.none || opts.partial
    if (opts.unitOnly && opts.scenario) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '--unit-only and --scenario cannot both be given.'
      })
    }
    if (narrowing && opts.scenario) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          '--none/--partial narrow the gap list; --scenario replaces it. Use one or the other.'
      })
    }
    if (narrowing && opts.unitOnly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          '--none/--partial narrow the gap list; --unit-only replaces it. Use one or the other.'
      })
    }
  })

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const header = (staleness) =>
  staleness
    ? renderStalenessLine(staleness)
    : 'No openspec/baseline.json — staleness unknown.'

const gapLine = (row) =>
  `  ${row.coverage.padEnd(8)} ${row.ids.join(' + ').padEnd(32)} ${row.capabilities.join(', ').padEnd(40)} ${row.name}\n` +
  row.notes.map((note) => `    ${note}`).join('\n')

const renderGapsText = (result) =>
  [
    header(result.staleness),
    `${result.noneCount} none, ${result.partialCount} partial, of ${result.scenarioCount} scenarios in scope.`,
    ...result.rows.map(gapLine)
  ].join('\n')

const unitOnlyLine = (row) =>
  `  ${row.id.padEnd(32)} ${row.capability.padEnd(40)} ${row.name}`

const renderUnitOnlyText = (result) =>
  [
    header(result.staleness),
    `${result.unitOnly.length} scenario${result.unitOnly.length === 1 ? '' : 's'} whose only full witness is a unit test.`,
    ...result.unitOnly.map(unitOnlyLine)
  ].join('\n')

const renderScenarioText = (result) =>
  [header(result.staleness), JSON.stringify(result.scenario, null, 2)].join(
    '\n'
  )

const renderGapsResult = (result) => {
  if (result.scenario) return renderScenarioText(result)
  if (result.unitOnly) return renderUnitOnlyText(result)
  return renderGapsText(result)
}

export const register = (program, { timVersion }) => {
  program
    .command('gaps')
    .description(
      'Every scenario the coverage matrix records as not full — clustered, risk-ordered, under a staleness header'
    )
    .option(
      '--none',
      'Narrow to coverage none (unions with --partial; omit both for all gaps)'
    )
    .option(
      '--partial',
      'Narrow to coverage partial (unions with --none; omit both for all gaps)'
    )
    .option(
      '--unit-only',
      'Replace the gap list: scenarios whose only full witness is a unit test (not a gap)'
    )
    .option(
      '--scenario <id>',
      'Replace the gap list: look up one scenario by id, whatever its coverage state'
    )
    .option(
      '--capability <path>',
      'Scope to one capability and its descendants'
    )
    .addHelpText(
      'after',
      '\nNarrowing (--none / --partial):\n' +
        '  Name either to keep that coverage; name both (or neither) for every\n' +
        '  non-full row. Same grammar as tim spec lint group flags.\n' +
        '\nReplacing the list (--unit-only / --scenario):\n' +
        '  These are not filters on the gap set — they swap in a different\n' +
        '  listing. Cannot combine with --none/--partial or each other.\n' +
        '\nExamples:\n' +
        '  tim spec gaps --json\n' +
        '  tim spec gaps --none\n' +
        '  tim spec gaps --unit-only\n' +
        '  tim spec gaps --scenario SCN-ADDR-004-A'
    )
    .action(async function gapsAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(opts)
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = await computeSpecGaps({ workspaceRoot, ...parsed })
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderGapsResult(result)
        )
        process.exit(OK)
      } catch (error) {
        if (globalOpts.json) {
          emit(
            JSON.stringify(
              jsonEnvelope({
                ok: false,
                error: errorPayloadFor(error),
                timVersion
              })
            )
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(exitCodeFor(error))
      }
    })
}
