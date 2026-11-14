import { readFileSync, statSync } from 'node:fs'
import { ERROR } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import {
  parseCapabilityMap,
  renderList,
  renderRefusal,
  renderTsv
} from '../../capabilities/extract.js'
import { makeRunAction } from '../_run-action.js'
import { register as registerCheck } from './check.js'

const FORMATS = ['list', 'tsv']
const USAGE_LINE =
  'Usage: tim capabilities extract <markdown-file> [--format list|tsv]'

const readTokens = ([token, ...rest], commandLine) => {
  if (token === undefined) return commandLine
  if (token === '--format') {
    const [format = ''] = rest
    if (format === '') throw new TimError('USAGE', '--format requires a value')
    return readTokens(rest.slice(1), { ...commandLine, format })
  }
  if (commandLine.path === '') {
    return readTokens(rest, { ...commandLine, path: token })
  }
  throw new TimError('USAGE', `Unknown argument: ${token}`)
}

const checkedCommandLine = (tokens) => {
  const commandLine = readTokens(tokens, { path: '', format: 'list' })
  if (commandLine.path === '') throw new TimError('USAGE', USAGE_LINE)
  return commandLine
}

const isFile = (path) => statSync(path, { throwIfNoEntry: false })?.isFile()

const checkedFile = (path) => {
  if (!isFile(path)) {
    throw new TimError('NOT_FOUND', `Error: file not found: ${path}`)
  }
  return path
}

const checkedFormat = (format) => {
  if (FORMATS.includes(format)) return format
  throw new TimError(
    'USAGE',
    `Error: --format must be 'list' or 'tsv', got: ${format}`
  )
}

const readMap = (path) => readFileSync(path, 'utf8')

const refusalOf = (parsed) =>
  Object.assign(new TimError('PARSE', renderRefusal(parsed)), {
    problems: parsed.violations.map(({ line, code, rule }) => ({
      scope: `line ${line}`,
      message: `${code} ${rule}`
    }))
  })

/**
 * Parses a capability map in the format asked for. `list` is strict: a map
 * with any row that is not canonical is refused.
 *
 * @param {{path: string, format: 'list'|'tsv'}} args
 * @returns {{format: string, rows: object[], violations: object[], total: number, canonical: boolean}}
 * @throws {TimError} NOT_FOUND when the path is not a file; USAGE when the
 *   format is neither `list` nor `tsv`; PARSE when `list` meets a row that
 *   is not canonical
 */
export const extractCapabilities = ({ path, format }) => {
  checkedFile(path)
  checkedFormat(format)
  const parsed = parseCapabilityMap(readMap(path))
  const canonical = parsed.violations.length === 0
  if (format === 'list' && !canonical) throw refusalOf(parsed)
  return { format, ...parsed, total: parsed.rows.length, canonical }
}

const renderText = (result) =>
  result.format === 'tsv' ? renderTsv(result) : renderList(result)

const registerExtract = (capabilities, { timVersion }) =>
  capabilities
    .command('extract')
    .description(
      "Read the capability rows from a synced copy of the capability map. 'list' prints 'CODE — Name [STATUS]' for each row, and refuses the whole map with a report on stderr when any row is not canonical. 'tsv' prints 'code, status, name, verdict, line' for every row, canonical or not, and always exits 0."
    )
    .usage('<markdown-file> [--format list|tsv]')
    .argument(
      '[arguments...]',
      'The synced capability map, then --format list or --format tsv (default list)'
    )
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .addHelpText(
      'after',
      '\nExamples:\n  tim capabilities extract docs/confluence/import-notification-capability-map.md\n  tim capabilities extract docs/confluence/import-notification-capability-map.md --format tsv'
    )
    .action(
      makeRunAction({
        run: ({ args: [tokens] }) =>
          extractCapabilities(checkedCommandLine(tokens)),
        renderText,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

/**
 * `tim capabilities`: the EUDP Import Notification Capability Map.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const capabilities = program
    .command('capabilities')
    .description('Read the EUDP Import Notification Capability Map')
  registerExtract(capabilities, { timVersion })
  registerCheck(capabilities, { timVersion })
}
