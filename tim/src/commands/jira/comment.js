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

const confirmCommentLanded = async (client, key, comment) => {
  const comments = await client.getComments(key)
  if (!comments.some(({ id }) => id === comment.id)) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the comment, but ${key} does not show comment ${comment.id}. Check the ticket in Jira.`
    )
  }
  return comment
}

/**
 * `tim jira comment`'s full behaviour: read the comment text, read the
 * ticket's comments, and either report the dry run or, with `confirm`, post
 * it and read the comments back to check it landed. A ticket that already
 * has a comment with the same text is left alone, so a retry never posts a
 * duplicate.
 *
 * @param {{key: string, body?: string, file?: string, confirm: boolean}} args
 * @returns {Promise<{mode: 'dry-run'|'commented'|'unchanged', key: string, body: string, comment?: object}>}
 * @throws {TimError} USAGE for a malformed key, an unreadable file or an empty comment; UNKNOWN when the read-back misses the comment
 */
export const runComment = async ({ key, body, file, confirm }) => {
  const issueKey = parseIssueKey(key)
  const text = await readBody({ body, file })
  if (!text) {
    throw new TimError('USAGE', 'The comment is empty. Give some text.')
  }
  const client = createJiraClient()
  const summary = { key: issueKey, body: text }

  const existing = (await client.getComments(issueKey)).find(
    (comment) => comment.body?.trim() === text
  )
  if (existing) return { mode: 'unchanged', ...summary, comment: existing }
  if (!confirm) return { mode: 'dry-run', ...summary }

  const comment = await client.addComment(issueKey, text)
  return {
    mode: 'commented',
    ...summary,
    comment: await confirmCommentLanded(client, issueKey, comment)
  }
}

export const renderCommentResult = (result) => {
  if (result.mode === 'unchanged') {
    return `${result.key} already has this comment (${result.comment.id}). Nothing changed.`
  }
  if (result.mode === 'dry-run') {
    return [
      `Would add this comment to ${result.key}:`,
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
