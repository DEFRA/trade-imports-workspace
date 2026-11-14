import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { currentBranch } from './git.js'

const MODES = ['STUB', 'START', 'WRITE', 'MERGE', 'STALE']

const PHRASE_MODES = [
  ['STALE', ['stale', 'out of date']],
  ['STUB', ['stub', /split.*off/]],
  ['MERGE', ['merge']],
  ['START', ['loop is starting', 'build is starting', 'starting on']]
]

const lowerCaseAscii = (text) =>
  text.replace(/[A-Z]/g, (letter) => letter.toLowerCase())

const upperCaseAscii = (text) =>
  text.replace(/[a-z]/g, (letter) => letter.toUpperCase())

const phraseMatches = (phrase, pattern) =>
  typeof pattern === 'string' ? phrase.includes(pattern) : pattern.test(phrase)

/**
 * The point in a theme's life a trigger phrase names: STALE, STUB, MERGE
 * or START when the phrase says so, otherwise WRITE.
 *
 * @param {string} trigger
 * @returns {'STUB'|'START'|'WRITE'|'MERGE'|'STALE'}
 */
export const modeOfTrigger = (trigger) => {
  const phrase = lowerCaseAscii(trigger)
  const matched = PHRASE_MODES.find(([, patterns]) =>
    patterns.some((pattern) => phraseMatches(phrase, pattern))
  )
  return matched ? matched[0] : 'WRITE'
}

const chosenMode = (mode, trigger) => {
  if (!mode) return modeOfTrigger(trigger)
  const named = upperCaseAscii(mode)
  if (!MODES.includes(named)) {
    throw new TimError(
      'USAGE',
      `tim theme-ticket start: unknown --mode ${named} (STUB, START, WRITE, MERGE, STALE)`
    )
  }
  return named
}

const byCodePoint = (left, right) => {
  if (left < right) return -1
  return left > right ? 1 : 0
}

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const themesIn = (workareaDir) => {
  const themesDir = join(workareaDir, 'themes')
  if (!isFolder(themesDir)) return []
  return readdirSync(themesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(byCodePoint)
}

const createdKeyIn = (folder) => {
  const created = join(folder, 'ticket.created.json')
  if (!existsSync(created)) return ''
  const key = JSON.parse(readFileSync(created, 'utf8')).key
  if (key === null || key === undefined || key === false) return ''
  return String(key)
}

const existingTicketsIn = (ticketsDir) =>
  readdirSync(ticketsDir)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => isFolder(join(ticketsDir, name)))
    .sort(byCodePoint)
    .map((folder) => ({
      folder,
      key: createdKeyIn(join(ticketsDir, folder))
    }))

/**
 * Starts the theme-ticket skill: works out the mode, makes sure the
 * workarea has a `tickets/` folder, and lists the ticket folders already
 * there with the Jira key each one produced.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.trigger] - The trigger phrase, read when `mode` is left out
 * @param {string} [args.workarea] - A path under `workareas/`
 * @param {string} [args.theme] - Needed by every mode except STALE
 * @param {string} [args.mode] - STUB, START, WRITE, MERGE or STALE, in any case
 * @returns {Promise<{mode: string, workarea: string, theme: string|null, branch: string, workareaDir: string, ticketsDir: string, existingTickets: Array<{folder: string, key: string}>}>}
 * @throws {TimError} USAGE without a workarea, for an unknown mode, or without a theme where the mode needs one; NOT_FOUND when the workarea is missing
 */
export const startThemeTicket = async ({
  workspaceRoot,
  trigger = '',
  workarea,
  theme,
  mode
}) => {
  if (!workarea) {
    throw new TimError(
      'USAGE',
      'tim theme-ticket start: --workarea is required (a path under workareas/, e.g. shared/design-release-2-1)'
    )
  }
  const workareaDir = `${workspaceRoot}/workareas/${workarea}`
  if (!isFolder(workareaDir)) {
    throw new TimError(
      'NOT_FOUND',
      `tim theme-ticket start: no workarea at ${workareaDir}`
    )
  }
  const ticketsDir = `${workareaDir}/tickets`
  mkdirSync(ticketsDir, { recursive: true })
  const branch = await currentBranch(workspaceRoot)
  const namedMode = chosenMode(mode, trigger)

  if (namedMode !== 'STALE' && !theme) {
    throw new TimError(
      'USAGE',
      [
        `tim theme-ticket start: --theme is required for mode ${namedMode}`,
        'Themes in this workarea:',
        ...themesIn(workareaDir)
      ].join('\n')
    )
  }

  return {
    mode: namedMode,
    workarea,
    theme: theme || null,
    branch,
    workareaDir,
    ticketsDir,
    existingTickets: existingTicketsIn(ticketsDir)
  }
}

/**
 * What `tim theme-ticket start` prints: `MODE: <NAME>`, then the result
 * as indented JSON.
 *
 * @param {object} result - From {@link startThemeTicket}
 * @returns {string}
 */
export const renderStartText = (result) =>
  `MODE: ${result.mode}\n${JSON.stringify(result, null, 2)}`
