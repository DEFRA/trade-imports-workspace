import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { parseIssueKey } from './shared.js'
import { makeRunAction } from '../_run-action.js'

const ONE_SOURCE = 'Give the comment with --body or --file, not both.'

const optionsSchema = z
  .object({
    body: z.string().optional(),
    file: z.string().optional(),
    confirm: z.boolean().optional().default(false)
  })
  .refine((opts) => (opts.body === undefined) !== (opts.file === undefined), {
    message: ONE_SOURCE
  })

/**
 * Validate `comment`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{body?: string, file?: string, confirm: boolean}}
 * @throws {TimError} USAGE
 */
export const parseCommentOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const readBody = async ({ body, file }) => {
  if (body !== undefined) return body.trim()
  try {
    return (await readFile(file, 'utf8')).trim()
  } catch (error) {
    throw new TimError('USAGE', `Can't read ${file}: ${error.message}`, error)
  }
}

const confirmCommentLanded = async (
  client,
  key,
  comment,
  { requiredText = null } = {}
) => {
  const landed = (await client.getComments(key)).find(
    ({ id }) => id === comment.id
  )
  if (!landed) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the comment, but ${key} does not show comment ${comment.id}. Check the ticket in Jira.`
    )
  }
  if (requiredText !== null && landed.body?.trim() !== requiredText) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the edit, but comment ${comment.id} on ${key} does not hold the new text. Check the ticket in Jira.`
    )
  }
  return comment
}

const writeComment = async (client, { key, text, replaceCommentId }) => {
  if (replaceCommentId === undefined) {
    const comment = await client.addComment(key, text)
    return {
      mode: 'commented',
      comment: await confirmCommentLanded(client, key, comment)
    }
  }
  const comment = await client.editComment(key, replaceCommentId, text)
  return {
    mode: 'edited',
    comment: await confirmCommentLanded(client, key, comment, {
      requiredText: text
    })
  }
}

/**
 * `tim jira comment`'s full behaviour: read the comment text, read the
 * ticket's comments, and either report the dry run or, with `confirm`, post
 * it and read the comments back to check it landed. A ticket that already
 * has a comment with the same text is left alone, so a retry never posts a
 * duplicate.
 *
 * With `replaceCommentId`, `confirm` edits that comment in place instead of
 * adding one, and the read-back checks that the comment now holds the text.
 *
 * @param {{key: string, body?: string, file?: string, confirm: boolean, replaceCommentId?: string}} args
 * @returns {Promise<{mode: 'dry-run'|'commented'|'edited'|'unchanged', key: string, body: string, replaceCommentId?: string, comment?: object}>}
 * @throws {TimError} USAGE for a malformed key, an unreadable file or an empty comment; UNKNOWN when the read-back misses the comment or its new text
 */
export const runComment = async ({
  key,
  body,
  file,
  confirm,
  replaceCommentId
}) => {
  const issueKey = parseIssueKey(key)
  const text = await readBody({ body, file })
  if (!text) {
    throw new TimError('USAGE', 'The comment is empty. Give some text.')
  }
  const client = createJiraClient()
  const summary = {
    key: issueKey,
    body: text,
    ...(replaceCommentId === undefined ? {} : { replaceCommentId })
  }

  const existing = (await client.getComments(issueKey)).find(
    (comment) => comment.body?.trim() === text
  )
  if (existing) return { mode: 'unchanged', ...summary, comment: existing }
  if (!confirm) return { mode: 'dry-run', ...summary }

  return {
    ...summary,
    ...(await writeComment(client, { key: issueKey, text, replaceCommentId }))
  }
}

export const renderCommentResult = (result) => {
  if (result.mode === 'unchanged') {
    return `${result.key} already has this comment (${result.comment.id}). Nothing changed.`
  }
  if (result.mode === 'edited') {
    return `Edited comment ${result.comment.id} on ${result.key}. Checked on Jira.`
  }
  if (result.mode === 'dry-run') {
    return [
      result.replaceCommentId === undefined
        ? `Would add this comment to ${result.key}:`
        : `Would replace comment ${result.replaceCommentId} on ${result.key} with this text:`,
      '',
      result.body,
      '',
      'This is a dry run. No request has been sent. Add --confirm to post it for real.'
    ].join('\n')
  }
  return `Added comment ${result.comment.id} to ${result.key}. Checked on Jira.`
}

export const register = (jira, { timVersion }) => {
  jira
    .command('comment <key>')
    .description(
      'Add a comment to a Jira ticket, in Jira wiki markup. Dry run by default; --confirm posts it and checks it landed. A ticket that already has the same comment is left alone.'
    )
    .option('--body <text>', 'The comment text')
    .option('--file <path>', 'Read the comment text from this file')
    .option(
      '--confirm',
      'Post for real and check it (the default is a dry run)'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira comment EUDPA-200 --body "Fixed on main." --json',
        '  tim jira comment EUDPA-200 --file comment.txt --confirm --json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseCommentOptions,
        run: ({ args }, opts) =>
          runComment({
            key: args[0],
            body: opts.body,
            file: opts.file,
            confirm: opts.confirm
          }),
        renderText: renderCommentResult,
        timVersion
      })
    )
}
