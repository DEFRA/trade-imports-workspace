import { z } from 'zod'
import { zodOptionsParser } from '../_parse-options.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { dependencyDrift } from '../../deps/drift.js'
import { makeRunAction } from '../_run-action.js'

const optionsSchema = z.object({
  repo: z.array(z.string().min(1)).optional(),
  ref: z.string().min(1).default('origin/main'),
  workspace: z.string().optional()
})

const collectRepo = (value, previous = []) => [...previous, value]

const repoLine = ({ repo, read, counts }) =>
  read
    ? `${repo}: ${counts.major} major, ${counts.minor} minor, ${counts.patch} patch`
    : `${repo}: no package.json to read`

const behindLine = ({ repo, package: packageName, current, proposed, held }) =>
  `  ${repo}: ${packageName} ${current} to ${proposed}${held ? ' (held)' : ''}`

const setLines = ({ set, behind }) => [
  `${set} is behind in:`,
  ...behind.map(behindLine)
]

/**
 * The plain-text report of `tim deps drift`.
 *
 * @param {{ref: string, repos: object[], setsBehind: object[]}} result
 * @returns {string}
 */
export const renderDriftText = ({ ref, repos, setsBehind }) =>
  [
    `Packages behind their latest release, at ${ref}:`,
    ...repos.map(repoLine),
    '',
    ...(setsBehind.length === 0
      ? ['Every cross-repo set is on its latest release.']
      : setsBehind.flatMap(setLines))
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('drift')
    .description(
      "List the packages each repo could move to a newer release, as npm-check-updates proposes them, from each repo's package.json at origin/main: the jump, the set and whether a hold covers it. Lists each cross-repo set some repo is behind on. Changes nothing."
    )
    .option(
      '--repo <name>',
      'Only this repo. Give it again for more. Without it, every repo in scope for the dependency sets.',
      collectRepo
    )
    .option(
      '--ref <ref>',
      'The git ref to read each package.json at',
      'origin/main'
    )
    .addHelpText(
      'after',
      '\nIt asks the npm registry about every package, so it can take a minute or more across every repo. A repo with no checkout, or no package.json at the ref, is listed as not read.\n' +
        '\nExamples:\n' +
        '  tim deps drift\n' +
        '  tim deps drift --json\n' +
        '  tim deps drift --repo trade-imports-animals-frontend --repo tim'
    )
    .action(
      makeRunAction({
        parseOptions: zodOptionsParser(optionsSchema),
        run: async (_context, { repo, ref, workspace }) =>
          dependencyDrift({
            workspaceRoot: resolveWorkspaceRoot({ explicit: workspace }),
            repos: repo,
            ref
          }),
        renderText: renderDriftText,
        timVersion
      })
    )
}
