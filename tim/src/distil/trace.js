import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { TimError } from '../errors.js'
import { run } from '../exec/exec.js'
import { readSources } from './checks.js'
import { readJsonLenient, slugOf, workFolderOf } from './files.js'
import { compareVersions, recordedPlaywrightVersionOf } from './trace-zip.js'

const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+/
const LAST_STDERR_LINES = 5

/**
 * The file in a working folder that records which Playwright opened its
 * trace, so every later subcommand reads that trace with the same one.
 */
export const PLAYWRIGHT_RECORD = '.tim-playwright.json'

const playwrightAt = (packageJsonPath, origin) => {
  const version = readJsonLenient(packageJsonPath).value?.version
  return typeof version === 'string' && SEMVER.test(version)
    ? { version, cli: join(dirname(packageJsonPath), 'cli.js'), origin }
    : null
}

/**
 * The Playwright tim installs with itself, pinned to the newest version the
 * workspace repos use, so a trace is never read through npx.
 *
 * @returns {{version: string, cli: string, origin: string}}
 */
const timsPlaywright = () =>
  playwrightAt(
    createRequire(import.meta.url).resolve('playwright/package.json'),
    'tim'
  )

/**
 * Every Playwright the workspace's cloned repos have installed, newest first:
 * a trace recorded by a newer Playwright than tim's own is opened with one of
 * these instead.
 *
 * @param {string} workspaceRoot
 * @returns {{version: string, cli: string, origin: string}[]}
 */
export const workspacePlaywrightsOf = (workspaceRoot) => {
  const reposDir = join(workspaceRoot, 'repos')
  if (!existsSync(reposDir)) return []
  return readdirSync(reposDir)
    .flatMap((name) => {
      const modules = join(reposDir, name, 'node_modules')
      return [
        playwrightAt(
          join(modules, 'playwright', 'package.json'),
          `repos/${name}`
        ),
        playwrightAt(
          join(
            modules,
            '@playwright',
            'test',
            'node_modules',
            'playwright',
            'package.json'
          ),
          `repos/${name} (@playwright/test)`
        )
      ]
    })
    .filter(Boolean)
    .sort((left, right) => compareVersions(right.version, left.version))
}

const describeOthers = (others) =>
  others.length
    ? `, and the workspace repos have ${others.map((other) => `${other.version} (${other.origin})`).join(', ')}`
    : ', and no workspace repo has Playwright installed'

/**
 * The Playwright to open a trace with: tim's own when it is at least as new
 * as the one that recorded the trace, otherwise the newest a workspace repo
 * has installed that is. Playwright cannot read a trace from a newer version
 * of itself.
 *
 * @param {object} args
 * @param {{version: string, cli: string, origin: string}} args.own
 * @param {{version: string, cli: string, origin: string}[]} args.others - Newest first
 * @param {string|null} args.recorded - The version that recorded the trace, when it says
 * @param {string} args.zipPath
 * @param {string} args.workspaceRoot
 * @returns {{version: string, cli: string, origin: string}}
 * @throws {TimError} MISSING_DEP when no Playwright tim can run is new enough
 */
export const playwrightForTrace = ({
  own,
  others,
  recorded,
  zipPath,
  workspaceRoot
}) => {
  if (!recorded || compareVersions(own.version, recorded) >= 0) return own
  const newEnough = others.find(
    (other) => compareVersions(other.version, recorded) >= 0
  )
  if (newEnough) return newEnough
  throw new TimError(
    'MISSING_DEP',
    `${zipPath} was recorded by Playwright ${recorded}, which is newer than any Playwright tim can open it with: tim's own is ${own.version}${describeOthers(others)}. Update tim's: npm --prefix ${join(workspaceRoot, 'tim')} install playwright@${recorded} @playwright/test@${recorded} --save-exact`
  )
}

const recordedPlaywrightIn = (workFolder) => {
  const record = readJsonLenient(join(workFolder, PLAYWRIGHT_RECORD)).value
  return record && typeof record.cli === 'string' && existsSync(record.cli)
    ? record
    : null
}

