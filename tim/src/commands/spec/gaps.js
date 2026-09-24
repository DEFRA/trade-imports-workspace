import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import { computeSpecGaps } from '../../spec/gaps.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z.object({
  none: z.boolean().optional().default(false),
  partial: z.boolean().optional().default(false),
  capability: z.string().trim().min(1).optional()
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const gapLine = (row) =>
  `  ${row.coverage.padEnd(8)} ${row.id.padEnd(24)} ${row.capability.padEnd(40)} ${row.name}` +
  (row.notes ? `\n    ${row.notes}` : '')

/**
 * The plain-text report of `tim spec gaps`.
 *
 * @param {{noneCount: number, partialCount: number, scenarioCount: number, rows: object[]}} result
 * @returns {string}
 */
export const renderGapsText = (result) =>
  [
    `${result.noneCount} none, ${result.partialCount} partial, of ${result.scenarioCount} scenarios in scope.`,
    ...result.rows.map(gapLine)
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('gaps')
    .description(
      'Every scenario the coverage matrix records as not full — none and partial, risk-ordered'
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
      '--capability <path>',
      'Scope to one capability and its descendants'
    )
    .addHelpText(
      'after',
      '\nName either to keep that coverage; name both (or neither) for every\n' +
        'non-full row. Same grammar as tim spec lint group flags.\n' +
        '\nExamples:\n' +
        '  tim spec gaps --json\n' +
        '  tim spec gaps --none\n' +
        '  tim spec gaps --capability live-animals/addresses'
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
            : renderGapsText(result)
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
