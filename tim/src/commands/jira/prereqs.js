import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ERROR, OK } from '../../constants/exitCodes.js'
import {
  parseCapabilityMap,
  renderList,
  renderRefusal
} from '../../capabilities/extract.js'
import {
  CAPABILITY_MAP_PAGE_ID,
  capabilityMapPathOf,
  syncedVersionOf
} from '../../capabilities/synced-map.js'
import { createConfluenceClient } from '../../clients/confluence-client.js'
import { createJiraClient } from '../../clients/jira-client.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { makeRunAction } from '../_run-action.js'
import { exitCodeForBoardError, readBoard } from './board-read.js'
import { parseEpicsOptions, renderEpics } from './epics.js'

const DEFAULT_BOARD = '13780'
const DEFAULT_FLOOR = '20'

export const prereqsFolderOf = (workspaceRoot) =>
  join(workspaceRoot, 'workareas', 'ticket-creation', '.prereqs')

const asFileText = (text) => (text === null ? '' : `${text}\n`)

const lineCountOf = (text) => text.split('\n').length - 1

const writeEpics = async ({ outputDir, board }) => {
  const epicsFile = join(outputDir, 'epics.txt')
  try {
    const epics = await readBoard(() =>
      createJiraClient().listBoardEpics(board, { includeDone: false })
    )
    const text = asFileText(renderEpics({ board, epics }))
    await writeFile(epicsFile, text)
    return lineCountOf(text)
  } catch (error) {
    await writeFile(epicsFile, '')
    throw error
  }
}

const readLiveVersion = async (capPage) => {
  try {
    const { version } = await createConfluenceClient().getPage(capPage)
    return {
      liveVersion:
        version === null || version === undefined ? '' : String(version),
      liveVersionError: ''
    }
  } catch (error) {
    return { liveVersion: '', liveVersionError: error.message ?? String(error) }
  }
}

const staleWarningOf = (syncedVersion, liveVersion) =>
  liveVersion !== '' && syncedVersion !== '' && liveVersion !== syncedVersion
    ? `Synced capability map is at version ${syncedVersion}; live page is at version ${liveVersion}. Re-run tim confluence sync to refresh.`
    : ''

const uniqueSortedLines = (text) =>
  text === null ? [] : [...new Set(text.split('\n'))].sort()

const replaceFile = async (path, text) => {
  const partial = `${path}.${process.pid}.partial`
  await writeFile(partial, text)
  await rename(partial, path)
}

const writeCapabilities = async ({ capsFile, mapText }) => {
  const parsed = parseCapabilityMap(mapText)
  if (parsed.violations.length > 0) {
    return {
      parseError:
        'Capability map is not canonical — see tim capabilities check. capabilities.txt left unchanged.',
      refusal: renderRefusal(parsed)
    }
  }
  const lines = uniqueSortedLines(renderList(parsed))
  await replaceFile(capsFile, lines.map((line) => `${line}\n`).join(''))
  return { parseError: '', refusal: '' }
}

const refreshCapabilities = async ({ mapPath, capsFile, capPage }) => {
  if (!existsSync(mapPath)) {
    await writeFile(capsFile, '')
    return {
      staleWarning: `No synced capability map found at ${mapPath} — run tim confluence sync to populate docs/confluence/.`,
      liveVersionError: '',
      parseError: '',
      refusal: ''
    }
  }
  const mapText = readFileSync(mapPath, 'utf8')
  const { liveVersion, liveVersionError } = await readLiveVersion(capPage)
  return {
    staleWarning: staleWarningOf(syncedVersionOf(mapText), liveVersion),
    liveVersionError,
    ...(await writeCapabilities({ capsFile, mapText }))
  }
}

const capabilityCountOf = (capsFile) =>
  existsSync(capsFile) ? lineCountOf(readFileSync(capsFile, 'utf8')) : 0

const floorErrorOf = (capCount, floor) =>
  capCount < (Number.parseInt(floor, 10) || 0)
    ? `Only ${capCount} capabilities extracted, below the floor of ${floor}. The capability tables have probably changed shape.`
    : ''

const secondsTimestamp = (date) => date.toISOString().replace(/\.\d+Z$/, 'Z')

