import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { makeRunAction } from '../_run-action.js'
import { parseIssueKey } from './shared.js'
import {
  AmbiguousFilenameError,
  DRY_RUN_NOTICE,
  couldNotReadError,
  deleteEach,
  exitCodeForDeletionError,
  numericIdSchema
} from './deletion.js'

const optionsSchema = z.object({
  confirm: z.boolean().optional().default(false),
  list: z.boolean().optional().default(false),
  all: z.boolean().optional().default(false),
  id: numericIdSchema('attachment').optional()
})

/**
 * Validate `detach`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{confirm: boolean, list: boolean, all: boolean, id?: string}}
 * @throws {TimError} USAGE
 */
export const parseDetachOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const candidateLine = ({ id, size, created }) =>
  `  id ${id}\t${size} bytes\tcreated ${created}`

const refuseAmbiguousName = ({ key, filename, matches }) => {
  throw new AmbiguousFilenameError(
    [
      `${matches.length} attachments on ${key} are named ${filename}:`,
      ...matches.map(candidateLine),
      'Delete one with --id ID, or all of them with --all.'
    ].join('\n')
  )
}

const readAttachments = async (client, key) => {
  try {
    return await client.listAttachments(key)
  } catch (error) {
    throw couldNotReadError({ what: 'attachments', key, error })
  }
}

const attachmentsNamed = async (client, { key, filename, all }) => {
  const matches = (await readAttachments(client, key)).filter(
    (attachment) => attachment.filename === filename
  )
  if (matches.length === 0) {
    throw new TimError(
      'NOT_FOUND',
      `${key} has no attachment named ${filename}\nRun with --list to see what is there.`
    )
  }
  if (matches.length > 1 && !all) {
    refuseAmbiguousName({ key, filename, matches })
  }
  return matches.map(({ id }) => ({ id, filename }))
}

const deleteAttachments = async (
  client,
  { key, url, attachments, confirm }
) => {
  if (!confirm) return { mode: 'dry-run', key, url, attachments }
  const { deleted, failure } = await deleteEach(attachments, (attachment) =>
    client.deleteAttachment(attachment.id)
  )
  return { mode: 'deleted', key, url, attachments: deleted, failure }
}

/**
 * `tim jira detach`'s full behaviour: list a ticket's attachments, or work
 * out which to delete (one id, or every attachment with a filename) and,
 * only with `confirm`, delete them.
 *
 * @param {object} args
 * @param {string} [args.key]
 * @param {string} [args.filename]
 * @param {string} [args.id] - Deletes this attachment; `key` and `filename` are then not read
 * @param {boolean} args.list
 * @param {boolean} args.all - Delete every attachment named `filename`, not only a sole match
 * @param {boolean} args.confirm
 * @returns {Promise<object>} `mode` is `list`, `dry-run` or `deleted`
 * @throws {AmbiguousFilenameError} When several attachments share `filename` and `all` is false
 * @throws {TimError} USAGE when the arguments name nothing to do; NOT_FOUND when no attachment has `filename`; any error from reading the attachments or from the first delete
 */
export const runDetach = async ({ key, filename, id, list, all, confirm }) => {
  if (id) {
    return deleteAttachments(createJiraClient(), {
      key: null,
      url: null,
      attachments: [{ id, filename: null }],
      confirm
    })
  }
  if (!key) throw new TimError('USAGE', 'Give a ticket key, or --id ID.')
  const issueKey = parseIssueKey(key)
  if (!list && !filename) {
    throw new TimError(
      'USAGE',
      'Give a FILENAME to delete, or --list to see what is there.'
    )
  }
  const client = createJiraClient()
  if (list) {
    return {
      mode: 'list',
      key: issueKey,
      attachments: await readAttachments(client, issueKey)
    }
  }
  const attachments = await attachmentsNamed(client, {
    key: issueKey,
    filename,
    all
  })
  return deleteAttachments(client, {
    key: issueKey,
    url: client.browseUrl(issueKey),
    attachments,
    confirm
  })
}

const listLine = ({ id, filename, size, created }) =>
  `${id}\t${filename}\t${size} bytes\t${created}`

const attachmentLabel = ({ id, filename }) =>
  `${filename ?? 'attachment'} (id ${id})`

const renderList = ({ key, attachments }) =>
  attachments.length === 0
    ? `${key} has no attachments`
    : attachments.map(listLine).join('\n')

const renderDryRun = ({ attachments }) =>
  [
    ...attachments.map(
      (attachment) => `Would delete: ${attachmentLabel(attachment)}`
    ),
    DRY_RUN_NOTICE
  ].join('\n')

const renderDeleted = ({ attachments, url, failure }) =>
  [
    ...attachments.map(
      (attachment) => `Deleted: ${attachmentLabel(attachment)}`
    ),
    ...(url && !failure ? [`URL: ${url}`] : [])
  ].join('\n')

export const renderDetachFailure = (result) => result.failure?.message ?? ''

export const renderDetachResult = (result) => {
  if (result.mode === 'list') return renderList(result)
  if (result.mode === 'dry-run') return renderDryRun(result)
  return renderDeleted(result)
}

export const register = (jira, { timVersion }) => {
  jira
    .command('detach [key] [filename]')
    .description(
      'List the attachments on a Jira ticket, or delete one by its id or by its filename. Deleting is a dry run unless you pass --confirm. A filename that several attachments share is refused unless you pass --all.'
    )
    .option('--list', "List the ticket's attachments and stop")
    .option('--all', 'Delete every attachment with the filename')
    .option('--id <id>', 'Delete one attachment by its numeric id')
    .option('--confirm', 'Delete for real (the default is a dry run)')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira detach EUDPA-333 --list',
        '  tim jira detach EUDPA-333 happy-path.svg --confirm',
        '  tim jira detach EUDPA-333 happy-path.svg --all --confirm',
        '  tim jira detach --id 479899 --confirm --json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseDetachOptions,
        run: ({ args }, opts) =>
          runDetach({ key: args[0], filename: args[1], ...opts }),
        renderText: renderDetachResult,
        renderTextError: renderDetachFailure,
        exitCodeForResult: (result) => (result.failure ? ERROR : OK),
        exitCodeForError: exitCodeForDeletionError,
        timVersion
      })
    )
}
