import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { TimError } from '../../errors.js'

/**
 * The PR description held in a Markdown file.
 *
 * @param {string} bodyFile
 * @returns {Promise<string>}
 * @throws {TimError} USAGE when the file cannot be read
 */
export const readPrBody = async (bodyFile) => {
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

const REPO_NAME = /^[A-Za-z0-9._-]+$/
const REPO_NAME_MESSAGE =
  'Give the repo name without the DEFRA/ prefix, for example trade-imports-animals-frontend.'

export const repoNameSchema = z
  .string({ error: REPO_NAME_MESSAGE })
  .trim()
  .regex(REPO_NAME, REPO_NAME_MESSAGE)
