import { ERROR, USAGE } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { TimError, isTimError } from '../../errors.js'
import {
  BRANCH_TYPES,
  isBranchTicket,
  setUpTicketBranch
} from '../../ticket/branch.js'
import { prepareImplement } from '../../ticket/prepare-implement.js'
import { preparePlan } from '../../ticket/prepare-plan.js'
import { makeRunAction } from '../_run-action.js'
import { writeLine } from '../_write-line.js'

const progressWriter = ({ json }) =>
  json ? async () => {} : (line) => writeLine(process.stdout, line)

const exitCodeForError = (error) => {
  if (isTimError(error) && error.code === 'USAGE') return USAGE
  return error.gitExitCode ?? ERROR
}

const refuseTicketWithoutProject = (ticket) => {
  if (!ticket.startsWith('EUDPA-')) {
    throw new TimError(
      'USAGE',
      `Give a ticket key that starts with EUDPA-, not "${ticket}".`
    )
  }
}

/**
 * The plain-text report `tim ticket branch` ends with.
 *
 * @param {{branch: string, repoDir: string, head: string}} ready
 * @returns {string}
 */
export const renderBranchText = ({ branch, repoDir, head }) =>
  ['', `Branch ready: ${branch}`, `Repo: ${repoDir}`, `HEAD: ${head}`].join(
    '\n'
  )

/**
 * The plain-text report `tim ticket prepare-plan` ends with.
 *
 * @param {{directory: string, repoList: string, meta: {ticket: string, type: string, summary: string}}} prepared
 * @returns {string}
 */
export const renderPlanText = ({ directory, repoList, meta }) =>
  [
    '',
    '=== Plan Workspace Ready ===',
    `Ticket: ${meta.ticket} (${meta.type})`,
    `Summary: ${meta.summary}`,
    `Directory: ${directory}`,
    '',
    'Created:',
    '  ✓ ticket.md',
    '  ✓ .plan-meta.json',
    repoList
      ? '  ✓ best-practices/{repo}.md'
      : '  (no --repos passed; PLANNER persona resolves repos and may re-run with --repos to bake best-practices bundles)',
    '',
    'Next: PLANNER persona authors plan.md'
  ].join('\n')

/**
 * The plain-text report `tim ticket prepare-implement` ends with.
 *
 * @param {{directory: string, planPath: string, meta: {ticket: string}}} prepared
 * @returns {string}
 */
export const renderImplementText = ({ directory, planPath, meta }) =>
  [
    '',
    '=== Implement Pre-flight Ready ===',
    `Ticket: ${meta.ticket}`,
    `Plan: ${planPath}`,
    `Directory: ${directory}`,
    '',
    'Created:',
    '  ✓ .implement-meta.json',
    '',
    'Next: IMPLEMENTOR persona reads plan + .implement-meta.json + best-practices/{repo}.md'
  ].join('\n')

const parseBranchOptions = (opts) => {
  if (!BRANCH_TYPES.includes(opts.type)) {
    throw new TimError(
      'USAGE',
      `--type must be feat, fix or chore, not "${opts.type}".`
    )
  }
  return {
    workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
    repo: opts.repo,
    slug: opts.slug,
    type: opts.type,
    base: opts.base,
    log: progressWriter(opts)
  }
}

const refuseBranchTicket = (ticket) => {
  if (!isBranchTicket(ticket)) {
    throw new TimError(
      'USAGE',
      `Give a ticket key that starts with EUDPA-, or NO_JIRA, not "${ticket}".`
    )
  }
}

const registerBranch = (ticketCommand, { timVersion }) =>
  ticketCommand
    .command('branch')
    .description(
      'Put one repo on the branch <type>/<ticket>-<slug>: fetch origin, check out and fast-forward the base, then switch to the branch. It uses the branch already here, else tracks the one on origin, else creates it from the base. Running it again switches to the same branch.'
    )
    .argument('<ticket>', 'An EUDPA ticket key, or NO_JIRA, kept as given')
    .requiredOption('--repo <repo>', 'The repo under repos/')
    .requiredOption('--slug <slug>', 'The words after the ticket key')
    .option('--type <type>', 'feat, fix or chore', 'feat')
    .option('--base <branch>', 'The branch to start from', 'main')
    .addHelpText(
      'after',
      '\nExamples:\n  tim ticket branch EUDPA-1234 --repo trade-imports-animals-frontend --slug commodity-code\n  tim ticket branch NO_JIRA --repo trade-imports-stub --slug tidy-logs --type chore --base release'
    )
    .action(
      makeRunAction({
        parseOptions: parseBranchOptions,
        run: ({ args: [ticket] }, options) => {
          refuseBranchTicket(ticket)
          return setUpTicketBranch({ ticket, ...options })
        },
        renderText: renderBranchText,
        exitCodeForError,
        timVersion
      })
    )

const registerPreparePlan = (ticketCommand, { timVersion }) =>
  ticketCommand
    .command('prepare-plan')
    .description(
      "Set up a ticket's planning folder under workareas/ticket-planning/<ticket>: ticket.md from the ticket, its comments and the Confluence pages its description links to, and .plan-meta.json. With --repos, it also detects each repo's technologies and writes best-practices/<repo>.md with the best-practice files they bring."
    )
    .argument('<ticket>', 'The Jira ticket key')
    .option('--repos <repos>', 'Comma-separated repo names under repos/')
    .addHelpText(
      'after',
      '\nExamples:\n  tim ticket prepare-plan EUDPA-1234\n  tim ticket prepare-plan EUDPA-1234 --repos trade-imports-animals-frontend,trade-imports-animals-backend'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          repoList: opts.repos,
          log: progressWriter(opts)
        }),
        run: ({ args: [ticket] }, options) => {
          refuseTicketWithoutProject(ticket)
          return preparePlan({ ticket, ...options })
        },
        renderText: renderPlanText,
        exitCodeForError,
        timVersion
      })
    )

const registerPrepareImplement = (ticketCommand, { timVersion }) =>
  ticketCommand
    .command('prepare-implement')
    .description(
      "Check a ticket's plan.md is there, detect the technologies again for the repos its .plan-meta.json names (or for --repo alone), and write .implement-meta.json beside the plan."
    )
    .argument('<ticket>', 'The Jira ticket key')
    .option(
      '--repo <repo>',
      'Detect for this repo in place of the plan meta list'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim ticket prepare-implement EUDPA-1234\n  tim ticket prepare-implement EUDPA-1234 --repo trade-imports-stub --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          repo: opts.repo,
          log: progressWriter(opts)
        }),
        run: ({ args: [ticket] }, options) => {
          refuseTicketWithoutProject(ticket)
          return prepareImplement({ ticket, ...options })
        },
        renderText: renderImplementText,
        exitCodeForError,
        timVersion
      })
    )

/**
 * `tim ticket`: the ticket skill's helpers.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const ticketCommand = program
    .command('ticket')
    .description(
      "The ticket skill's helpers: branch, plan and implement set-up"
    )
  registerBranch(ticketCommand, { timVersion })
  registerPreparePlan(ticketCommand, { timVersion })
  registerPrepareImplement(ticketCommand, { timVersion })
}
