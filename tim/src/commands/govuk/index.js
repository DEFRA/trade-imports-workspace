import { createGovukChangelogClient } from '../../clients/govuk-changelog-client.js'
import { createNpmRegistryClient } from '../../clients/npm-registry-client.js'
import { ERROR, OK, USAGE } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { applyVersion } from '../../govuk/apply.js'
import { startUpgrade } from '../../govuk/start.js'
import {
  addVersionChange,
  classifyVersion,
  markVersionDone,
  markVersionFailed
} from '../../govuk/transitions.js'
import { listPlans, renderPlansText } from '../../govuk/plans.js'
import { renderVersionPlan } from '../../govuk/render-plan.js'
import {
  listPlanSummaries,
  renderSummariesText
} from '../../govuk/summaries.js'
import { makeRunAction } from '../_run-action.js'
import { writeLine } from '../_write-line.js'

const workspaceRootOf = (opts) =>
  resolveWorkspaceRoot({ explicit: opts.workspace })

const usageOrError = (error) => (error.code === 'USAGE' ? USAGE : ERROR)

const registerPlans = (govuk, { timVersion }) =>
  govuk
    .command('plans')
    .description(
      "Show a govuk-frontend upgrade run's planning and implementation state: each repo's version counts and its versions, then the totals."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-264')
    .option('--repo <name>', 'Only show this repo')
    .option(
      '--filter <filter>',
      'Only list versions that are unplanned, todo, noop, done, failed or pending'
    )
    .option('--sort-semver', 'List versions in ascending version order')
    .addHelpText(
      'after',
      '\nFilters:\n  unplanned  not classified yet\n  todo       classified todo and not applied yet\n  noop       classified noop\n  done       applied\n  failed     failed to apply\n  pending    not applied yet\n\nExamples:\n  tim govuk plans --run-id EUDPA-264\n  tim govuk plans --run-id EUDPA-264 --filter unplanned --json\n  tim govuk plans --run-id EUDPA-264 --filter pending --sort-semver --json'
    )
    .action(function plansAction(...positional) {
      const { filter } = this.opts()
      return makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          runId: opts.runId,
          repo: opts.repo,
          filter: opts.filter,
          sortSemver: opts.sortSemver === true
        }),
        run: (_context, parsed) => listPlans(parsed),
        renderText: (plans) => renderPlansText(plans, filter),
        exitCodeForError: () => ERROR,
        timVersion
      }).apply(this, positional)
    })

const registerSummaries = (govuk, { timVersion }) =>
  govuk
    .command('summaries')
    .description(
      'List every version of a govuk-frontend upgrade run that is still to apply and is not a noop, one tab-separated line each: repo, version, classification, number of changes and summary. A version nobody has classified shows as unplanned.'
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-264')
    .option('--repo <name>', 'Only list this repo')
    .addHelpText(
      'after',
      '\nExamples:\n  tim govuk summaries --run-id EUDPA-264\n  tim govuk summaries --run-id EUDPA-264 --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          runId: opts.runId,
          repo: opts.repo
        }),
        run: (_context, parsed) => listPlanSummaries(parsed),
        renderText: renderSummariesText,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const registerRenderPlan = (govuk, { timVersion }) =>
  govuk
    .command('render-plan')
    .description(
      "Print one version's upgrade plan for one repo as markdown: its state, the changes it needs and its changelog section."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-264')
    .option('--repo <name>', 'The repo')
    .option(
      '--govuk-version <version>',
      'The govuk-frontend version, such as 5.9.1'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim govuk render-plan --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1\n  tim govuk render-plan --run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1 --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          runId: opts.runId,
          repo: opts.repo,
          version: opts.govukVersion
        }),
        run: (_context, parsed) => renderVersionPlan(parsed),
        renderText: ({ markdown }) => markdown,
        exitCodeForError: usageOrError,
        timVersion
      })
    )

const versionOptions = (command) =>
  command
    .option('--run-id <ticket>', 'The run, such as EUDPA-264')
    .option('--repo <name>', 'The repo')
    .option(
      '--govuk-version <version>',
      'The govuk-frontend version, such as 5.9.1'
    )

const versionIdsOf = (opts) => ({
  workspaceRoot: workspaceRootOf(opts),
  runId: opts.runId,
  repo: opts.repo,
  version: opts.govukVersion
})

const EXAMPLE_IDS =
  '--run-id EUDPA-264 --repo trade-imports-animals-frontend --govuk-version 5.9.1'

const registerStateWrite = (
  govuk,
  { timVersion, name, description, options, examples, write }
) =>
  options(versionOptions(govuk.command(name).description(description)))
    .addHelpText(
      'after',
      `\nExamples:\n${examples.map((example) => `  tim govuk ${name} ${EXAMPLE_IDS} ${example}`).join('\n')}`
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({ ...versionIdsOf(opts), opts }),
        run: (_context, { opts, ...ids }) => write(ids, opts),
        renderText: ({ message }) => message,
        exitCodeForError: usageOrError,
        timVersion
      })
    )

