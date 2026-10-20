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
}
