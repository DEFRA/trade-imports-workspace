import { ERROR, USAGE } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { listPlans, renderPlansText } from '../../govuk/plans.js'
import { renderVersionPlan } from '../../govuk/render-plan.js'
import {
  listPlanSummaries,
  renderSummariesText
} from '../../govuk/summaries.js'
import { makeRunAction } from '../_run-action.js'

const workspaceRootOf = (opts) =>
  resolveWorkspaceRoot({ explicit: opts.workspace })

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
        exitCodeForError: (error) => (error.code === 'USAGE' ? USAGE : ERROR),
        timVersion
      })
    )

/**
 * `tim govuk`: read the state of a govuk-frontend upgrade run.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const govuk = program
    .command('govuk')
    .description(
      'Read the state of a govuk-frontend upgrade run: plans, summaries and one version’s plan'
    )
  registerPlans(govuk, { timVersion })
  registerSummaries(govuk, { timVersion })
  registerRenderPlan(govuk, { timVersion })
}