const STATE_WRITES = [
  {
    name: 'classify',
    description:
      "Set one version's classification in a govuk-frontend upgrade run to todo or noop. A noop loses its changes.",
    options: (command) =>
      command
        .option('--classification <classification>', 'todo or noop')
        .option(
          '--summary <text>',
          'One line on what the version needs; an empty one clears it'
        ),
    examples: ['--classification todo --summary "Rename the header macro"'],
    write: (ids, { classification, summary }) =>
      classifyVersion({ ...ids, classification, summary })
  },
  {
    name: 'add-change',
    description:
      "Add a change to the end of one version's list of changes in a govuk-frontend upgrade run.",
    options: (command) =>
      command
        .option('--file <path>', 'The file to change, from the repo root')
        .option('--why <text>', 'Why the version needs the change')
        .option('--change <text>', 'What to change'),
    examples: [
      '--file src/server/common/templates/layouts/page.njk --why "The header macro changed" --change "Pass classes to govukHeader"'
    ],
    write: (ids, { file, why, change }) =>
      addVersionChange({ ...ids, file, why, change })
  },
  {
    name: 'mark-done',
    description:
      'Mark one version of a govuk-frontend upgrade run as done, with the commit that applied it.',
    options: (command) =>
      command.option(
        '--commit <sha>',
        'The commit that applied the version; leave it out for a noop'
      ),
    examples: ['--commit 0123abc', ''],
    write: (ids, { commit }) => markVersionDone({ ...ids, commit })
  },
  {
    name: 'mark-failed',
    description:
      'Mark one version of a govuk-frontend upgrade run as failed, with the reason.',
    options: (command) =>
      command.option('--reason <text>', 'Why the version failed'),
    examples: ['--reason "npm test failed"'],
    write: (ids, { reason }) => markVersionFailed({ ...ids, reason })
  }
]

const registerApply = (govuk, { timVersion }) =>
  versionOptions(
    govuk
      .command('apply')
      .description(
        "Apply one version of a govuk-frontend upgrade to a repo: set the version in package.json, run npm install and npm test, commit everything in the repo and mark the version done. A failed npm step marks the version failed and exits 1. An intermediate noop version is only marked done. Edit the repo's source for the version's changes first."
      )
  )
    .option(
      '--final',
      "Treat the version as the run's target: restore the original constraint prefix"
    )
    .addHelpText(
      'after',
      `\nnpm install and npm test write their output to /tmp/govuk-install-<repo>-<version>-<stamp>.txt and /tmp/govuk-test-<repo>-<version>-<stamp>.txt.\n\nExamples:\n  tim govuk apply ${EXAMPLE_IDS}\n  tim govuk apply ${EXAMPLE_IDS} --final --json`
    )
    .action(function applyAction(...positional) {
      const { json } = this.optsWithGlobals()
      const say = json ? undefined : (line) => writeLine(process.stdout, line)
      const warn = json ? undefined : (line) => writeLine(process.stderr, line)
      return makeRunAction({
        parseOptions: (opts) => ({
          ...versionIdsOf(opts),
          final: opts.final === true
        }),
        run: (_context, parsed) => applyVersion({ ...parsed, say, warn }),
        renderText: () => null,
        renderTextError: ({ reason }) => reason ?? '',
        exitCodeForResult: ({ outcome }) => (outcome === 'failed' ? ERROR : OK),
        exitCodeForError: usageOrError,
        timVersion
      }).apply(this, positional)
    })

const registerStart = (govuk, { timVersion }) =>
  govuk
    .command('start')
    .description(
      "Start a govuk-frontend upgrade run. Finds every repo under repos/ whose package.json depends on govuk-frontend, puts each on the run's branch, seeds each repo's versions file with every stable version up to the target, caches each version's changelog section and the best-practices bundle, prints the run's plans and reports each repo's critical and high npm advisories."
    )
    .option(
      '--ticket <key>',
      'The run ticket, such as EUDPA-264: the branch is chore/<ticket>'
    )
    .option(
      '--branch <name>',
      'The branch to use as it is: the run id is the ticket key in it, else the branch name'
    )
    .option(
      '--target <version>',
      'The govuk-frontend version to upgrade to. Defaults to the latest on npm'
    )
    .option(
      '--force',
      'Download the changelog again and reseed every version, losing its plan'
    )
    .addHelpText(
      'after',
      '\nThe ticket must be a key of JIRA_PROJECT_KEY, else EUDPA. npm versions come from npm_config_registry when set, else the public npm registry.\n\nExamples:\n  tim govuk start --ticket EUDPA-264\n  tim govuk start --branch chore/EUDPA-264-govuk-6 --target 6.1.0\n  tim govuk start --ticket EUDPA-264 --force --json'
    )
    .action(function startAction(...positional) {
      const { json } = this.optsWithGlobals()
      const say = json ? undefined : (line) => writeLine(process.stdout, line)
      const warn = json ? undefined : (line) => writeLine(process.stderr, line)
      return makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          ticket: opts.ticket,
          branch: opts.branch,
          target: opts.target,
          force: opts.force === true
        }),
        run: (_context, parsed) =>
          startUpgrade({
            ...parsed,
            registry: createNpmRegistryClient(),
            changelogs: createGovukChangelogClient(),
            say,
            warn
          }),
        renderText: () => null,
        exitCodeForError: usageOrError,
        timVersion
      }).apply(this, positional)
    })

/**
 * `tim govuk`: read and change the state of a govuk-frontend upgrade run.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const govuk = program
    .command('govuk')
    .description(
      'Start a govuk-frontend upgrade run, then read and change its state: plans, summaries, one version’s plan, classifying and applying versions'
    )
  registerStart(govuk, { timVersion })
  registerPlans(govuk, { timVersion })
  registerSummaries(govuk, { timVersion })
  registerRenderPlan(govuk, { timVersion })
  STATE_WRITES.forEach((stateWrite) =>
    registerStateWrite(govuk, { timVersion, ...stateWrite })
  )
  registerApply(govuk, { timVersion })
}
