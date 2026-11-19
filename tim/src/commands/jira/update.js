import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { issueKeySchema, parseIssueKey } from './shared.js'
import { makeRunAction } from '../_run-action.js'

const PRIORITIES = ['Lowest', 'Low', 'Medium', 'High', 'Highest']
const NO_PARENT = 'none'

const NOTHING_TO_CHANGE =
  'Give something to change: --summary, --description, --description-file, --priority, --parent, --labels or --add-label.'
const ONE_DESCRIPTION =
  'Give the description with --description or --description-file, not both.'
const PRIORITY_MESSAGE =
  'Give a priority of Lowest, Low, Medium, High or Highest.'
const PARENT_MESSAGE =
  'Give the parent as a Jira ticket key, for example EUDPA-215, or none to take the parent away.'

const parentSchema = z
  .string()
  .refine(
    (parent) =>
      parent === NO_PARENT || issueKeySchema.safeParse(parent).success,
    { message: PARENT_MESSAGE }
  )

const optionsSchema = z
  .object({
    summary: z.string().optional(),
    description: z.string().optional(),
    descriptionFile: z.string().optional(),
    priority: z.enum(PRIORITIES, { error: PRIORITY_MESSAGE }).optional(),
    parent: parentSchema.optional(),
    labels: z.string().optional(),
    addLabel: z.array(z.string()).optional(),
    confirm: z.boolean().optional().default(false)
  })
  .refine(
    (opts) =>
      opts.description === undefined || opts.descriptionFile === undefined,
    { message: ONE_DESCRIPTION }
  )
  .refine(
    (opts) =>
      [
        opts.summary,
        opts.description,
        opts.descriptionFile,
        opts.priority,
        opts.parent,
        opts.labels,
        opts.addLabel
      ].some((value) => value !== undefined),
    { message: NOTHING_TO_CHANGE }
  )

/**
 * Validate `update`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{summary?: string, description?: string, descriptionFile?: string, priority?: string, parent?: string, labels?: string, addLabel?: string[], confirm: boolean}}
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

const sortedLabels = (labels) => [...labels].sort()

const sameLabels = (left, right) =>
  sortedLabels(left).join('\n') === sortedLabels(right).join('\n')

const labelsWithAdded = (existing, added) =>
  sortedLabels(new Set([...existing, ...added]))

const fieldHoldsValue = {
  summary: (before, wanted) => before.summary === wanted,
  description: (before, wanted) => (before.description ?? '').trim() === wanted,
  priority: (before, wanted) => before.priority === wanted,
  parent: (before, wanted) => before.parent === wanted,
  labels: (before, wanted) => sameLabels(before.labels ?? [], wanted)
}

/**
 * The fields that differ from what the ticket holds now. A field given the
 * value it already has is dropped, so a re-run sends nothing rather than a
 * no-op write that still stamps the ticket's history. Labels compare as a
 * set, so their order never counts as a change.
 *
 * @param {{summary: string, description: string, priority: string|null, parent: string|null, labels: string[]}} before
 * @param {{summary?: string, description?: string, priority?: string, parent?: string|null, labels?: string[]}} wanted
 * @returns {object} The wanted values that differ, possibly empty
 */
export const changedFields = (before, wanted) =>
  Object.fromEntries(
    Object.entries(wanted).filter(
      ([field, value]) =>
        value !== undefined && !fieldHoldsValue[field](before, value)
    )
  )

const jiraValueOf = {
  priority: (priority) => ({ name: priority }),
  parent: (parent) => (parent === null ? null : { key: parent })
}

/**
 * Jira's `fields` body for the changed values: a priority goes by name, a
 * parent by key, and no parent as `null`.
 *
 * @param {object} changes - What `changedFields` returned
 * @returns {object}
 */
export const jiraFieldsOf = (changes) =>
  Object.fromEntries(
    Object.entries(changes).map(([field, value]) => [
      field,
      jiraValueOf[field] ? jiraValueOf[field](value) : value
    ])
  )

const confirmUpdateLanded = async (client, key, changes) => {
  const after = await client.getTicket(key)
  const stale = Object.keys(changedFields(after, changes))
  if (stale.length > 0) {
    throw new TimError(
      'UNKNOWN',
      `Jira accepted the update, but ${key} still shows the old ${stale.join(' and ')}. Check the ticket in Jira.`
    )
  }
  return after
}

const requireText = (value, field) => {
  if (value !== undefined && !value) {
    throw new TimError('USAGE', `The ${field} is empty. Give some text.`)
  }
}

