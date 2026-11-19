import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { makeRunAction } from '../_run-action.js'
import { parseIssueKey } from './shared.js'
import {
  DRY_RUN_NOTICE,
  couldNotReadError,
  exitCodeForDeletionError,
  numericIdSchema
} from './deletion.js'

const optionsSchema = z.object({
  confirm: z.boolean().optional().default(false),
  list: z.boolean().optional().default(false),
  id: numericIdSchema('issue link').optional()
})

/**
 * Validate `unlink`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{confirm: boolean, list: boolean, id?: string}}
 * @throws {TimError} USAGE
 */
export const parseUnlinkOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const readLinks = async (key) => {
  const client = createJiraClient()
  try {
    return await client.getIssueLinks(key)
  } catch (error) {
    throw couldNotReadError({ what: 'issue links', key, error })
  }
}

/**
 * `tim jira unlink`'s full behaviour: list a ticket's issue links, or, only
 * with `confirm`, delete one link by its id.
 *
 * @param {object} args
 * @param {string} [args.key]
 * @param {string} [args.id] - Deletes this issue link; `key` is then not read
 * @param {boolean} args.list
 * @param {boolean} args.confirm
 * @returns {Promise<{mode: 'list', key: string, links: object[]}|{mode: 'dry-run'|'deleted', id: string}>}
 * @throws {TimError} USAGE when the arguments name nothing to do; any error from reading the links or from the delete
 */
export const runUnlink = async ({ key, id, list, confirm }) => {
  if (id) {
    if (!confirm) return { mode: 'dry-run', id }
    await createJiraClient().deleteIssueLink(id)
    return { mode: 'deleted', id }
  }
  if (!key) {
    throw new TimError(
      'USAGE',
      'Give a ticket key with --list, or --id ID to delete.'
    )
  }
  const issueKey = parseIssueKey(key)
  if (!list) {
    throw new TimError(
      'USAGE',
      'Give --list (to see link ids) or --id ID (to delete one).'
    )
  }
  return { mode: 'list', key: issueKey, links: await readLinks(issueKey) }
}

const otherSide = ({ direction, otherKey }) =>
  direction === 'outward' ? `outward -> ${otherKey}` : `inward <- ${otherKey}`

const listLine = (link) => `${link.id}\t${link.type}\t${otherSide(link)}`

const renderList = ({ key, links }) =>
  links.length === 0
    ? `${key} has no issue links`
    : links.map(listLine).join('\n')

export const renderUnlinkResult = (result) => {
  if (result.mode === 'list') return renderList(result)
  if (result.mode === 'dry-run') {
    return [`Would delete: issue link id ${result.id}`, DRY_RUN_NOTICE].join(
      '\n'
    )
  }
  return `Deleted: issue link id ${result.id}`
}

export const register = (jira, { timVersion }) => {
  jira
    .command('unlink [key]')
    .description(
      "List a Jira ticket's issue links with their ids, or delete one link by its id. Deleting is a dry run unless you pass --confirm."
    )
    .option('--list', "List the ticket's issue links and stop")
    .option('--id <id>', 'Delete one issue link by its numeric id')
    .option('--confirm', 'Delete for real (the default is a dry run)')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira unlink EUDPA-368 --list',
        '  tim jira unlink --id 426407',
        '  tim jira unlink --id 426407 --confirm --json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseUnlinkOptions,
        run: ({ args }, opts) => runUnlink({ key: args[0], ...opts }),
        renderText: renderUnlinkResult,
        exitCodeForError: exitCodeForDeletionError,
        timVersion
      })
    )
}
