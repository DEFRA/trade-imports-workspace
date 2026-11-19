import { z } from 'zod'
import { zodOptionsParser } from '../_parse-options.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { loadDependencySets } from '../../deps/dependency-sets.js'
import { mergePolicyFor } from '../../deps/policy.js'
import { makeRunAction } from '../_run-action.js'

const optionsSchema = z.object({
  from: z.string({ error: 'Give the current version with --from.' }).min(1),
  to: z.string({ error: 'Give the target version with --to.' }).min(1),
  repo: z.string().min(1).optional(),
  workspace: z.string().optional()
})

const parseOptions = zodOptionsParser(optionsSchema)

/**
 * The plain-text report of `tim deps policy`.
 *
 * @param {{package: string, from: string, to: string, jump: string, set: string|null, policy: string, reason: string}} result
 * @returns {string}
 */
export const renderPolicyText = ({
  package: packageName,
  from,
  to,
  jump,
  set,
  policy,
  reason
}) =>
  [
    `${packageName} ${from} to ${to}: ${policy}`,
    `Upgrade: ${jump}`,
    `Set: ${set ?? 'none'}`,
    reason
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('policy <package>')
    .description(
      'Say whether moving a package from one version to another can merge on green CI (ci-is-enough), needs every changelog item checked (changelog-driven) or must not happen because a hold covers the version (held), from config/dependency-sets.json.'
    )
    .option('--from <version>', 'The version the repo has now')
    .option('--to <version>', 'The version to move to')
    .option(
      '--repo <name>',
      'Count only the holds that cover this repo. Without it, every hold on the package counts.'
    )
    .addHelpText(
      'after',
      '\nA version a hold covers is held: do not move to it. Otherwise a prerelease target and a 0.x minor are changelog-driven, a major takes the policy for majors, and anything else takes the policy of the set the package is in, or ci-is-enough when it is in none.\n' +
        '\nExamples:\n' +
        '  tim deps policy vitest --from 4.1.0 --to 4.2.0\n' +
        '  tim deps policy govuk-frontend --from 6.5.0 --to 6.6.0 --json\n' +
        '  tim deps policy @axe-core/playwright --from 4.13.0 --to 4.14.0 --repo trade-imports-animals-frontend'
    )
    .action(
      makeRunAction({
        parseOptions,
        run: async ({ args: [packageName] }, { from, to, repo, workspace }) =>
          mergePolicyFor({
            dependencySets: loadDependencySets(
              resolveWorkspaceRoot({ explicit: workspace })
            ),
            packageName,
            from,
            to,
            repo
          }),
        renderText: renderPolicyText,
        timVersion
      })
    )
}
