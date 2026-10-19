import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { parseIssueKey } from './shared.js'
import { makeRunAction } from '../_run-action.js'

const CURRENT_USER = 'me'

const optionsSchema = z.object({
  confirm: z.boolean().optional().default(false)
})

const assigneeSchema = z
  .string({ error: 'Give an Atlassian account id, or "me".' })
  .trim()
  .regex(/^\S+$/, 'Give an Atlassian account id, or "me".')

/**
 * Validate `assign`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{confirm: boolean}}
 * @throws {TimError} USAGE
 */
export const parseAssignOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const parseAssignee = (value) => {
  const result = assigneeSchema.safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const accountIdFor = async (client, assignee) => {
  if (assignee !== CURRENT_USER) return assignee
  const { accountId } = await client.whoami()
  if (!accountId) {
    throw new TimError(
      'UNKNOWN',
      'Jira did not return your account id. Give the account id instead of "me".'
    )
  }
  return accountId
}

const confirmAssigneeLanded = async (client, key, accountId) => {
  const assignee = await client.getAssignee(key)
  if (assignee?.accountId !== accountId) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the assignment, but ${key} is assigned to ${assignee?.accountId ?? 'nobody'}. Check the ticket in Jira.`
    )
  }
  return assignee
}

/**
 * `tim jira assign`'s full behaviour: resolve `me` to your account id, read
 * who has the ticket now, and either report the dry run or, with `confirm`,
 * assign it and read it back to check it landed. A ticket already assigned
 * to that account is left alone.
 *
 * @param {{key: string, assignee: string, confirm: boolean}} args
 * @returns {Promise<{mode: 'dry-run'|'assigned'|'unchanged', key: string, accountId: string, previousAssignee: object|null, assignee?: object}>}
 * @throws {TimError} USAGE for a malformed key or account id; UNKNOWN when the read-back shows another assignee
 */
export const runAssign = async ({ key, assignee, confirm }) => {
  const issueKey = parseIssueKey(key)
  const requested = parseAssignee(assignee)
  const client = createJiraClient()
  const accountId = await accountIdFor(client, requested)
  const previousAssignee = await client.getAssignee(issueKey)
  const summary = { key: issueKey, accountId, previousAssignee }

  if (previousAssignee?.accountId === accountId) {
    return { mode: 'unchanged', ...summary, assignee: previousAssignee }
  }
  if (!confirm) return { mode: 'dry-run', ...summary }

  await client.assignIssue(issueKey, accountId)
  return {
    mode: 'assigned',
    ...summary,
    assignee: await confirmAssigneeLanded(client, issueKey, accountId)
  }
}

const nameOf = (assignee) =>
  assignee ? (assignee.displayName ?? assignee.accountId) : 'nobody'

export const renderAssignResult = (result) => {
  if (result.mode === 'unchanged') {
    return `${result.key} is already assigned to ${nameOf(result.assignee)}. Nothing changed.`
  }
  if (result.mode === 'dry-run') {
    return [
      `Would assign ${result.key} to ${result.accountId}. It is assigned to ${nameOf(result.previousAssignee)} now.`,
      'This is a dry run. No request has been sent. Add --confirm to assign for real.'
    ].join('\n')
  }
  return `Assigned ${result.key} to ${nameOf(result.assignee)}, from ${nameOf(result.previousAssignee)}. Checked on Jira.`
}

export const register = (jira, { timVersion }) => {
  jira
    .command('assign <key> <assignee>')
    .description(
      'Assign a Jira ticket to an Atlassian account id, or to "me". Dry run by default; --confirm assigns it and checks it landed.'
    )
    .option(
      '--confirm',
      'Assign for real and check it (the default is a dry run)'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira assign EUDPA-200 me --json',
        '  tim jira assign EUDPA-200 <accountId> --confirm --json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseAssignOptions,
        run: ({ args }, opts) =>
          runAssign({
            key: args[0],
            assignee: args[1],
            confirm: opts.confirm
          }),
        renderText: renderAssignResult,
        timVersion
      })
    )
}