/**
 * Write the ticket-creator's session-start files under
 * `workareas/ticket-creation/.prereqs/`: the board's open epics in
 * epics.txt, the capability codes from the synced capability map in
 * capabilities.txt, and meta.json. capabilities.txt is replaced only when
 * the map is canonical; a map below the floor or out of date is reported in
 * meta.json and the result.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} opts.board - Agile board id
 * @param {string} opts.capPage - Confluence page id of the capability map
 * @param {string} opts.floor - The fewest capability codes a good map gives
 * @param {Date} [opts.now]
 * @returns {Promise<{outputDir: string, board: string, capPage: string, epicCount: number, capCount: number, staleWarning: string, liveVersionError: string, parseError: string, refusal: string}>} Each message is '' when there is none; `liveVersionError` says why the live version could not be read, which leaves the map unchecked for staleness
 * @throws {BoardReadError} when Jira will not list the board's epics; epics.txt is then left empty
 */
export const writePrereqs = async ({
  workspaceRoot,
  board,
  capPage,
  floor,
  now = new Date()
}) => {
  const outputDir = prereqsFolderOf(workspaceRoot)
  const capsFile = join(outputDir, 'capabilities.txt')
  await mkdir(outputDir, { recursive: true })
  const epicCount = await writeEpics({ outputDir, board })
  const capabilities = await refreshCapabilities({
    mapPath: capabilityMapPathOf(workspaceRoot),
    capsFile,
    capPage
  })
  const capCount = capabilityCountOf(capsFile)
  const parseError = capabilities.parseError || floorErrorOf(capCount, floor)
  const meta = {
    board,
    cap_page: capPage,
    generated: secondsTimestamp(now),
    epic_count: epicCount,
    cap_count: capCount,
    stale_warning: capabilities.staleWarning,
    parse_error: parseError
  }
  await writeFile(
    join(outputDir, 'meta.json'),
    `${JSON.stringify(meta, null, 2)}\n`
  )
  return {
    outputDir,
    board,
    capPage,
    epicCount,
    capCount,
    staleWarning: capabilities.staleWarning,
    liveVersionError: capabilities.liveVersionError,
    parseError,
    refusal: capabilities.refusal
  }
}

const capabilitiesLine = ({ parseError, capCount, capPage }) =>
  parseError
    ? `  - capabilities.txt   NOT REFRESHED — still holds ${capCount} codes from a previous run`
    : `  - capabilities.txt   (${capCount} capability codes from page ${capPage})`

const noticeLines = (label, text) => (text ? ['', `  ${label}: ${text}`] : [])

export const renderPrereqs = (result) =>
  [
    `Prepared ticket-creation prereqs at ${result.outputDir}/`,
    `  - epics.txt          (${result.epicCount} active epics from board ${result.board})`,
    capabilitiesLine(result),
    '  - meta.json',
    ...noticeLines('WARNING', result.staleWarning),
    ...noticeLines('ERROR', result.parseError)
  ].join('\n')

const parsePrereqsOptions = (opts) => ({
  workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
  board: parseEpicsOptions({ board: opts.board }).board,
  capPage: opts.capPage,
  floor: process.env.MIN_CAPABILITIES || DEFAULT_FLOOR
})

/**
 * `tim jira prereqs`.
 *
 * @param {import('commander').Command} jira
 * @param {{timVersion: string}} options
 */
export const register = (jira, { timVersion }) =>
  jira
    .command('prereqs')
    .description(
      "Write the ticket-creator's session-start files to workareas/ticket-creation/.prereqs/: the board's open epics (epics.txt), the codes from the synced capability map (capabilities.txt, replaced only when the map is canonical and gives at least MIN_CAPABILITIES codes, default 20) and meta.json. Prints a WARNING line when the synced map is behind Confluence, and an ERROR line, exiting 1, when the codes could not be refreshed."
    )
    .option(
      '--board <id>',
      'agile board to list open epics from',
      DEFAULT_BOARD
    )
    .option(
      '--cap-page <id>',
      'Confluence page of the capability map, to compare versions with',
      CAPABILITY_MAP_PAGE_ID
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim jira prereqs\n  tim jira prereqs --board 13780 --cap-page 6468764101 --json'
    )
    .action(
      makeRunAction({
        parseOptions: parsePrereqsOptions,
        run: (_, parsed) => writePrereqs(parsed),
        renderText: renderPrereqs,
        renderTextError: (result) => result.refusal,
        exitCodeForResult: (result) => (result.parseError ? ERROR : OK),
        exitCodeForError: exitCodeForBoardError,
        timVersion
      })
    )