const playwrightFor = ({ traceArgs, workFolder, workspaceRoot }) => {
  const own = timsPlaywright()
  if (traceArgs[0] !== 'open' || !traceArgs[1]) {
    return recordedPlaywrightIn(workFolder) ?? own
  }
  const zipPath = resolve(workFolder, traceArgs[1])
  const chosen = playwrightForTrace({
    own,
    others: workspacePlaywrightsOf(workspaceRoot),
    recorded: recordedPlaywrightVersionOf(zipPath),
    zipPath,
    workspaceRoot
  })
  writeFileSync(
    join(workFolder, PLAYWRIGHT_RECORD),
    `${JSON.stringify({ ...chosen, trace: zipPath }, null, 2)}\n`
  )
  return chosen
}

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

const usageProblem = ({ traceArgs, out, folder }) => {
  if (!traceArgs.length) {
    return 'Name a trace subcommand after --, such as: -- actions'
  }
  if (out !== undefined && !FILE_NAME.test(out)) {
    return `--out must be a file name with no folder, such as actions.txt. Got ${JSON.stringify(out)}.`
  }
  if (folder !== undefined && !FILE_NAME.test(folder)) {
    return `--folder must be one folder name, such as part3. Got ${JSON.stringify(folder)}.`
  }
  return null
}

/**
 * Run one `playwright trace` subcommand for a trace source, in that source's
 * own working folder under distil/extract/, so the trace it opens is its own
 * and no `cd` is needed. With `out`, the output goes to a file of that name
 * in the working folder; without it, the output comes back in the result.
 *
 * `open` reads the Playwright version the trace was recorded with and picks a
 * Playwright at least that new: tim's own, or one a workspace repo has
 * installed. The working folder records the choice, so every later
 * subcommand reads the trace with the same Playwright.
 *
 * @param {object} args
 * @param {object} args.layout - From `distilLayout`
 * @param {object} args.schemas - From `loadDistilSchemas`
 * @param {string} args.sourceId - A source of kind trace
 * @param {string[]} args.traceArgs - The subcommand and its arguments, such as ['actions']
 * @param {string} [args.out] - A file name, no folders, for the output
 * @param {string} [args.folder] - A sub-folder of the working folder to run in, such as part3 or verify2, so agents reading one trace source side by side each open their own trace
 * @param {string} [args.workspaceRoot] - Where to look for the repos' own Playwright; the workarea's workspace by default
 * @returns {Promise<{source: string, workFolder: string, command: string[], playwright: {version: string, origin: string}, out: string|null, lines: number, stdout: string|null, stderr: string}>}
 * @throws {TimError} USAGE for no subcommand, a bad file name or a source that is not a trace, NOT_FOUND for an unknown source, MISSING_DEP for a trace newer than any Playwright tim can run, UNKNOWN when the subcommand fails
 */
export const runTrace = async ({
  layout,
  schemas,
  sourceId,
  traceArgs,
  out,
  folder,
  workspaceRoot = resolve(layout.dir, '..', '..', '..')
}) => {
  const usage = usageProblem({ traceArgs, out, folder })
  if (usage) throw new TimError('USAGE', usage)
  const source = traceSourceOf(
    readSources(layout, schemas.sources),
    sourceId,
    layout
  )
  const sourceFolder = workFolderOf(layout, slugOf(source.id))
  const workFolder = folder ? join(sourceFolder, folder) : sourceFolder
  mkdirSync(workFolder, { recursive: true })
  const playwright = playwrightFor({ traceArgs, workFolder, workspaceRoot })
  const command = ['trace', ...traceArgs]
  const result = await run(process.execPath, [playwright.cli, ...command], {
    cwd: workFolder
  })
  if (result.exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `playwright ${command.join(' ')} failed with exit ${result.exitCode}, using Playwright ${playwright.version} (${playwright.origin}): ${lastLines(result.stderr || result.stdout)}`
    )
  }
  const outPath = out ? join(workFolder, out) : null
  if (outPath) writeFileSync(outPath, result.stdout)
  return {
    source: source.id,
    workFolder,
    command,
    playwright: { version: playwright.version, origin: playwright.origin },
    out: outPath,
    lines:
      result.stdout === '' ? 0 : result.stdout.trimEnd().split('\n').length,
    stdout: outPath ? null : result.stdout,
    stderr: result.stderr
  }
}
