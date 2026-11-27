import { z } from 'zod'
import { zodOptionsParser } from '../_parse-options.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { loadDependencySets } from '../../deps/dependency-sets.js'
import { holdPackage, liftHold, localDateOf } from '../../deps/holds.js'
import { makeRunAction } from '../_run-action.js'

const required = (message) => z.string({ error: message }).min(1, message)

const holdOptionsSchema = z.object({
  versions: required('Give the version range to hold with --versions.'),
  repo: z
    .array(z.string().min(1), {
      error: 'Give each repo the hold covers with --repo.'
    })
    .min(1, 'Give each repo the hold covers with --repo.'),
  reason: required('Give the reason for the hold with --reason.'),
  failingTest: required(
    'Give the test or check the new version breaks with --failing-test.'
  ),
  clashesWith: z.string().min(1).optional(),
  link: z.string().min(1).optional(),
  workspace: z.string().optional()
})

const workspaceOptionsSchema = z.object({ workspace: z.string().optional() })

const collectRepo = (value, previous = []) => [...previous, value]

const regenerateLines = (repos) => [
  'Regenerate the Dependabot config of each repo it covers:',
  ...repos.map((repo) => `  tim deps dependabot ${repo} --write`)
]

/**
 * The plain-text report of `tim deps hold`.
 *
 * @param {{hold: object, replaced: object|null, regenerate: string[]}} result
 * @returns {string}
 */
export const renderHoldText = ({ hold, replaced, regenerate }) =>
  [
    `${replaced ? 'Replaced the hold on' : 'Held'} ${hold.package} ${hold.versions} in config/dependency-sets.json.`,
    ...regenerateLines(regenerate)
  ].join('\n')

const heldPackageText = ({
  package: packageName,
  versions,
  repos,
  since,
  reason,
  clashesWith
}) => [
  `${packageName} ${versions}, held since ${since}`,
  `  Repos: ${repos.join(', ')}`,
  ...(clashesWith ? [`  Clashes with: ${clashesWith}`] : []),
  `  ${reason}`
]

/**
 * The plain-text report of `tim deps holds`.
 *
 * @param {{holds: object[]}} result
 * @returns {string}
 */
export const renderHoldsText = ({ holds }) =>
  holds.length === 0
    ? 'No packages are held.'
    : holds.flatMap(heldPackageText).join('\n')

/**
 * The plain-text report of `tim deps lift`.
 *
 * @param {{lifted: object, regenerate: string[]}} result
 * @returns {string}
 */
export const renderLiftText = ({ lifted, regenerate }) =>
  [
    `Lifted the hold on ${lifted.package} ${lifted.versions} in config/dependency-sets.json.`,
    ...regenerateLines(regenerate)
  ].join('\n')

const registerHold = (program, { timVersion }) => {
  program
    .command('hold <package>')
    .description(
      "Hold a package at its current version in some repos: record it in config/dependency-sets.json, dated today, so each repo's generated Dependabot config ignores the versions it breaks. Replaces the package's hold if it has one."
    )
    .option(
      '--versions <range>',
      'The Dependabot version range to hold back: an npm range such as 4.14.x, or a Maven range such as [3.0.0,4.0.0)'
    )
    .option(
      '--repo <name>',
      'A repo the hold covers. Give it once for each repo.',
      collectRepo
    )
    .option('--reason <text>', 'Why the package is held, in plain English')
    .option('--failing-test <text>', 'The test or check the new version breaks')
    .option(
      '--clashes-with <package>',
      'A package whose newer release may clear the hold'
    )
    .option('--link <url>', 'A link to the evidence, such as the pull request')
    .addHelpText(
      'after',
      '\nA package named groupId:artifactId is a Maven hold: give it a Maven range, in quotes, and only repos in maven.repos in config/dependency-sets.json. Each repo of an npm hold must be in scope for the sets. Then run tim deps dependabot <repo> --write for each repo the command lists.\n' +
        '\nA hold also blocks security updates inside its range: Dependabot will not raise a security fix for a held version. Check open Dependabot alerts on the package while the hold stands.\n' +
        '\nExamples:\n' +
        '  tim deps hold @axe-core/playwright --versions 4.14.x --repo trade-imports-animals-frontend \\\n' +
        '    --reason "axe 4.14 flags the enhanced file upload button" \\\n' +
        '    --failing-test "FIT accessibility tests (label-content-name-mismatch)" \\\n' +
        '    --clashes-with govuk-frontend --link https://github.com/DEFRA/trade-imports-animals-frontend/pull/492\n' +
        '  tim deps hold lodash --versions 4.18.x --repo tim --reason "Breaks the build" --failing-test "npm test" --json\n' +
        "  tim deps hold org.springdoc:springdoc-openapi-starter-webmvc-ui --versions '[3.0.0,4.0.0)' \\\n" +
        '    --repo trade-imports-animals-backend --reason "springdoc-openapi 3 needs Spring Boot 4" \\\n' +
        '    --failing-test "E2E Tests" --clashes-with org.springframework.boot:spring-boot-starter-parent'
    )
    .action(
      makeRunAction({
        parseOptions: zodOptionsParser(holdOptionsSchema),
        run: async ({ args: [packageName] }, { repo, workspace, ...request }) =>
          holdPackage({
            workspaceRoot: resolveWorkspaceRoot({ explicit: workspace }),
            request: { ...request, package: packageName, repos: repo },
            today: localDateOf(new Date())
          }),
        renderText: renderHoldText,
        timVersion
      })
    )
}

const registerHolds = (program, { timVersion }) => {
  program
    .command('holds')
    .description(
      'List the packages held at their current version in config/dependency-sets.json, with the versions held, the repos, the date, the reason and the package each clashes with.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' + '  tim deps holds\n' + '  tim deps holds --json'
    )
    .action(
      makeRunAction({
        parseOptions: zodOptionsParser(workspaceOptionsSchema),
        run: async (_context, { workspace }) => ({
          holds: loadDependencySets(
            resolveWorkspaceRoot({ explicit: workspace })
          ).holds
        }),
        renderText: renderHoldsText,
        timVersion
      })
    )
}

const registerLift = (program, { timVersion }) => {
  program
    .command('lift <package>')
    .description(
      'Remove the hold on a package from config/dependency-sets.json, and list the repos whose Dependabot config to regenerate.'
    )
    .addHelpText(
      'after',
      '\nA package that is not held exits 2.\n' +
        '\nExamples:\n' +
        '  tim deps lift @axe-core/playwright\n' +
        '  tim deps lift @axe-core/playwright --json'
    )
    .action(
      makeRunAction({
        parseOptions: zodOptionsParser(workspaceOptionsSchema),
        run: async ({ args: [packageName] }, { workspace }) =>
          liftHold({
            workspaceRoot: resolveWorkspaceRoot({ explicit: workspace }),
            packageName
          }),
        renderText: renderLiftText,
        timVersion
      })
    )
}

export const register = (program, { timVersion }) => {
  registerHold(program, { timVersion })
  registerHolds(program, { timVersion })
  registerLift(program, { timVersion })
}
