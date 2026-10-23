import { z } from 'zod'
import { createGithubClient } from '../../clients/github-client.js'
import { TimError } from '../../errors.js'
import { resolveGithubToken } from '../auth.js'
import { makeRunAction } from '../_run-action.js'
import { prNumberSchema, readPrText, repoNameSchema } from './shared.js'

const argsSchema = z.object({
  repo: repoNameSchema,
  number: prNumberSchema,
  commentFile: z.string().trim().min(1).optional()
})

/**
 * Validate `close-pr`'s arguments before any request is sent.
 *
 * @param {object} input
 * @returns {{repo: string, number: number, commentFile?: string}}
 * @throws {TimError} USAGE naming the first missing or malformed argument
 */
export const parseClosePrArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * `tim github close-pr`'s full behaviour: posts the comment file's text on an
 * open PR when one is given, then closes the PR without merging it.
 *
 * @param {object} input - The raw arguments, validated by `parseClosePrArgs`
 * @returns {Promise<{repo: string, number: number, url: string, title: string, state: string, commented: boolean}>}
 * @throws {TimError} USAGE for a bad argument or unreadable comment file, before any request
 */
export const runClosePr = async (input) => {
  const { repo, number, commentFile } = parseClosePrArgs(input)
  const comment =
    commentFile === undefined
      ? undefined
      : await readPrText(commentFile, { describedAs: 'PR comment' })
  const client = createGithubClient({ token: await resolveGithubToken() })
  return client.closePr(repo, number, { comment })
}

export const renderClosedPr = ({ url }) => url

export const register = (gh, { timVersion }) => {
  gh.command('close-pr <repo> <number>')
    .description(
      'Close a pull request without merging it. You can post a comment on it first.'
    )
    .option(
      '--comment-file <path>',
      'A file holding a comment to post before closing, in Markdown'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim github close-pr trade-imports-workspace 145',
        '  tim github close-pr trade-imports-workspace 145 --comment-file superseded.md --json',
        '',
        'Prints the PR link.'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runClosePr({
            repo: args[0],
            number: args[1],
            commentFile: opts.commentFile
          }),
        renderText: renderClosedPr,
        timVersion
      })
    )
}
