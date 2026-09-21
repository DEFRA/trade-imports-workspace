import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { loadProgramme } from '../../backlog/programme.js'
import { loadRegistry } from '../../backlog/registry.js'
import { runIngest } from '../../backlog/ingest.js'
import { jsonEnvelope, exitCodeFor } from '../envelope.js'
import { OK } from '../../constants/exitCodes.js'
import { isTimError, TimError } from '../../errors.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const programmeKeySchema = z.string().trim().min(1, 'Name a programme key.')

/**
 * Validate a positional argument before any side-effect runs, refusing with
 * exit 2 rather than a raw zod error (`.claude/rules/cli-patterns.md`).
 *
 * @param {unknown} value
 * @param {string} label
 * @returns {string}
 * @throws {TimError} USAGE
 */
const parseProgrammeKey = (value, label) => {
  const result = programmeKeySchema.safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', `${label}: ${result.error.issues[0].message}`)
  }
  return result.data
}

/**
 * Every `tim backlog` subcommand resolves the workspace, runs one function
 * (ingest may write backlog.json; the registry commands are read-only) over a
 * registered programme, then prints the result as text or as one JSON line —
 * the wrapper `tim parity`'s commands use (`commands/parity/index.js`'s
 * `makeParityAction`), over a programme key resolved through the registry
 * instead of a corpus resolved from a run id.
 *
 * @param {object} args
 * @param {(context: object, opts: object) => any} args.run
 * @param {(result: any) => string} args.renderText
 * @param {string} args.timVersion
 * @returns {Function} A commander action
 */
const makeBacklogAction = ({ run, renderText, timVersion }) =>
  function backlogAction(...positional) {
    const args = positional.slice(0, -2)
    const opts = this.optsWithGlobals()
    try {
      const workspaceRoot = resolveWorkspaceRoot({ explicit: opts.workspace })
      const result = run({ workspaceRoot, args }, opts)
      if (opts.json) {
        emit(JSON.stringify(jsonEnvelope({ ok: true, result, timVersion })))
      } else {
        emit(renderText(result))
      }
      process.exit(OK)
    } catch (error) {
      if (isTimError(error) && opts.json) {
        emit(
          JSON.stringify(
            jsonEnvelope({
              ok: false,
              error: { code: error.code, message: error.message },
              timVersion
            })
          )
        )
      } else {
        emitError(error.message ?? String(error))
      }
      process.exit(exitCodeFor(error))
    }
  }

const renderIngest = (result) =>
  [
    `${result.total} items — ${result.new} new, ${result.refreshed} refreshed.`,
    ...result.assignment.map(
      (entry) =>
        `  ${entry.id}  ${entry.isNew ? 'new     ' : 'existing'}  ${entry.file}`
    ),
    ...(result.dropped.length
      ? [
          `${result.dropped.length} items left the backlog because their files are gone: ${result.dropped.join(', ')}`
        ]
      : []),
    result.written
      ? `Written to ${result.path}`
      : 'Nothing written. Drop --dry-run to apply.'
  ].join('\n')

const renderRegistryList = (result) =>
  result.programmes
    .map(
      (programme) =>
        `${programme.key.padEnd(20)} ${programme.profile.padEnd(16)} ${programme.workarea}`
    )
    .join('\n')

const renderRegistryShow = (result) =>
  [
    `${result.key} (${result.profile})`,
    ...Object.entries(result.paths).map(
      ([key, value]) => `  ${key.padEnd(10)} ${value}`
    )
  ].join('\n')

export const register = (program, { timVersion }) => {
  const backlog = program
    .command('backlog')
    .description(
      'Ingest and inspect a programme backlog, whichever profile it is registered under'
    )

  backlog
    .command('ingest <programme>')
    .description(
      'Assemble backlog.json from the item files an agent authored under the programme workarea'
    )
    .addHelpText(
      'after',
      '\nExample: tim backlog ingest fixture-requirements --dry-run --json'
    )
    .option(
      '--replace',
      'Rebuild from scratch rather than merging. Refuses while any row holds a ruling'
    )
    .option('--dry-run', 'Report what would be written and write nothing')
    .option(
      '--target <name>',
      'Build-loop target the backlog names (parity-v1 programmes only)'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const key = parseProgrammeKey(args[0], 'programme')
          const profile = loadProgramme({ workspaceRoot, key })
          return runIngest({
            profile,
            workspaceRoot,
            replace: opts.replace,
            dryRun: opts.dryRun,
            target: opts.target
          })
        },
        renderText: renderIngest,
        timVersion
      })
    )

  const registry = backlog
    .command('registry')
    .description(
      'The programmes tim knows about, from the requirements registry and the parity corpora'
    )

  registry
    .command('list')
    .description(
      'Every registered programme, with its profile and its workarea'
    )
    .addHelpText('after', '\nExample: tim backlog registry list --json')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot }) => ({
          programmes: [...loadRegistry({ workspaceRoot }).entries.values()]
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((entry) => ({
              key: entry.key,
              profile: entry.profileKey,
              workarea: entry.workarea
            }))
        }),
        renderText: renderRegistryList,
        timVersion
      })
    )

  registry
    .command('show <programme>')
    .description('One registered programme, its profile and its resolved paths')
    .addHelpText(
      'after',
      '\nExample: tim backlog registry show fixture-requirements --json'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }) => {
          const key = parseProgrammeKey(args[0], 'programme')
          const profile = loadProgramme({ workspaceRoot, key })
          return { key, profile: profile.profileKey, paths: profile.paths }
        },
        renderText: renderRegistryShow,
        timVersion
      })
    )
}
