import { z } from 'zod'
import { TimError } from '../../errors.js'
import { diffSpecCommits } from '../../spec/diff.js'
import { makeSpecAction } from './shared.js'

const NAME_THE_COMMITS =
  'Name at least one commit with --commit, such as a merge commit on main.'

const optionsSchema = z.object({
  commit: z
    .array(z.string().trim().min(1), { message: NAME_THE_COMMITS })
    .min(1, NAME_THE_COMMITS)
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const collect = (value, previous = []) => [...previous, value]

const scenarioLine = ({ change, id, capability, name, coverage }) =>
  `  ${change.padEnd(8)} ${(id ?? '(no id)').padEnd(24)} ${capability.padEnd(40)} ${name}${coverage ? ` [${coverage}]` : ''}`

const commitLines = ({ sha, scenarios }) => [
  `${sha.slice(0, 12)}: ${scenarios.length === 0 ? 'no scenario changed' : `${scenarios.length} scenario(s)`}`,
  ...scenarios.map(scenarioLine)
]

/**
 * The plain-text report of `tim spec diff`.
 *
 * @param {{commits: object[], skipped: {commit: string, reason: string}[]}} result
 * @returns {string}
 */
export const renderSpecDiffText = ({ commits, skipped }) =>
  [
    ...commits.flatMap(commitLines),
    ...skipped.map(({ reason }) => `Skipped: ${reason}.`)
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('diff')
    .description(
      "Say what each commit changed in the Behaviour Spec, scenario by scenario, against its first parent: added, changed (name or steps), removed, or coverage (only its coverage.json entry changed), with each scenario's coverage after the commit. Reads the workspace repo's local git only: fetch first. A commit it cannot find is listed under skipped. result.touched is every scenario id the commits added, changed or re-proved. Exits 0 whatever it finds."
    )
    .option(
      '--commit <sha>',
      'A commit in the workspace repo; repeat for several',
      collect
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim spec diff --commit 575f5f3c --json\n' +
        '  tim spec diff --commit e310d0af --commit 72fb2eda'
    )
    .action(
      makeSpecAction({
        parseOptions,
        run: ({ workspaceRoot }, parsed) =>
          diffSpecCommits({ workspaceRoot, commits: parsed.commit }),
        renderText: renderSpecDiffText,
        timVersion
      })
    )
}
