import { z } from 'zod'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { runSpecLint, CHECK_GROUPS } from '../../spec/lint.js'
import { makeSpecAction } from './shared.js'

const optionsSchema = z.object({
  capability: z.string().trim().min(1).optional(),
  root: z.string().trim().min(1).optional(),
  specs: z.boolean().optional(),
  coverage: z.boolean().optional(),
  binding: z.boolean().optional()
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * Which check groups to run. Naming any group narrows to those; naming
 * none runs all three.
 *
 * @param {object} opts - The parsed command options
 * @returns {string[]} A subset of CHECK_GROUPS, in CHECK_GROUPS order
 */
export const groupsFrom = (opts) => {
  const named = CHECK_GROUPS.filter((group) => opts[group])
  return named.length > 0 ? named : CHECK_GROUPS
}

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`

const skippedLine = (entry) =>
  entry.repo
    ? `${entry.check} ${entry.repo}: ${entry.reason}`
    : `${entry.check}: ${entry.reason}`

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
    .addHelpText(
      'after',
      '\nCheck groups, named for what each one reads:\n' +
        '  specs     spec.md conventions — stable IDs, MUST not SHALL, a THEN per scenario, live cross-references\n' +
        '  coverage  coverage.json internals — shape, both rollups, notes on a none, areaCode, specFile\n' +
        '  binding   the joins — a coverage.json per spec.md, ID parity, names verbatim\n' +
        '\nNaming any group narrows to those. Naming none runs all three.\n' +
        'Whatever does not run is listed as not selected, so a narrow pass never reads like a full one.\n' +
        '\nExamples:\n' +
        '  tim spec lint --json\n' +
        '  tim spec lint --specs --coverage\n' +
        '  tim spec lint --capability live-animals/addresses\n' +
        '  tim spec lint --root workareas/journey-builder/run-1/workspace-worktree'
    )
    .action(
      makeSpecAction({
        parseOptions,
        run: ({ workspaceRoot }, parsed) =>
          runSpecLint({
            workspaceRoot,
            capability: parsed.capability,
            root: parsed.root,
            groups: groupsFrom(parsed)
          }),
        renderText: renderLintText,
        exitCodeForResult: (result) =>
          result.findings.length > 0 ? ERROR : OK,
        timVersion
      })
    )
}
