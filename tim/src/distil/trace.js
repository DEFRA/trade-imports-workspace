import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'
import { readSources } from './checks.js'
import { slugOf, workFolderOf } from './files.js'

const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const LAST_STDERR_LINES = 5

/**
 * The Playwright CLI tim installs with itself, so a trace is always read by
 * the same Playwright version, and never through npx.
 *
 * @returns {string}
 */
const playwrightCli = () =>
  join(
    dirname(createRequire(import.meta.url).resolve('playwright/package.json')),
    'cli.js'
  )

const traceSourceOf = (sources, sourceId, layout) => {
  const source = sources.sources.find((candidate) => candidate.id === sourceId)
  if (!source) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find source ${sourceId} in ${layout.sources}.`
    )
  }
  if (source.kind !== 'trace') {
    throw new TimError(
      'USAGE',
      `${sourceId} is a ${source.kind} source. tim distil trace reads trace sources only.`
    )
  }
  return source
}

const lastLines = (text) =>
  text.trim().split('\n').slice(-LAST_STDERR_LINES).join('\n')

/**
 * Run one `playwright trace` subcommand for a trace source, in that source's
 * own working folder under distil/extract/, so the trace it opens is its own
 * and no `cd` is needed. With `out`, the output goes to a file of that name
 * in the working folder; without it, the output comes back in the result.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.sourceId - A source of kind trace
 * @param {string[]} args.traceArgs - The subcommand and its arguments, such as ['actions']
 * @param {string} [args.out] - A file name, no folders, for the output
 * @returns {Promise<{source: string, workFolder: string, command: string[], out: string|null, lines: number, stdout: string|null, stderr: string}>}
 * @throws {TimError} USAGE for no subcommand, a bad file name or a source that is not a trace, NOT_FOUND for an unknown source, UNKNOWN when the subcommand fails
 */
export const runTrace = async ({
  layout,
  schemas,
  sourceId,
  traceArgs,
  out
}) => {
  if (!traceArgs.length) {
    throw new TimError(
      'USAGE',
      'Name a trace subcommand after --, such as: -- actions'
    )
  }
  if (out !== undefined && !FILE_NAME.test(out)) {
    throw new TimError(
      'USAGE',
      `--out must be a file name with no folder, such as actions.txt. Got ${JSON.stringify(out)}.`
    )
  }
  const source = traceSourceOf(
    readSources(layout, schemas.sources),
    sourceId,
    layout
  )
  const workFolder = workFolderOf(layout, slugOf(source.id))
  mkdirSync(workFolder, { recursive: true })
  const command = ['trace', ...traceArgs]
  const result = await run(process.execPath, [playwrightCli(), ...command], {
    cwd: workFolder
  })
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `playwright ${command.join(' ')} failed with exit ${result.exitCode}: ${lastLines(result.stderr || result.stdout)}`
    )
  }
  const outPath = out ? join(workFolder, out) : null
  if (outPath) writeFileSync(outPath, result.stdout)
  return {
    source: source.id,
    workFolder,
    command,
    out: outPath,
    lines:
      result.stdout === '' ? 0 : result.stdout.trimEnd().split('\n').length,
    stdout: outPath ? null : result.stdout,
    stderr: result.stderr
  }
}
