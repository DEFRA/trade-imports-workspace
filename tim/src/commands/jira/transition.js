import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { issueKeySchema, makeJiraAction } from './shared.js'

const argsSchema = z.object({
  key: issueKeySchema,
  status: z.string().trim().min(1).optional(),
  list: z.boolean().optional().default(false),
  resolution: z
    .string()
    .trim()
    .min(1, 'Give the resolution name after --resolution.')
    .optional()
})

/**
 * Validate `transition`'s arguments before any request is sent.
 *
 * @param {{key?: string, status?: string, list?: boolean, resolution?: string}} input
 * @returns {{key: string, status?: string, list: boolean, resolution?: string}}
 * @throws {TimError} USAGE when the key is malformed, neither a status nor --list is given, or --resolution comes with --list
 */
export const parseTransitionArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  const { key, status, list, resolution } = result.data
  if (!list && !status) {
    throw new TimError(
      'USAGE',
      `Give the status to move ${key} to, or --list to see the transitions it offers.`
    )
  }
  if (list && resolution) {
    throw new TimError(
      'USAGE',
      '--list moves nothing, so it cannot set a resolution. Give a status instead.'
    )
  }
  return result.data
}

const listFor = async (client, key) => {
  const ticket = await client.getTicket(key)
  const transitions = await client.listTransitions(key, {
    withResolutions: true
  })
  return { key, action: 'listed', status: ticket.status, transitions }
}

const confirmStatusLanded = async (client, move) => {
  const { status } = await client.getTicket(move.key)
  if (status !== move.to) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the move to ${move.to}, but ${move.key} is still ${status}. Check the ticket in Jira.`
    )
  }
  return status
}

const confirmResolutionLanded = async (client, move) => {
  const resolution = await client.getResolution(move.key)
  if (resolution !== move.resolution) {
    throw new TimError(
      'UNKNOWN',
      `Jira moved ${move.key} to ${move.to}, but its resolution is ${resolution ?? 'not set'}, not ${move.resolution}. Check the ticket in Jira.`
    )
  }
  return resolution
}

/**
 * `tim jira transition`'s full behaviour. Moves the ticket into the status
 * with exactly that name, or a transition with that name when no status
 * matches, then reads the ticket back to confirm it landed. With
 * `resolution`, the move also sets that resolution, and the read-back checks
 * it too. A ticket already in the status is left alone. With `list`, moves
 * nothing and returns the transitions the ticket offers.
 *
 * @param {{key: string, status?: string, list?: boolean, resolution?: string}} args
 * @returns {Promise<object>} key, action (`moved`, `unchanged` or `listed`), status, and previousStatus, requested, transition and resolution, or transitions
 * @throws {TimError} USAGE when the ticket offers no way into that status, or the transition does not accept the resolution
 */
export const runTransition = async (args) => {
  const { key, status, list, resolution } = parseTransitionArgs(args)
  const client = createJiraClient()
  if (list) return listFor(client, key)
  const move = await client.moveToStatus(key, status, {
    matchTransitionName: true,
    resolution
  })
  if (!move.moved) {
    return {
      key,
      action: 'unchanged',
      status: move.to,
      previousStatus: move.from,
      requested: status,
      transition: null,
      resolution: resolution ? await client.getResolution(key) : null
    }
  }
  return {
    key,
    action: 'moved',
    status: await confirmStatusLanded(client, move),
    previousStatus: move.from,
    requested: status,
    transition: move.transition,
    resolution: resolution ? await confirmResolutionLanded(client, move) : null
  }
}

const describeResolutions = (resolutions) => {
  if (!resolutions) return ''
  if (resolutions.length === 0) return ' (asks for a resolution, offers none)'
  return ` (resolution: ${resolutions.join(', ')})`
}

const renderList = ({ key, status, transitions }) =>
  transitions.length === 0
    ? `${key} is ${status}. It offers no transitions.`
    : [
        `${key} is ${status}. It offers these transitions (transition -> the status it leads to):`,
        ...transitions.map(
          ({ name, to, resolutions }) =>
            `  - ${name} -> ${to}${describeResolutions(resolutions)}`
        )
      ].join('\n')

const renderMoved = ({ key, status, previousStatus, requested, resolution }) =>
  [
    `Moved ${key} from ${previousStatus} to ${status}${resolution ? `, resolution ${resolution}` : ''}.`,
    ...(requested === status
      ? []
      : [`"${requested}" is a transition, so ${key} is now ${status}.`])
  ].join('\n')

const renderUnchanged = ({ key, status, resolution }) =>
  [
    `${key} is already ${status}. Nothing changed.`,
    ...(resolution ? [`Its resolution is ${resolution}.`] : [])
  ].join('\n')

export const renderTransition = (result) => {
  if (result.action === 'listed') return renderList(result)
  if (result.action === 'unchanged') return renderUnchanged(result)
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
      'Show the transitions the ticket offers, the status each leads to and the resolutions each accepts, and move nothing'
    )
    .option(
      '--resolution <name>',
      "Set this resolution as part of the move. The transition's screen must accept it"
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira transition EUDPA-200 "Done" --json',
        '  tim jira transition EUDPA-200 --list',
        `  tim jira transition EUDPA-200 "Done" --resolution "Won't Do" --json`,
        '',
        'If no transition leads to that status, the command fails and lists',
        'the transitions the ticket offers. If the transition does not accept',
        'the resolution, the command fails before it moves anything.'
      ].join('\n')
    )
    .action(
      makeJiraAction({
        run: ({ args }, opts) =>
          runTransition({
            key: args[0],
            status: args[1],
            list: opts.list,
            resolution: opts.resolution
          }),
        renderText: renderTransition,
        timVersion
      })
    )
}
