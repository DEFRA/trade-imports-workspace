import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { resolveRepoPath } from '../../build/repo-path.js'
import {
  DEFAULT_BASE,
  MIN_CLONE_LINES,
  TEST_FILE_GLOBS,
  findNewTestClones
} from '../../build/duplication.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const duplicationOptionsSchema = z.object({
  repo: z.string().trim().min(1),
  base: z.string().trim().min(1, 'Name the base ref, such as origin/main.')
})

const placeOf = ({ file, startLine, endLine }) =>
  `${file}:${startLine}-${endLine}`

const describeClone = ({ lines, first, second }) =>
  `  ${lines} lines: ${placeOf(first)} and ${placeOf(second)}`

const changedFilesCount = (count) =>
  count === 1 ? '1 changed test file' : `${count} changed test files`

const duplicationSummary = ({ clones, base }) =>
  `${clones.length} duplicated ${clones.length === 1 ? 'block' : 'blocks'} in changed test files that ${base} does not have`

/**
 * The plain-text report of `tim build duplication`.
 *
 * @param {{base: string, changedTestFiles: string[], clones: object[]}} outcome
 * @returns {string}
 */
export const renderDuplicationText = (outcome) => {
  const { clones, changedTestFiles, base } = outcome
  if (clones.length === 0) {
    return `No new duplicated blocks in the ${changedFilesCount(changedTestFiles.length)} since ${base}.`
  }
  return [
    `${duplicationSummary(outcome)}:`,
    ...clones.map(describeClone),
    'Move each block into the shared test helper, and delete the copies.'
  ].join('\n')
}

const duplicationEnvelope = (outcome, timVersion) => ({
  ...jsonEnvelope({ ok: true, result: outcome, timVersion }),
  ok: outcome.clones.length === 0,
  errors:
    outcome.clones.length === 0
      ? []
      : [
          {
            code: 'DUPLICATION_FOUND',
            message: `${duplicationSummary(outcome)}.`
          }
        ]
})

const reportError = (error, json, timVersion) => {
  if (json) {
    emit(
      JSON.stringify(
        jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })
      )
    )
  } else {
    emitError(error.message ?? String(error))
  }
  process.exit(exitCodeFor(error))
}

/**
 * `tim build duplication`: the duplicated blocks a branch adds to its tests.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerDuplication = (build, timVersion) =>
  build
    .command('duplication')
    .argument(
      '[repo]',
      'The repo, as a path or a folder under repos/ (default: this folder)',
      '.'
    )
    .option(
      '--base <ref>',
      'The ref whose duplicated blocks are not counted',
      DEFAULT_BASE
    )
    .description(
      `Find blocks of test code copied between test files (${TEST_FILE_GLOBS.join(', ')}) that the branch adds: blocks of ${MIN_CLONE_LINES} lines or more, found with jscpd across every test file in the repo, where one side is a test file changed since --base (committed or not) and --base does not already have the copy. Set-up used by two tests belongs in the shared test helper. Exits 1 when it finds one.`
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build duplication trade-imports-plants-frontend --json\n  tim build duplication . --base origin/main'
    )
    .action(async function duplicationAction(repo, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(duplicationOptionsSchema, {
          repo,
          base: opts.base
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await findNewTestClones({
          repoPath: resolveRepoPath(workspaceRoot, parsed.repo),
          base: parsed.base
        })
        emit(
          globalOpts.json
            ? JSON.stringify(duplicationEnvelope(outcome, timVersion))
            : renderDuplicationText(outcome)
        )
        process.exit(outcome.clones.length === 0 ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
