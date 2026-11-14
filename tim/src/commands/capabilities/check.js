import { existsSync, readFileSync } from 'node:fs'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { parseCapabilityMap } from '../../capabilities/extract.js'
import {
  checkReportOf,
  renderRowTable,
  renderRuleLines,
  renderUndocumentedStatusLines
} from '../../capabilities/check-report.js'
import {
  CAPABILITY_MAP_PAGE_ID,
  capabilityMapPathOf,
  syncedVersionOf
} from '../../capabilities/synced-map.js'
import {
  createConfluenceClient,
  pageIdFrom
} from '../../clients/confluence-client.js'
import { syncConfluence } from '../../confluence/sync.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { makeRunAction } from '../_run-action.js'
import { writeLine } from '../_write-line.js'

const REFRESH_FAILED_WARNING = [
  '⚠ Could not refresh from Confluence — reporting on the local copy,',
  '  which may not include your latest edit.',
  ''
].join('\n')

const NO_ROWS_MESSAGE =
  'No capability rows found at all — the table shape has changed.'

const readVersion = (mapPath) => syncedVersionOf(readFileSync(mapPath, 'utf8'))

const refreshMap = async ({ workspaceRoot, capPage }) => {
  await syncConfluence({
    client: createConfluenceClient(),
    workspaceRoot,
    baseUrl: process.env.JIRA_BASE_URL,
    pageId: pageIdFrom(capPage)
  })
  return null
}

const refreshMapReportingFailure = async (options, { warn }) => {
  try {
    return await refreshMap(options)
  } catch (error) {
    await warn(REFRESH_FAILED_WARNING)
    return error.message ?? String(error)
  }
}

const checkedMapPath = (workspaceRoot) => {
  const mapPath = capabilityMapPathOf(workspaceRoot)
  if (existsSync(mapPath)) return mapPath
  throw new TimError(
    'NOT_FOUND',
    `No synced capability map at ${mapPath}\nRun tim confluence sync first.`
  )
}

/**
 * Refresh the synced capability map from Confluence, unless told not to,
 * then report which rows are canonical. A refresh that fails is reported
 * through `warn` and the local copy is checked as it is.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} opts.capPage - The Confluence page to refresh
 * @param {boolean} opts.sync - Refresh first
 * @param {boolean} opts.quiet - Leave the per-row table out of the text
 * @param {(text: string) => Promise<void>} opts.warn
 * @returns {Promise<object>} The versions, the rows and {@link checkReportOf}'s report
 * @throws {TimError} NOT_FOUND when the workspace has no synced map
 */
export const checkCapabilityMap = async ({
  workspaceRoot,
  capPage,
  sync,
  quiet,
  warn
}) => {
  const mapPath = checkedMapPath(workspaceRoot)
  const previousVersion = readVersion(mapPath)
  const refreshError = sync
    ? await refreshMapReportingFailure({ workspaceRoot, capPage }, { warn })
    : null
  const { rows } = parseCapabilityMap(readFileSync(mapPath, 'utf8'))
  return {
    mapPath,
    synced: sync,
    refreshError,
    quiet,
    previousVersion,
    version: readVersion(mapPath),
    rows,
    ...checkReportOf(rows)
  }
}

const versionNote = ({ synced, previousVersion, version }) => {
  if (!synced) return ['            (--no-sync: local copy, not refreshed)']
  if (previousVersion !== '' && previousVersion !== version) {
    return [`            (refreshed from ${previousVersion})`]
  }
  return []
}

const headerLines = (result) => [
  'Capability map',
  `  version : ${result.version === '' ? 'unknown' : result.version}`,
  ...versionNote(result),
  ''
]

const section = (heading, lines) =>
  lines.length === 0 ? [] : [heading, ...lines, '']

const summaryLines = ({ canonicalCount, total, canonical }) => [
  `${canonicalCount} of ${total} rows canonical`,
  ...(canonical
    ? ['Map is consistent — the strict parser will run clean.']
    : [])
]

export const renderCheck = (result) => {
  if (result.total === 0) return headerLines(result).join('\n')
  return [
    ...headerLines(result),
    ...(result.quiet ? [] : [...renderRowTable(result.rows), '']),
    ...section('Outstanding work', renderRuleLines(result.rules)),
    ...section(
      'Status values outside the documented set',
      renderUndocumentedStatusLines(result.undocumentedStatuses)
    ),
    ...summaryLines(result)
  ].join('\n')
}

const renderCheckError = (result) => (result.total === 0 ? NO_ROWS_MESSAGE : '')

const warnUnlessJson = ({ json }) =>
  json ? async () => {} : (text) => writeLine(process.stderr, text)

/**
 * `tim capabilities check`.
 *
 * @param {import('commander').Command} capabilities
 * @param {{timVersion: string}} options
 */
export const register = (capabilities, { timVersion }) =>
  capabilities
    .command('check')
    .description(
      "Refresh this workspace's synced copy of the capability map from Confluence, then report which rows are canonical: a table of every row, the rows that break each rule, and status values outside the documented set. A failed refresh is reported and the local copy is checked. Exits 0 only when every row is canonical."
    )
    .option(
      '--cap-page <id>',
      'the Confluence page to refresh and check',
      CAPABILITY_MAP_PAGE_ID
    )
    .option(
      '--no-sync',
      'report on the local copy as it is, without refreshing'
    )
    .option('--quiet', 'summary only; leave out the per-row table')
    .addHelpText(
      'after',
      '\nExamples:\n  tim capabilities check\n  tim capabilities check --no-sync --quiet\n  tim capabilities check --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          capPage: opts.capPage,
          sync: opts.sync !== false,
          quiet: opts.quiet === true,
          warn: warnUnlessJson(opts)
        }),
        run: (_, parsed) => checkCapabilityMap(parsed),
        renderText: renderCheck,
        renderTextError: renderCheckError,
        exitCodeForResult: (result) => (result.canonical ? OK : ERROR),
        exitCodeForError: () => ERROR,
        timVersion
      })
    )
