import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import { runSpecLint } from '../../spec/lint.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z.object({
  capability: z.string().trim().min(1).optional(),
  root: z.string().trim().min(1).optional()
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`

/**
 * The plain-text report of `tim spec lint`.
 *
 * @param {{specRoot: string, capabilityCount: number, findings: object[], skipped: object[]}} result
 * @returns {string}
 */
export const renderLintText = ({
  specRoot,
  capabilityCount,
  findings,
  skipped
}) =>
  [
    `${plural(findings.length, 'finding')} across ${plural(capabilityCount, 'capability', 'capabilities')} under ${specRoot}.`,
    ...findings.map(
      (finding) =>
        `  ${finding.check.padEnd(16)} ${finding.capability.padEnd(40)} ${finding.message}`
    ),
    `Skipped: ${skipped.map((entry) => `${entry.check} (${entry.reason})`).join('; ')}`
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('lint')
    .description(
      "Validate the Behaviour Spec's coverage.json binding and spec.md conventions. Exits non-zero on any finding."
    )
    .option(
      '--capability <path>',
      'Scope to one capability and its descendants, e.g. live-animals/addresses'
    )
    .option(
      '--root <checkout>',
      'Validate a different checkout instead of the workspace root — journey-builder writes into a worktree'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim spec lint --json\n' +
        '  tim spec lint --capability live-animals/addresses\n' +
        '  tim spec lint --root workareas/journey-builder/run-1/workspace-worktree'
    )
    .action(async function lintAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(opts)
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = await runSpecLint({ workspaceRoot, ...parsed })
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderLintText(result)
        )
        process.exit(result.findings.length > 0 ? ERROR : OK)
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
