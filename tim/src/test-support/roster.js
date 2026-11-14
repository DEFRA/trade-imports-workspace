import { fileURLToPath } from 'node:url'
import { rosterOf } from '../constants/repos.js'

export const timWorkspaceRoot = fileURLToPath(
  new URL('../../..', import.meta.url)
)

export const bundledRoster = rosterOf(timWorkspaceRoot)
