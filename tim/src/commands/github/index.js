import { createGithubClient } from '../../clients/github-client.js'
import { resolveGithubToken } from '../auth.js'
import { makeClientAction } from '../_client-action.js'
import { register as registerCreatePr } from './create-pr.js'
import { register as registerChecks } from './checks.js'
import { register as registerRunLog } from './run-log.js'
import { register as registerRerun } from './rerun.js'

const buildGithubClient = async () =>
  createGithubClient({ token: await resolveGithubToken() })

export const renderPrs = (prs) => {
  if (prs.length === 0) return '(no PRs)'
  return prs
    .map(
      (pr) => `[${pr.state}] ${pr.repo} #${pr.number}  ${pr.title}\n  ${pr.url}`
    )
    .join('\n')
}

export const renderPr = (pr) =>
  [
    `${pr.repo} #${pr.number}  ${pr.title}`,
    `State:   ${pr.state}`,
    `Author:  ${pr.author ?? '?'}`,
    `URL:     ${pr.url}`,
    '',
    pr.body?.trim() ?? ''
  ]
    .join('\n')
    .trimEnd()

export const renderDiff = (diff) => diff

export const register = (program, { timVersion }) => {
  const gh = program
    .command('github')
    .description(
      'Open GitHub PRs, read PRs, diffs, checks and run logs, and run jobs again'
    )

  gh.command('prs <ticketId>')
    .description('List PRs across the DEFRA org tagged with the ticket id')
    .action(
      makeClientAction({
        client: buildGithubClient,
        call: async (c, [ticketId]) => (await c).findPrsForTicket(ticketId),
        renderText: renderPrs,
        timVersion
      })
    )

  gh.command('pr <repo> <number>')
    .description('Fetch one PR by repo and number')
    .action(
      makeClientAction({
        client: buildGithubClient,
        call: async (c, [repo, n]) => (await c).getPr(repo, Number(n)),
        renderText: renderPr,
        timVersion
      })
    )

  gh.command('diff <repo> <number>')
    .description('Fetch the diff for one PR')
    .action(
      makeClientAction({
        client: buildGithubClient,
        call: async (c, [repo, n]) => (await c).getPrDiff(repo, Number(n)),
        renderText: renderDiff,
        timVersion
      })
    )

  registerCreatePr(gh, { timVersion })
  registerChecks(gh, { timVersion })
  registerRunLog(gh, { timVersion })
  registerRerun(gh, { timVersion })
}
