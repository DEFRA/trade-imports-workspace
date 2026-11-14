import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { listSpecs } from '../../service-tag/specs.js'
import { startServiceTag } from '../../service-tag/start.js'
import { makeRunAction } from '../_run-action.js'

const prettyJson = (value) => JSON.stringify(value, null, 2)

/**
 * The plain-text report `tim service-tag start` prints: a ready line, then
 * the report as indented JSON.
 *
 * @param {object} report
 * @returns {string}
 */
export const renderStartText = (report) => `MODE: READY\n${prettyJson(report)}`

const registerSpecs = (serviceTag, { timVersion }) =>
  serviceTag
    .command('specs')
    .description(
      'List the specs in the ins-tests clone with the tags each one carries, as JSON: file (from tests/, domain first), line, title and tags, each tag with one leading @. Playwright lists the tests, so no stack or browser is needed. With no options it lists every spec.'
    )
    .option('--domain <domain>', 'Only specs under tests/<domain>/')
    .option(
      '--type <type>',
      'Only specs of this test type: e2e, a11y or security'
    )
    .option(
      '--tag <tag>',
      'Only specs that carry this tag, such as @address-book'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim service-tag specs --tag @address-book --json\n  tim service-tag specs --domain animals --type e2e'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          filters: { domain: opts.domain, type: opts.type, tag: opts.tag }
        }),
        run: (_context, parsed) => listSpecs(parsed),
        renderText: prettyJson,
        timVersion
      })
    )

const registerStart = (serviceTag, { timVersion }) =>
  serviceTag
    .command('start')
    .description(
      "Gather what the service-tag skill reads before it changes a file: the workspace's and the ins-tests clone's branch and uncommitted files, the PR scope entries (not default), the services that call each one directly through a TRADE_IMPORTS_<NAME>_URL in the stack's compose files, the tag map the ins-tests lint reads, and where the scope file and the map disagree. Changes nothing."
    )
    .option(
      '--service <name>',
      'One service, short (address-book) or full (trade-imports-address-book). Leave it out to cover every scope entry.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim service-tag start --json\n  tim service-tag start --service address-book --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          service: opts.service ?? ''
        }),
        run: (_context, parsed) => startServiceTag(parsed),
        renderText: renderStartText,
        timVersion
      })
    )

/**
 * `tim service-tag`: what the service-tag skill reads from the ins-tests
 * clone, the PR scope file and the stack's wiring.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const serviceTag = program
    .command('service-tag')
    .description(
      'Read the specs, the PR scope file and the stack wiring the service-tag skill works from'
    )
  registerSpecs(serviceTag, { timVersion })
  registerStart(serviceTag, { timVersion })
}
