import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { TimError } from '../../errors.js'

/**
 * The text of a Markdown file that becomes a PR description or comment.
 *
 * @param {string} textFile
 * @param {object} [opts]
 * @param {string} [opts.describedAs='PR description'] - What the file holds, named in the error message
 * @returns {Promise<string>}
 * @throws {TimError} USAGE when the file cannot be read
 */
export const readPrText = async (
  textFile,
  { describedAs = 'PR description' } = {}
) => {
  try {
    return await readFile(textFile, 'utf8')
  } catch (error) {
    throw new TimError(
      'USAGE',
      `Can't read the ${describedAs} file ${textFile}. Check the path and try again.`,
      error
    )
  }
}

const REPO_NAME = /^[A-Za-z0-9._-]+$/
const REPO_NAME_MESSAGE =
  'Give the repo name without the DEFRA/ prefix, for example trade-imports-animals-frontend.'

export const repoNameSchema = z
  .string({ error: REPO_NAME_MESSAGE })
  .trim()
  .regex(REPO_NAME, REPO_NAME_MESSAGE)

const PR_NUMBER_MESSAGE = 'Give the PR number, such as 145.'

export const prNumberSchema = z.coerce
  .number({ error: PR_NUMBER_MESSAGE })
  .int(PR_NUMBER_MESSAGE)
  .positive(PR_NUMBER_MESSAGE)
