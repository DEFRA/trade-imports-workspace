import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import { computeE2eOverlap } from '../../spec/e2e-overlap.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z.object({
  capability: z.string().trim().min(1).optional()
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const rowLine = (row) =>
  `  ${row.repo.padEnd(28)} ${row.file.padEnd(50)} ${row.test}`

/**
 * The plain-text report of `tim spec e2e-overlap`.
 *
 * @param {object} result
 * @returns {string}
 */
export const renderE2eOverlapText = (result) =>
  [
    result.guidance,
    '',
    `${result.overlappingCount} of ${result.totalDistinctE2eTests} distinct e2e tests are fully overlapped — a shortlist for judgement, not a delete list:`,
    ...result.overlapping.map(rowLine)
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('e2e-overlap')
    .description(
      'E2E tests whose every witnessed scenario also has a full-strength fit or unit witness — a shortlist for judgement, not a delete list'
    )
    .option(
      '--capability <path>',
      'Scope to one capability and its descendants'
    )
    .addHelpText('after', '\nExample:\n  tim spec e2e-overlap --json')
    .action(async function e2eOverlapAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(opts)
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = computeE2eOverlap({ workspaceRoot, ...parsed })
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderE2eOverlapText(result)
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
