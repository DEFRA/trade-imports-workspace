import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import { runSpecLint, CHECK_GROUPS } from '../../spec/lint.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z.object({
  capability: z.string().trim().min(1).optional(),
  root: z.string().trim().min(1).optional(),
  specs: z.boolean().optional(),
  coverage: z.boolean().optional(),
  binding: z.boolean().optional(),
  links: z.boolean().optional(),
  skipLinks: z.boolean().optional()
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  if (result.data.links && result.data.skipLinks) {
    throw new TimError('USAGE', 'Use either --links or --skip-links, not both.')
  }
  return result.data
}

/**
 * Which check groups to run. Naming any group narrows to those; naming
 * none runs all four. `--skip-links` is shorthand for the three that read
 * no repos, so it is the fast full check.
 *
 * @param {object} opts - The parsed command options
 * @returns {string[]} A subset of CHECK_GROUPS, in CHECK_GROUPS order
 */
export const groupsFrom = (opts) => {
  const named = CHECK_GROUPS.filter((group) => opts[group])
  if (named.length > 0) return named
  return opts.skipLinks
    ? CHECK_GROUPS.filter((group) => group !== 'links')
    : CHECK_GROUPS
}

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`

/**
 * The plain-text report of `tim spec lint`.
 *
 * @param {{specRoot: string, capabilityCount: number, findings: object[], skipped: object[]}} result
 * @returns {string}
 */
const skippedLine = (entry) =>
  entry.repo
    ? `${entry.check} ${entry.repo}: ${entry.reason}`
    : `${entry.check}: ${entry.reason}`

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
    skipped.length > 0
      ? `Skipped: ${skipped.map(skippedLine).join('; ')}`
      : 'Skipped: none.'
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
    .option('--specs', "Check spec.md's own conventions only")
    .option('--coverage', "Check coverage.json's internals only")
    .option(
      '--binding',
      'Check the joins between spec.md and coverage.json only'
    )
    .option(
      '--links',
      'Check that every coverage link names a real test only — reads the repos, and by far the slowest group'
    )
    .option(
      '--skip-links',
      'Run every group except the link checks — the fast full check'
    )
    .addHelpText(
      'after',
      '\nCheck groups, named for what each one reads:\n' +
        '  specs     spec.md conventions — stable IDs, MUST not SHALL, a THEN per scenario, live cross-references\n' +
        '  coverage  coverage.json internals — shape, both rollups, notes on a none, areaCode, specFile\n' +
        '  binding   the joins — a coverage.json per spec.md, ID parity, names verbatim\n' +
        '  links     every link names a real test — the only group that reads repos/, and the only slow one\n' +
        '\nNaming any group narrows to those. Naming none runs all four.\n' +
        'Whatever does not run is listed as not selected, so a narrow pass never reads like a full one.\n' +
        '\nExamples:\n' +
        '  tim spec lint --json\n' +
        '  tim spec lint --skip-links\n' +
        '  tim spec lint --specs --coverage\n' +
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
        const result = await runSpecLint({
          workspaceRoot,
          capability: parsed.capability,
          root: parsed.root,
          groups: groupsFrom(parsed)
        })
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