const wantedParent = (parent) => {
  if (parent === undefined) return undefined
  return parent === NO_PARENT ? null : parent.trim()
}

const wantedLabels = ({ labels, addLabel }, before) => {
  if (labels !== undefined) return labels.split(',')
  if (addLabel === undefined) return undefined
  return labelsWithAdded(before.labels ?? [], addLabel)
}

/**
 * `tim jira update`'s full behaviour: read the wanted values, read the
 * ticket as it stands, and either report the dry run or, with `confirm`,
 * write the fields that differ and read the ticket back to check they
 * landed. A ticket that already holds those values is left alone, so a
 * retry never writes a no-op.
 *
 * `labels` is a comma-separated list that replaces the ticket's labels.
 * `addLabel` adds to the labels the ticket has, and is not used when
 * `labels` is given. `parent` of `'none'` takes the parent away.
 *
 * @param {{key: string, summary?: string, description?: string, descriptionFile?: string, priority?: string, parent?: string, labels?: string, addLabel?: string[], confirm: boolean}} args
 * @returns {Promise<{mode: 'dry-run'|'updated'|'unchanged', key: string, fields: object, before: object, url?: string, after?: object}>}
 * @throws {TimError} USAGE for a malformed key, an unreadable file or an empty field; UNKNOWN when the read-back still shows the old value
 */
export const runUpdate = async ({
  key,
  summary,
  description,
  descriptionFile,
  priority,
  parent,
  labels,
  addLabel,
  confirm
}) => {
  const issueKey = parseIssueKey(key)
  const wantedSummary = summary?.trim()
  requireText(wantedSummary, 'summary')
  const wantedDescription = await readDescription({
    description,
    descriptionFile
  })
  requireText(wantedDescription, 'description')
  requireText(labels, 'list of labels')

  const client = createJiraClient()
  const before = await client.getTicket(issueKey)
  const fields = changedFields(before, {
    summary: wantedSummary,
    description: wantedDescription,
    priority,
    parent: wantedParent(parent),
    labels: wantedLabels({ labels, addLabel }, before)
  })
  const summaryOf = { key: issueKey, fields, before }

  if (Object.keys(fields).length === 0) {
    return { mode: 'unchanged', ...summaryOf }
  }
  if (!confirm) return { mode: 'dry-run', ...summaryOf }

  const { url } = await client.updateIssue(issueKey, jiraFieldsOf(fields))
  return {
    mode: 'updated',
    ...summaryOf,
    url,
    after: await confirmUpdateLanded(client, issueKey, fields)
  }
}

const fieldNames = (fields) => Object.keys(fields).join(' and ')

const shownValue = (value) => {
  if (value === null) return NO_PARENT
  if (Array.isArray(value)) return value.join(', ')
  return value
}

export const renderUpdateResult = (result) => {
  if (result.mode === 'unchanged') {
    return `${result.key} already holds those values. Nothing changed.`
  }
  const changes = Object.entries(result.fields).flatMap(([field, value]) => [
    '',
    `${field}:`,
    shownValue(value)
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

const collectLabel = (label, labels = []) => [...labels, label]

export const register = (jira, { timVersion }) => {
  jira
    .command('update <key>')
    .description(
      "Change a Jira ticket's summary, description (in Jira wiki markup), priority, parent or labels. Dry run by default; --confirm writes it and checks it landed. A field that already holds that value is left alone."
    )
    .option('--summary <text>', 'The new summary (the ticket title)')
    .option('--description <text>', 'The new description')
    .option(
      '--description-file <path>',
      'Read the new description from this file'
    )
    .option('--priority <level>', 'Lowest, Low, Medium, High or Highest')
    .option(
      '--parent <key>',
      'The parent epic, or none to take the parent away'
    )
    .option(
      '--labels <labels>',
      'Comma-separated labels that replace the ones the ticket has'
    )
    .option(
      '--add-label <label>',
      'Add a label to the ones the ticket has. Repeat it to add more. Not used with --labels',
      collectLabel
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
        '  tim jira update EUDPA-200 --description-file description.txt --confirm --json',
        '  tim jira update EUDPA-200 --priority High --add-label urgent --confirm',
        '  tim jira update EUDPA-200 --parent none --confirm'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: parseUpdateOptions,
        run: ({ args }, opts) => runUpdate({ key: args[0], ...opts }),
        renderText: renderUpdateResult,
        timVersion
      })
    )
}
