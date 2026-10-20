import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { createGithubClient } from '../../clients/github-client.js'
import { TimError } from '../../errors.js'
import { resolveGithubToken } from '../auth.js'
import { makeRunAction } from '../_run-action.js'
import { repoNameSchema } from './shared.js'

const requiredText = (message) =>
  z.string({ error: message }).trim().min(1, message)

const argsSchema = z.object({
  repo: repoNameSchema,
  head: requiredText('Give the branch to open the PR from with --head.'),
  base: requiredText('Give the branch to merge into with --base.'),
  title: requiredText('Give the PR title with --title.'),
  bodyFile: requiredText(
    'Give the file that holds the PR description with --body-file.'
  ),
  draft: z.boolean().optional().default(false)
})

/**
 * Validate `create-pr`'s arguments before any request is sent.
 *
 * @param {object} input
 * @returns {{repo: string, head: string, base: string, title: string, bodyFile: string, draft: boolean}}
 * @throws {TimError} USAGE naming the first missing or malformed argument
 */
export const parseCreatePrArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const readBody = async (bodyFile) => {
  try {
    return await readFile(bodyFile, 'utf8')
  } catch (error) {
    throw new TimError(
      'USAGE',
      `Can't read the PR description file ${bodyFile}. Check the path and try again.`,
      error
    )
  }
}

/**
 * `tim github create-pr`'s full behaviour: opens a PR from `head` into
 * `base`, or returns the PR already open for `head` and changes nothing.
 *
 * @param {object} input - The raw arguments, validated by `parseCreatePrArgs`
 * @returns {Promise<{repo: string, number: number, url: string, head: string, base: string, draft: boolean, created: boolean}>}
 * @throws {TimError} USAGE for a bad argument or unreadable body file, before any request
 */
export const runCreatePr = async (input) => {
  const { repo, head, base, title, bodyFile, draft } = parseCreatePrArgs(input)
  const body = await readBody(bodyFile)
  const client = createGithubClient({ token: await resolveGithubToken() })
  return client.openPr(repo, { head, base, title, body, draft })
}

export const renderCreatedPr = ({ url }) => url

export const register = (gh, { timVersion }) => {
  gh.command('create-pr <repo>')
    .description(
      'Open a pull request in a DEFRA repo. If a PR is already open from that branch, show it and open nothing new.'
    )
    .requiredOption('--head <branch>', 'The branch to open the PR from')
    .option('--base <branch>', 'The branch to merge into', 'main')
    .requiredOption('--title <title>', 'The PR title')
    .requiredOption(
      '--body-file <path>',
      'A file holding the PR description, in Markdown'
    )
    .option('--draft', 'Open the PR as a draft')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim github create-pr trade-imports-animals-frontend --head chore/NO_JIRA-tidy-logs --title "Tidy the logs" --body-file pr.md',
        '  tim github create-pr trade-imports-animals-frontend --head chore/NO_JIRA-tidy-logs --title "Tidy the logs" --body-file pr.md --draft --json',
        '',
        'Prints the PR link. With --json, the result gives number, url and',
        'created: false when the PR was already open.'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runCreatePr({
            repo: args[0],
            head: opts.head,
            base: opts.base,
            title: opts.title,
            bodyFile: opts.bodyFile,
            draft: opts.draft
          }),
        renderText: renderCreatedPr,
        timVersion
      })
    )
}
