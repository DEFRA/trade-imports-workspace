import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import { computeSpecCandidates } from '../../spec/candidates.js'
import { renderStalenessLine } from '../../spec/status.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z.object({
  wide: z.boolean().optional().default(false),
  capability: z.string().trim().min(1).optional()
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const packetLine = (packet) =>
  `  ${String(packet.linkCount).padStart(3)} links  ${packet.capability}` +
  (packet.coverageUpdatedSinceBaseline
    ? ''
    : '  — coverage.json not touched since baseline') +
  (packet.wide ? '  (--wide: a sibling file changed too)' : '')

const commitLogSection = (commitLog) =>
  Object.entries(commitLog).flatMap(([repo, commits]) => [
    `  ${repo}:`,
    ...commits.map((line) => `    ${line}`)
  ])

/**
 * The plain-text report of `tim spec candidates`.
 *
 * @param {object} result
 * @returns {string}
 */
export const renderCandidatesText = (result) =>
  [
    result.staleness
      ? renderStalenessLine(result.staleness)
      : 'No openspec/baseline.json — nothing to compare against.',
    `${result.workPackets.length} work packet${result.workPackets.length === 1 ? '' : 's'}:`,
    ...result.workPackets.map(packetLine),
    `${result.unresolvedLinks.length} unresolved link${result.unresolvedLinks.length === 1 ? '' : 's'} from tim spec lint.`,
    `${result.knownGaps.length} known gap${result.knownGaps.length === 1 ? '' : 's'} from tim spec gaps (context — not this sweep's job).`,
    'Commit log:',
    ...commitLogSection(result.commitLog)
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('candidates')
    .description(
      "What the next sweep should look at: linked test files changed since the baseline, grouped into work packets, plus lint's unresolved list and gaps' known holes as context"
    )
    .option(
      '--wide',
      'Also flag a capability whose linked file directory changed, even where the linked file itself did not — more candidates, lower precision'
    )
    .option(
      '--capability <path>',
      'Scope to one capability and its descendants'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim spec candidates --json\n' +
        '  tim spec candidates --wide'
    )
    .action(async function candidatesAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(opts)
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = await computeSpecCandidates({ workspaceRoot, ...parsed })
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderCandidatesText(result)
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
