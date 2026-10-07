import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { makeJiraAction } from './shared.js'

const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-\d+$/

const argsSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(ISSUE_KEY, 'Give a Jira ticket key, for example EUDPA-200.'),
  status: z.string().trim().min(1).optional(),
  list: z.boolean().optional().default(false)
})

/**
 * Validate `transition`'s arguments before any request is sent.
 *
 * @param {{key?: string, status?: string, list?: boolean}} input
 * @returns {{key: string, status?: string, list: boolean}}
 * @throws {TimError} USAGE when the key is malformed, or neither a status nor --list is given
 */
export const parseTransitionArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  const { key, status, list } = result.data
  if (!list && !status) {
    throw new TimError(
      'USAGE',
      `Give the status to move ${key} to, or --list to see the transitions it offers.`
    )
  }
  return result.data
}

const listFor = async (client, key) => {
  const ticket = await client.getTicket(key)
  const transitions = await client.listTransitions(key)
  return { key, action: 'listed', status: ticket.status, transitions }
}

const confirmLanded = async (client, move) => {
  const { status } = await client.getTicket(move.key)
  if (status !== move.to) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the move to ${move.to}, but ${move.key} is still ${status}. Check the ticket in Jira.`
    )
  }
  return status
}

/**
 * `tim jira transition`'s full behaviour. Moves the ticket into the status
 * with exactly that name, or a transition with that name when no status
 * matches, then reads the ticket back to confirm it landed. A ticket already
 * in the status is left alone. With `list`, moves nothing and returns the
 * transitions the ticket offers.
 *
 * @param {{key: string, status?: string, list?: boolean}} args
 * @returns {Promise<object>} key, action (`moved`, `unchanged` or `listed`), status, and previousStatus, requested and transition, or transitions
 * @throws {TimError} USAGE when the ticket offers no way into that status
 */
export const runTransition = async (args) => {
  const { key, status, list } = parseTransitionArgs(args)
  const client = createJiraClient()
  if (list) return listFor(client, key)
  const move = await client.moveToStatus(key, status, {
    matchTransitionName: true
  })
  if (!move.moved) {
    return {
      key,
      action: 'unchanged',
      status: move.to,
      previousStatus: move.from,
      requested: status,
      transition: null
    }
  }
  return {
    key,
    action: 'moved',
    status: await confirmLanded(client, move),
    previousStatus: move.from,
    requested: status,
    transition: move.transition
  }
}

const renderList = ({ key, status, transitions }) =>
  transitions.length === 0
    ? `${key} is ${status}. It offers no transitions.`
    : [
        `${key} is ${status}. It offers these transitions (transition -> the status it leads to):`,
        ...transitions.map(({ name, to }) => `  - ${name} -> ${to}`)
      ].join('\n')

const renderMoved = ({ key, status, previousStatus, requested }) =>
  [
    `Moved ${key} from ${previousStatus} to ${status}.`,
    ...(requested === status
      ? []
      : [`"${requested}" is a transition, so ${key} is now ${status}.`])
  ].join('\n')

export const renderTransition = (result) => {
  if (result.action === 'listed') return renderList(result)
  if (result.action === 'unchanged') {
    return `${result.key} is already ${result.status}. Nothing changed.`
  }
  return renderMoved(result)
}

export const register = (jira, { timVersion }) => {
  jira
    .command('transition <key> [status]')
    .description(
      'Move a Jira ticket to the status with this exact name. If no status has that name, a transition with that name is used and the output says where the ticket ended up. A ticket already in that status is left alone. This changes the ticket straight away: there is no dry run.'
    )
    .option(
      '--list',
      'Show the transitions the ticket offers and the status each leads to, and move nothing'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira transition EUDPA-200 "Done" --json',
        '  tim jira transition EUDPA-200 --list',
        '',
        'If no transition leads to that status, the command fails and lists',
        'the transitions the ticket offers.'
      ].join('\n')
    )
    .action(
      makeJiraAction({
        run: ({ args }, opts) =>
          runTransition({ key: args[0], status: args[1], list: opts.list }),
        renderText: renderTransition,
        timVersion
      })
    )
}
