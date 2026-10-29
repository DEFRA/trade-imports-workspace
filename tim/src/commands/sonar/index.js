import { createSonarClient } from '../../clients/sonar-client.js'
import { makeClientAction } from '../_client-action.js'
import { TimError } from '../../errors.js'

const scopeOf = ({ pullRequest, branch }) => {
  if (pullRequest !== undefined && branch !== undefined) {
    throw new TimError('USAGE', 'Give --pull-request or --branch, not both.')
  }
  if (pullRequest !== undefined && !/^\d+$/.test(pullRequest)) {
    throw new TimError('USAGE', '--pull-request must be a PR number.')
  }
  return { pullRequest, branch }
}

const issueLine = ({ severity, type, rule, file, line, message, url }) =>
  `[${severity} ${type}] ${rule}  ${file}${line === null ? '' : `:${line}`}\n  ${message}\n  ${url}`

const METRICS_NO_ISSUE_EXPLAINS = [
  'new_coverage',
  'new_duplicated_lines_density',
  'new_security_hotspots_reviewed'
]

const measurement = ({ comparator, threshold, actual }) =>
  comparator === 'LT'
    ? `${threshold} required, ${actual} measured`
    : `${threshold} allowed, ${actual} measured`

const conditionLine = (condition) =>
  `[FAILED] ${condition.metric}  ${measurement(condition)}`

const issueCommandFor = (project, failed, { pullRequest, branch }) => {
  const countsIssues = failed.some(
    ({ metric }) => !METRICS_NO_ISSUE_EXPLAINS.includes(metric)
  )
  if (!countsIssues) return []
  const scope = pullRequest
    ? `--pull-request ${pullRequest}`
    : branch
      ? `--branch ${branch}`
      : ''
  const command = ['tim sonar issues', project, scope].filter(Boolean).join(' ')
  return [`The issues behind those conditions: \`${command}\`.`]
}

export const renderIssues = ({
  project,
  pullRequest,
  branch,
  total,
  issues
}) => {
  const where = pullRequest ? `PR ${pullRequest}` : (branch ?? 'main branch')
  const heading = `${project} ${where}: ${total} open issue${total === 1 ? '' : 's'}`
  return [heading, ...issues.map(issueLine)].join('\n')
}

export const renderGate = ({
  project,
  pullRequest,
  branch,
  status,
  conditions,
  url
}) => {
  const where = pullRequest ? `PR ${pullRequest}` : (branch ?? 'main branch')
  const failed = conditions.filter((condition) => condition.status === 'ERROR')
  if (status === 'NONE') {
    return `${project} ${where}: no quality gate result — SonarCloud has not analysed it\n${url}`
  }
  if (failed.length === 0) {
    return `${project} ${where}: quality gate passed on ${conditions.length} conditions\n${url}`
  }
  return [
    `${project} ${where}: quality gate FAILED on ${failed.length} of ${conditions.length} conditions`,
    ...failed.map(conditionLine),
    url,
    ...issueCommandFor(project, failed, { pullRequest, branch })
  ].join('\n')
}

export const register = (program, { timVersion }) => {
  const sonar = program
    .command('sonar')
    .description('Read SonarCloud issues for a DEFRA project')

  sonar
    .command('issues <project>')
    .description(
      'List the open SonarCloud issues on a pull request, a branch or the main branch. The project is the repo name, with or without the DEFRA_ prefix.'
    )
    .option(
      '--pull-request <number>',
      'Only the issues the PR quality gate counts as new'
    )
    .option('--branch <name>', 'Only the issues on this branch')
    .addHelpText(
      'after',
      '\nExample:\n  tim sonar issues trade-imports-plants-frontend --pull-request 108\n\nA public project needs no token. Set SONAR_TOKEN for a private one.'
    )
    .action(function listIssuesAction(project, options, command) {
      return makeClientAction({
        client: () => createSonarClient(),
        call: async (client) => client.listIssues(project, scopeOf(options)),
        renderText: renderIssues,
        timVersion
      }).call(this, project, options, command)
    })

  sonar
    .command('gate <project>')
    .description(
      'Why a SonarCloud quality gate passed or failed on a pull request, a branch or the main branch: its status, and every condition it failed with the threshold and what the code measured. A gate failure has no GitHub job log — the scan step passes and SonarCloud posts its verdict as a check of its own — so this is how to read one. The project is the repo name, with or without the DEFRA_ prefix.'
    )
    .option('--pull-request <number>', "The pull request's own gate")
    .option('--branch <name>', "That branch's gate")
    .addHelpText(
      'after',
      '\nExample:\n  tim sonar gate trade-imports-animals-frontend --pull-request 435\n\nIt reports and exits 0 whatever the verdict. A public project needs no token; set SONAR_TOKEN for a private one.'
    )
    .action(function gateAction(project, options, command) {
      return makeClientAction({
        client: () => createSonarClient(),
        call: async (client) => client.qualityGate(project, scopeOf(options)),
        renderText: renderGate,
        timVersion
      }).call(this, project, options, command)
    })
}
