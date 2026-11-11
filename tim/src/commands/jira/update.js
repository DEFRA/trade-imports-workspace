import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { parseIssueKey } from './shared.js'
import { makeRunAction } from '../_run-action.js'

const NOTHING_TO_CHANGE =
  'Give something to change: --summary, --description or --description-file.'
const ONE_DESCRIPTION =
  'Give the description with --description or --description-file, not both.'

const optionsSchema = z
  .object({
    summary: z.string().optional(),
    description: z.string().optional(),
    descriptionFile: z.string().optional(),
    confirm: z.boolean().optional().default(false)
  })
  .refine(
    (opts) =>
      opts.description === undefined || opts.descriptionFile === undefined,
    { message: ONE_DESCRIPTION }
  )
  .refine(
    (opts) =>
      opts.summary !== undefined ||
      opts.description !== undefined ||
      opts.descriptionFile !== undefined,
    { message: NOTHING_TO_CHANGE }
  )

/**
 * Validate `update`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{summary?: string, description?: string, descriptionFile?: string, confirm: boolean}}
 * @throws {TimError} USAGE
 */
export const parseUpdateOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const readDescription = async ({ description, descriptionFile }) => {
  if (description !== undefined) return description.trim()
  if (descriptionFile === undefined) return undefined
  try {
    return (await readFile(descriptionFile, 'utf8')).trim()
  } catch (error) {
    throw new TimError(
      'USAGE',
      `Can't read ${descriptionFile}: ${error.message}`,
      error
    )
  }
}

/**
 * The fields that differ from what the ticket holds now. A field given the
 * value it already has is dropped, so a re-run sends nothing rather than a
 * no-op write that still stamps the ticket's history.
 *
 * @param {{summary: string, description: string}} before
 * @param {{summary?: string, description?: string}} wanted
 * @returns {object} Jira's `fields` body, possibly empty
 */
export const changedFields = (before, wanted) => {
  const fields = {}
  if (wanted.summary !== undefined && wanted.summary !== before.summary) {
    fields.summary = wanted.summary
  }
  if (
    wanted.description !== undefined &&
    wanted.description !== (before.description ?? '').trim()
  ) {
    fields.description = wanted.description
  }
  return fields
}

const confirmUpdateLanded = async (client, key, fields) => {
  const after = await client.getTicket(key)
  const stale = Object.keys(changedFields(after, fields))
  if (stale.length > 0) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the update, but ${key} still shows the old ${stale.join(' and ')}. Check the ticket in Jira.`
    )
  }
  return after
}

/**
 * `tim jira update`'s full behaviour: read the wanted summary and
 * description, read the ticket as it stands, and either report the dry run
 * or, with `confirm`, write the fields that differ and read the ticket back
 * to check they landed. A ticket that already holds those values is left
 * alone, so a retry never writes a no-op.
 *
 * @param {{key: string, summary?: string, description?: string, descriptionFile?: string, confirm: boolean}} args
 * @returns {Promise<{mode: 'dry-run'|'updated'|'unchanged', key: string, fields: object, before: object, url?: string, after?: object}>}
 * @throws {TimError} USAGE for a malformed key, an unreadable file or an empty field; UNKNOWN when the read-back still shows the old value
 */
export const runUpdate = async ({
  key,
  summary,
  description,
  descriptionFile,
  confirm
}) => {
  const issueKey = parseIssueKey(key)
  const wantedSummary = summary?.trim()
  if (summary !== undefined && !wantedSummary) {
    throw new TimError('USAGE', 'The summary is empty. Give some text.')
  }
  const wantedDescription = await readDescription({
    description,
    descriptionFile
  })
  if (wantedDescription !== undefined && !wantedDescription) {
    throw new TimError('USAGE', 'The description is empty. Give some text.')
  }

  const client = createJiraClient()
  const before = await client.getTicket(issueKey)
  const fields = changedFields(before, {
    summary: wantedSummary,
    description: wantedDescription
  })
  const summaryOf = { key: issueKey, fields, before }

  if (Object.keys(fields).length === 0) {
    return { mode: 'unchanged', ...summaryOf }
  }
  if (!confirm) return { mode: 'dry-run', ...summaryOf }

  const { url } = await client.updateIssue(issueKey, fields)
  return {
    mode: 'updated',
    ...summaryOf,
    url,
    after: await confirmUpdateLanded(client, issueKey, fields)
  }
}

const fieldNames = (fields) => Object.keys(fields).join(' and ')

export const renderUpdateResult = (result) => {
  if (result.mode === 'unchanged') {
    return `${result.key} already holds those values. Nothing changed.`
  }
  const changes = Object.entries(result.fields).flatMap(([field, value]) => [
    '',
    `${field}:`,
    value
  ])
  if (result.mode === 'dry-run') {
    return [
      `Would change the ${fieldNames(result.fields)} on ${result.key}:`,
      ...changes,
      '',
      'This is a dry run. No request has been sent. Add --confirm to write it for real.'
    ].join('\n')
  }
  return `Changed the ${fieldNames(result.fields)} on ${result.key}. Checked on Jira. ${result.url}`
}

export const register = (jira, { timVersion }) => {
  jira
    .command('update <key>')
    .description(
      "Change a Jira ticket's summary or description, in Jira wiki markup. Dry run by default; --confirm writes it and checks it landed. A field that already holds that value is left alone."
    )
    .option('--summary <text>', 'The new summary (the ticket title)')
    .option('--description <text>', 'The new description')
    .option(
      '--description-file <path>',
      'Read the new description from this file'
    )
    .option(
      '--confirm',
      'Write for real and check it (the default is a dry run)'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira update EUDPA-200 --summary "A clearer title" --json',
        '  tim jira update EUDPA-200 --description-file description.txt --confirm --json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseUpdateOptions,
        run: ({ args }, opts) =>
          runUpdate({
            key: args[0],
            summary: opts.summary,
            description: opts.description,
            descriptionFile: opts.descriptionFile,
            confirm: opts.confirm
          }),
        renderText: renderUpdateResult,
        timVersion
      })
    )
}
