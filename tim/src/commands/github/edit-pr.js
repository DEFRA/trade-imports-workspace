import { z } from 'zod'
import { createGithubClient } from '../../clients/github-client.js'
import { TimError } from '../../errors.js'
import { resolveGithubToken } from '../auth.js'
import { makeRunAction } from '../_run-action.js'
import { readPrBody, repoNameSchema } from './shared.js'

const NOTHING_TO_CHANGE =
  'Give a new title with --title, a new description with --body-file, or both.'

const argsSchema = z
  .object({
    repo: repoNameSchema,
    number: z.coerce
      .number({ error: 'Give the PR number, such as 145.' })
      .int('Give the PR number, such as 145.')
      .positive('Give the PR number, such as 145.'),
    title: z.string().trim().min(1, 'The title cannot be blank.').optional(),
    bodyFile: z.string().trim().min(1).optional()
  })
  .refine(
    ({ title, bodyFile }) => title !== undefined || bodyFile !== undefined,
    NOTHING_TO_CHANGE
  )

/**
 * Validate `edit-pr`'s arguments before any request is sent.
 *
 * @param {object} input
 * @returns {{repo: string, number: number, title?: string, bodyFile?: string}}
 * @throws {TimError} USAGE naming the first missing or malformed argument
 */
export const parseEditPrArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * `tim github edit-pr`'s full behaviour: replaces an open PR's title, its
 * description, or both, and leaves everything else about it alone.
 *
 * @param {object} input - The raw arguments, validated by `parseEditPrArgs`
 * @returns {Promise<{repo: string, number: number, url: string, title: string}>}
 * @throws {TimError} USAGE for a bad argument or unreadable body file, before any request
 */
export const runEditPr = async (input) => {
  const { repo, number, title, bodyFile } = parseEditPrArgs(input)
  const body = bodyFile === undefined ? undefined : await readPrBody(bodyFile)
  const client = createGithubClient({ token: await resolveGithubToken() })
  return client.rewritePrText(repo, number, { title, body })
}

export const renderEditedPr = ({ url }) => url

export const register = (gh, { timVersion }) => {
  gh.command('edit-pr <repo> <number>')
    .description(
      "Replace a pull request's title, its description, or both. Nothing else about the PR changes."
    )
    .option('--title <title>', 'The new PR title')
    .option(
      '--body-file <path>',
      'A file holding the new PR description, in Markdown'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim github edit-pr trade-imports-workspace 145 --body-file pr.md',
        '  tim github edit-pr trade-imports-workspace 145 --title "Tune each machine" --body-file pr.md --json',
        '',
        'Prints the PR link.'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runEditPr({
            repo: args[0],
            number: args[1],
            title: opts.title,
            bodyFile: opts.bodyFile
          }),
        renderText: renderEditedPr,
        timVersion
      })
    )
}
