import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { issueKeySchema, makeJiraAction, parseIssueKey } from './shared.js'

const optionsSchema = z.object({
  confirm: z.boolean().optional().default(false),
  blocks: issueKeySchema.optional(),
  blockedBy: issueKeySchema.optional()
})

const ONE_LINK_MESSAGE =
  'Give one link: "relates <key>", --blocks <key> or --blocked-by <key>.'

/**
 * Validate `link`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{confirm: boolean, blocks?: string, blockedBy?: string}}
 * @throws {TimError} USAGE
 */
export const parseLinkOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const relatesRequest = (key, relationship, target) => {
  if (relationship.toLowerCase() !== 'relates') {
    throw new TimError(
      'USAGE',
      `tim cannot link "${relationship}" this way. ${ONE_LINK_MESSAGE}`
    )
  }
  if (!target) {
    throw new TimError('USAGE', `Give the ticket ${key} relates to.`)
  }
  return {
    type: 'Relates',
    target: parseIssueKey(target),
    relation: 'relates to'
  }
}

/**
 * Turn `link`'s arguments into one link to make, read from `key`'s side.
 *
 * @param {{key: string, relationship?: string, target?: string, blocks?: string, blockedBy?: string}} args
 * @returns {{type: 'Relates'|'Blocks', target: string, relation: string, direction?: 'outward'|'inward'}}
 * @throws {TimError} USAGE unless exactly one link is given
 */
export const linkRequestFrom = ({
  key,
  relationship,
  target,
  blocks,
  blockedBy
}) => {
  const given = [relationship, blocks, blockedBy].filter(Boolean)
  if (given.length !== 1) throw new TimError('USAGE', ONE_LINK_MESSAGE)
  if (blocks) {
    return {
      type: 'Blocks',
      target: parseIssueKey(blocks),
      relation: 'blocks',
      direction: 'outward'
    }
  }
  if (blockedBy) {
    return {
      type: 'Blocks',
      target: parseIssueKey(blockedBy),
      relation: 'is blocked by',
      direction: 'inward'
    }
  }
  return relatesRequest(key, relationship, target)
}

const writeLink = (client, key, request) => {
  if (request.type === 'Relates') {
    return client.relateIssues(key, request.target)
  }
  return request.direction === 'outward'
    ? client.recordBlocker({ blocker: key, blocked: request.target })
    : client.recordBlocker({ blocker: request.target, blocked: key })
}

const storedSentence = (key, link) => `${key} ${link.relation} ${link.otherKey}`

const findStoredLink = (links, request) =>
  links.filter(
    (link) => link.type === request.type && link.otherKey === request.target
  )

const verifyStoredDirection = ({ key, request, stored }) => {
  if (stored.length === 0) {
    throw new TimError(
      'NETWORK',
      `Linked ${key} to ${request.target}, but the link is not showing up yet. Check Jira and run \`tim jira link\` again.`
    )
  }
  if (request.type === 'Relates') return stored[0]
  const matching = stored.find((link) => link.direction === request.direction)
  if (!matching) {
    throw new TimError(
      'UNKNOWN',
      `Asked for "${key} ${request.relation} ${request.target}", but Jira stored "${storedSentence(key, stored[0])}". Remove that link in Jira and run \`tim jira link\` again.`
    )
  }
  return matching
}

/**
 * `tim jira link`'s full behaviour: dry run by default; with `confirm`,
 * create the link, then read the ticket's links back and report the
 * direction Jira stored.
 *
 * @param {object} args
 * @param {string} args.key
 * @param {string} [args.relationship] - `relates`, with `target`
 * @param {string} [args.target]
 * @param {string} [args.blocks] - The ticket `key` blocks
 * @param {string} [args.blockedBy] - The ticket that blocks `key`
 * @param {boolean} args.confirm
 * @returns {Promise<{mode: 'dry-run'|'linked', key: string, target: string, type: string, requested: string, stored?: string, verified?: boolean}>}
 * @throws {TimError} USAGE unless exactly one link is given; NETWORK when the link is not showing after the write; UNKNOWN when Jira stored it the other way round
 */
export const runLink = async ({
  key,
  relationship,
  target,
  blocks,
  blockedBy,
  confirm
}) => {
  const issueKey = parseIssueKey(key)
  const request = linkRequestFrom({
    key: issueKey,
    relationship,
    target,
    blocks,
    blockedBy
  })
  const summary = {
    key: issueKey,
    target: request.target,
    type: request.type,
    requested: `${issueKey} ${request.relation} ${request.target}`
  }
  if (!confirm) return { mode: 'dry-run', ...summary }

  const client = createJiraClient()
  await writeLink(client, issueKey, request)
  const stored = findStoredLink(await client.getIssueLinks(issueKey), request)
  const link = verifyStoredDirection({ key: issueKey, request, stored })
  return {
    mode: 'linked',
    ...summary,
    stored: storedSentence(issueKey, link),
    verified: true
  }
}

export const renderLinkResult = (result) =>
  result.mode === 'dry-run'
    ? [
        `Would link: ${result.requested} (${result.type}).`,
        'This is a dry run. No request has been sent. Add --confirm to link for real.'
      ].join('\n')
    : `Linked: ${result.stored} (${result.type}). Jira stores it this way round.`

export const register = (jira, { timVersion }) => {
  jira
    .command('link <key> [relationship] [target]')
    .description(
      'Link two Jira tickets: "relates <key>", or a Blocks link with --blocks or --blocked-by. Dry run by default; --confirm creates the link and reports the direction Jira stored.'
    )
    .option('--blocks <key>', 'This ticket blocks <key>')
    .option('--blocked-by <key>', 'This ticket is blocked by <key>')
    .option(
      '--confirm',
      'Create the link for real and check it (the default is a dry run)'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira link EUDPA-200 relates EUDPA-100 --confirm --json',
        '  tim jira link EUDPA-200 --blocks EUDPA-300 --confirm --json',
        '  tim jira link EUDPA-300 --blocked-by EUDPA-200'
      ].join('\n')
    )
    .action(
      makeJiraAction({
        parseOptions: parseLinkOptions,
        run: ({ args }, opts) =>
          runLink({
            key: args[0],
            relationship: args[1],
            target: args[2],
            blocks: opts.blocks,
            blockedBy: opts.blockedBy,
            confirm: opts.confirm
          }),
        renderText: renderLinkResult,
        timVersion
      })
    )
}
