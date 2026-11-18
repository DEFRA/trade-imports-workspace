import { existsSync, mkdirSync } from 'node:fs'
import { readJsonFile } from '../backlog/io.js'
import { checkFilePaths, checkFolder } from './paths.js'
import { rawFolder } from './pull-requests.js'

/**
 * Starts a ticket's check. A check that already has `.interview-meta.json`
 * resumes; otherwise the raw folder is made ready for what `gh` gives
 * back.
 *
 * @param {{workspaceRoot: string, ticket: string}} args
 * @returns {{mode: 'RESUME', checkDir: string, meta: object} | {mode: 'FRESH', checkDir: string, rawDir: string}}
 * @throws {TimError} PARSE when the existing meta is not valid JSON
 */
export const startCheck = ({ workspaceRoot, ticket }) => {
  const checkDir = checkFolder(workspaceRoot, ticket)
  const { meta } = checkFilePaths(checkDir)
  if (existsSync(meta)) {
    return { mode: 'RESUME', checkDir, meta: readJsonFile(meta) }
  }
  const rawDir = rawFolder(checkDir)
  mkdirSync(rawDir, { recursive: true })
  return { mode: 'FRESH', checkDir, rawDir }
}

const resumeText = ({ checkDir, meta }) =>
  [
    'MODE: RESUME',
    '',
    `Existing run found at: ${checkDir}`,
    'Meta:',
    JSON.stringify(meta, null, 2),
    '',
    'Inspect the directory and resume from the next pending step (see SKILL.md Step 0).'
  ].join('\n')

const freshText = ({ checkDir, rawDir }) =>
  [
    'MODE: FRESH',
    '',
    `Check folder: ${checkDir}`,
    `Raw folder: ${rawDir}`,
    '',
    'Save the pull requests into the raw folder with gh, then run tim understanding-check prepare (see SKILL.md Step 1).'
  ].join('\n')

/**
 * What `start` prints: the mode on the first line, then what to do next.
 *
 * @param {ReturnType<typeof startCheck>} started
 * @returns {string}
 */
export const startText = (started) =>
  started.mode === 'RESUME' ? resumeText(started) : freshText(started)
