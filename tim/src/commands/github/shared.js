import { z } from 'zod'

const REPO_NAME = /^[A-Za-z0-9._-]+$/
const REPO_NAME_MESSAGE =
  'Give the repo name without the DEFRA/ prefix, for example trade-imports-animals-frontend.'

export const repoNameSchema = z
  .string({ error: REPO_NAME_MESSAGE })
  .trim()
  .regex(REPO_NAME, REPO_NAME_MESSAGE)
