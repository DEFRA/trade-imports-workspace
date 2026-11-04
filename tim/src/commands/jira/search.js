import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { makeRunAction } from '../_run-action.js'

const MAX_LIMIT = 500

const argsSchema = z.object({
  text: z.string().trim(),
  jql: z.string().trim().min(1).optional(),
  project: z.string().trim().min(1).optional(),
  open: z.boolean().default(false),
  limit: z.coerce
    .number({ message: '--limit must be a whole number.' })
    .int('--limit must be a whole number.')
    .min(1, '--limit must be at least 1.')
    .max(MAX_LIMIT, `--limit can be at most ${MAX_LIMIT}.`)
    .default(50)
})

const quoted = (text) => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/**
 * Validate `search`'s words and options before any request is sent, and
 * build the JQL they stand for. `--jql` is sent as written; otherwise the
 * words become a text search in the project, newest change first.
 *
 * @param {object} input - The search words joined, and the raw options
 * @returns {{jql: string, limit: number}}
 * @throws {TimError} USAGE when nothing to search for is given, when both
 *   words and `--jql` are given, or when no project is named
 */
export const parseSearchArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  const { text, jql, open, limit } = result.data
  if (jql) {
    if (text || open || result.data.project) {
      throw new TimError(
        'USAGE',
        'Give search words or --jql, not both. Put the project and status in the JQL.'
      )
    }
    return { jql, limit }
  }
  if (!text) {
    throw new TimError(
      'USAGE',
      'Give the words to search for, or --jql <query>.'
    )
  }
  const project = result.data.project ?? process.env.JIRA_PROJECT_KEY
  if (!project) {
    throw new TimError(
      'USAGE',
      'Give --project <key>, or set JIRA_PROJECT_KEY.'
    )
  }
  const clauses = [
    `project = ${project}`,
    `text ~ ${quoted(text)}`,
    ...(open ? ['statusCategory != Done'] : [])
  ]
  return { jql: `${clauses.join(' AND ')} ORDER BY updated DESC`, limit }
}

/**
 * The tickets a search matches.
 *
 * @param {object} input - As `parseSearchArgs` takes
 * @returns {Promise<{jql: string, issues: Array<{key: string, summary: string, status: string|null, type: string|null}>}>}
 */
export const runSearch = async (input) => {
  const { jql, limit } = parseSearchArgs(input)
  const client = createJiraClient()
  const issues = await client.searchIssues(jql, { limit })
  return { jql, issues }
}

export const renderSearch = (result) =>
  result.issues.length
    ? result.issues
        .map(
          (issue) =>
            `${issue.key}  [${issue.status ?? '?'}] ${issue.type ?? '?'}  ${issue.summary}`
        )
        .join('\n')
    : `No tickets match: ${result.jql}`

export const register = (jira, { timVersion }) => {
  jira
    .command('search [words...]')
    .description(
      'Search Jira tickets by the words in them, or by a JQL query (read-only)'
    )
    .option(
      '--project <key>',
      'Project to search, e.g. EUDPA (defaults to JIRA_PROJECT_KEY)'
    )
    .option('--open', 'Only tickets that are not done')
    .option('--jql <query>', 'Send this JQL as written, in place of words')
    .option('--limit <n>', `The most tickets to show, up to ${MAX_LIMIT}`, '50')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim jira search commodity MDM --open',
        '  tim jira search "species check" --project EUDPA --json',
        '  tim jira search --jql "parent = EUDPA-125 ORDER BY created DESC"'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runSearch({
            text: (args[0] ?? []).join(' '),
            jql: opts.jql,
            project: opts.project,
            open: opts.open ?? false,
            limit: opts.limit
          }),
        renderText: renderSearch,
        timVersion
      })
    )
}
