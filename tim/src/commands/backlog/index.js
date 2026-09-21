import { z } from 'zod'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve, normalize, sep } from 'node:path'
import { homedir } from 'node:os'
import { loadProgramme } from '../../backlog/programme.js'
import { loadRegistry } from '../../backlog/registry.js'
import { runIngest } from '../../backlog/ingest.js'
import { setIncrementField, appendJournalNote } from '../../backlog/state.js'
import { INCREMENT_ID, SETTABLE_FIELDS } from '../../backlog/state-schema.js'
import { readJsonFile } from '../../backlog/io.js'
import { resolveStandards, lintStandards } from '../../backlog/standards.js'
import { TimError } from '../../errors.js'
import { register as registerLedger } from './ledger.js'
import { register as registerRows } from './rows.js'
import {
  makeBacklogAction,
  parseProgrammeKey,
  opIdSchema,
  expectShaSchema
} from './shared.js'

const ingestOptsSchema = z
  .object({
    atoms: z.boolean().optional().default(false),
    increments: z.boolean().optional().default(false),
    dryRun: z.boolean().optional().default(false),
    opId: opIdSchema.optional(),
    expectSha: expectShaSchema.optional()
  })
  .refine((opts) => !(opts.atoms && opts.increments), {
    message:
      '--atoms and --increments cannot both be given. Choose one, or drop both for the default.'
  })
  .refine((opts) => !(opts.dryRun && (opts.opId || opts.expectSha)), {
    message: 'A dry run writes nothing, so it takes no --op-id or --expect-sha.'
  })

/**
 * Validate the ingest command's options before any side-effect runs
 * (`.claude/rules/cli-patterns.md`).
 *
 * @param {object} opts
 * @returns {{atoms: boolean, increments: boolean, dryRun: boolean, opId: string|undefined, expectSha: string|undefined}}
 * @throws {TimError} USAGE
 */
const parseIngestOpts = (opts) => {
  const result = ingestOptsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * Validate an increment id positional before any side-effect runs.
 *
 * @param {unknown} value
 * @returns {string}
 * @throws {TimError} USAGE
 */
const parseIncrementId = (value) => {
  const result = z
    .string()
    .regex(INCREMENT_ID, 'must look like inc-001.')
    .safeParse(value)
  if (!result.success) {
    throw new TimError('USAGE', `id: ${result.error.issues[0].message}`)
  }
  return result.data
}

const stateSetOptsSchema = z.object({
  value: z.string().min(1, 'Give --value.'),
  opId: opIdSchema.optional(),
  expectSha: expectShaSchema.optional()
})

/**
 * Validate `state set`'s options and parse `--value` as JSON before any
 * side-effect runs.
 *
 * @param {object} opts
 * @returns {{value: any, opId: string|undefined, expectSha: string|undefined}}
 * @throws {TimError} USAGE
 */
const parseStateSetOpts = (opts) => {
  const result = stateSetOptsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  let value
  try {
    value = JSON.parse(result.data.value)
  } catch {
    throw new TimError(
      'USAGE',
      `--value "${result.data.value}" is not valid JSON.`
    )
  }
  return { value, opId: result.data.opId, expectSha: result.data.expectSha }
}

const stateNoteOptsSchema = z.object({
  file: z.string().min(1, 'Give --file.'),
  stage: z.string().trim().min(1).optional(),
  by: z.string().trim().min(1).optional(),
  opId: opIdSchema.optional(),
  expectSha: expectShaSchema.optional()
})

/**
 * Validate `state note`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{file: string, stage: string|undefined, by: string|undefined, opId: string|undefined, expectSha: string|undefined}}
 * @throws {TimError} USAGE
 */
const parseStateNoteOpts = (opts) => {
  const result = stateNoteOptsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * Read a note file's text, refusing a missing file with a GDS-plain message
 * rather than a raw `ENOENT`.
 *
 * @param {string} path
 * @returns {string}
 * @throws {TimError} NOT_FOUND when the file is missing; any other
 *   filesystem error propagates unchanged
 */
const readNoteFile = (path) => {
  try {
    return readFileSync(path, 'utf8').trim()
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new TimError('NOT_FOUND', `Can't find ${path}.`)
    }
    throw error
  }
}

const renderIngest = (result) =>
  [
    `${result.total} items — ${result.new} new, ${result.refreshed} refreshed.`,
    ...result.assignment.map(
      (entry) =>
        `  ${entry.id}  ${entry.isNew ? 'new     ' : 'existing'}  ${entry.file ?? entry.key}`
    ),
    ...(result.dropped.length
      ? [
          `${result.dropped.length} items left the backlog because their files are gone: ${result.dropped.join(', ')}`
        ]
      : []),
    result.written
      ? `Written to ${result.path}`
      : 'Nothing written. Drop --dry-run to apply.',
    ...(result.notes ?? [])
  ].join('\n')

const renderStateSet = (result) =>
  [
    `${result.id} ${result.field}: ${JSON.stringify(result.before ?? null)} -> ${JSON.stringify(result.after)}`,
    `Written to ${result.path}`,
    ...(result.notes ?? [])
  ].join('\n')

const renderStateNote = (result) =>
  [
    `${result.entry.id}: "${result.entry.note}"${result.entry.stage ? ` (${result.entry.stage})` : ''}`,
    `Written to ${result.path}`,
    ...(result.notes ?? [])
  ].join('\n')

const resolveCollection = (opts) => {
  if (opts.increments) return 'increments'
  if (opts.atoms) return 'atoms'
  return undefined
}

const renderRegistryList = (result) =>
  result.programmes
    .map(
      (programme) =>
        `${programme.key.padEnd(20)} ${programme.profile.padEnd(16)} ${programme.workarea}`
    )
    .join('\n')

const collect = (value, previous) => previous.concat([value])

const standardsOptsSchema = z
  .object({
    files: z.array(z.string()).default([]),
    repoLevel: z.array(z.string()).default([]),
    programme: z.string().optional(),
    lint: z.boolean().optional().default(false)
  })
  .refine(
    (opts) => opts.files.length > 0 || opts.repoLevel.length > 0 || opts.lint,
    {
      message:
        'Name at least one file with --files, a repo with --repo-level, or run --lint.'
    }
  )

/**
 * Parse one `--files <repoKey>:<path>` value. The path must be relative
 * and stay inside the repo after normalising, with no leading `/` and no
 * escaping `..` — a planned file need not exist yet (a writer may be about
 * to create it), so this is string validation only, before any read.
 *
 * @param {string} spec
 * @returns {{repoKey: string, path: string}}
 * @throws {TimError} USAGE
 */
const parseFileSpec = (spec) => {
  const separatorIndex = spec.indexOf(':')
  if (separatorIndex <= 0) {
    throw new TimError('USAGE', `--files "${spec}" must be <repoKey>:<path>.`)
  }
  const repoKey = spec.slice(0, separatorIndex)
  const rawPath = spec.slice(separatorIndex + 1)
  if (!rawPath || rawPath.startsWith('/')) {
    throw new TimError(
      'USAGE',
      `--files "${spec}": the path must be relative, with no leading "/".`
    )
  }
  const normalised = normalize(rawPath).split(sep).join('/')
  if (normalised === '..' || normalised.startsWith('../')) {
    throw new TimError(
      'USAGE',
      `--files "${spec}": the path must stay inside the repo — "${rawPath}" escapes it with "..".`
    )
  }
  return { repoKey, path: normalised }
}

/**
 * Validate `tim backlog standards`' options before any filesystem read
 * (`.claude/rules/cli-patterns.md`).
 *
 * @param {object} opts
 * @returns {{fileSpecs: {repoKey: string, path: string}[], repoLevel: string[], programme: string|undefined, lint: boolean}}
 * @throws {TimError} USAGE
 */
const parseStandardsOpts = (opts) => {
  const result = standardsOptsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return {
    fileSpecs: result.data.files.map(parseFileSpec),
    repoLevel: result.data.repoLevel,
    programme: result.data.programme,
    lint: result.data.lint
  }
}

/**
 * Every repo key `tim backlog standards` may reference, resolved to an
 * absolute path and a workspace-relative path. With `--programme`, the
 * map comes from that programme's backlog header `repos`. Without one,
 * `workspace` is the workspace root and every folder under `repos/` is
 * its own key — the same two vocabularies req-043 §2.17 keeps distinct
 * from a GitHub repo name.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.programme]
 * @returns {Record<string, {abs: string, rel: string}>}
 * @throws {TimError} NOT_FOUND when a named programme's backlog names no repos
 */
const resolveRepoMap = ({ workspaceRoot, programme }) => {
  if (programme) {
    const profile = loadProgramme({ workspaceRoot, key: programme })
    const backlog = readJsonFile(profile.paths.backlog)
    const reposHeader = backlog.repos
    if (!reposHeader || !Object.keys(reposHeader).length) {
      throw new TimError(
        'NOT_FOUND',
        `"${programme}"'s backlog names no repos.`
      )
    }
    return Object.fromEntries(
      Object.entries(reposHeader).map(([key, value]) => {
        if (typeof value.path !== 'string' || !value.path) {
          throw new TimError(
            'USAGE',
            `"${programme}"'s backlog names "${key}" with no path.`
          )
        }
        const rel = value.path === '.' ? '' : value.path
        return [key, { abs: resolve(workspaceRoot, value.path), rel }]
      })
    )
  }

  const reposDir = join(workspaceRoot, 'repos')
  const repoEntries = existsSync(reposDir)
    ? Object.fromEntries(
        readdirSync(reposDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => [
            entry.name,
            { abs: join(reposDir, entry.name), rel: `repos/${entry.name}` }
          ])
      )
    : {}
  return { workspace: { abs: workspaceRoot, rel: '' }, ...repoEntries }
}

const requireRepoKey = (repos, repoKey) => {
  if (repos[repoKey]) return
  throw new TimError(
    'USAGE',
    `Can't find repo key \`${repoKey}\`. Name a programme with --programme, or use \`workspace\` or a folder name under repos/.`
  )
}

const renderStandardsEntry = (entry) =>
  [
    entry.file ?? `${entry.repoKey}:${entry.path}`,
    entry.rules
      ? `  rules: ${entry.rules.map((rule) => rule.path).join(', ') || '(none)'}`
      : `  technologies: ${entry.technologies.join(', ') || '(none)'}`,
    `  topics: ${(entry.topics ?? []).join(', ') || '(none)'}`,
    `  bestPractice: ${entry.bestPractice.join(', ') || '(none)'}`,
    `  claudeMd: ${entry.claudeMd.join(', ') || '(none)'}`,
    `  imports: ${entry.imports.join(', ') || '(none)'}`,
    `  memory: ${entry.memory.join(', ') || '(none)'}`
  ].join('\n')

const renderStandards = (result) => {
  const sections = []
  if ('files' in result) {
    sections.push(
      [
        ...result.files.map(renderStandardsEntry),
        ...result.repos.map(renderStandardsEntry),
        `${result.standards.length} standards files, each with its blob sha.`
      ].join('\n\n')
    )
  }
  if (result.lint) {
    sections.push(
      `Checked ${result.lint.rules.length} rules. Every pointer resolves.`
    )
  }
  return sections.join('\n\n')
}

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
      '\nExamples:\n' +
        '  tim backlog ingest fixture-requirements --dry-run --json\n' +
        '  tim backlog ingest fixture-requirements --increments --json'
    )
    .option(
      '--replace',
      'Rebuild from scratch rather than merging. Refuses while any row is ruled or started'
    )
    .option('--dry-run', 'Report what would be written and write nothing')
    .option(
      '--target <name>',
      'Build-loop target the backlog names (parity-v1 programmes only)'
    )
    .option(
      '--atoms',
      'Ingest requirement atoms (requirements-v2 programmes; the default collection)'
    )
    .option(
      '--increments',
      'Ingest requirement increments (requirements-v2 programmes only)'
    )
    .option(
      '--op-id <id>',
      'An idempotency key. Replaying the same id is a no-op that prints the original result'
    )
    .option(
      '--expect-sha <sha>',
      'The sha256 this run is based on. Refused if the backlog has changed since'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const key = parseProgrammeKey(args[0], 'programme')
          const ingestOpts = parseIngestOpts(opts)
          const profile = loadProgramme({ workspaceRoot, key })
          const collection = resolveCollection(ingestOpts)
          return runIngest({
            profile,
            workspaceRoot,
            collection,
            replace: opts.replace,
            dryRun: ingestOpts.dryRun,
            target: opts.target,
            opId: ingestOpts.opId,
            expectSha: ingestOpts.expectSha
          })
        },
        renderText: renderIngest,
        timVersion
      })
    )

  const state = backlog
    .command('state')
    .description(
      "A requirements-v2 programme's run state (build/state.json) and journal (build/journal.jsonl)"
    )

  state
    .command('set <programme> <id> <field>')
    .description(
      `Set one field on one increment's build/state.json entry. Allowed fields: ${SETTABLE_FIELDS.join(', ')}`
    )
    .addHelpText(
      'after',
      '\nExample: tim backlog state set fixture-requirements inc-001 phase --value \'"plan"\' --json'
    )
    .requiredOption('--value <json>', 'The new value, as JSON')
    .option(
      '--op-id <id>',
      'An idempotency key. Replaying the same id is a no-op that prints the original result'
    )
    .option(
      '--expect-sha <sha>',
      'The sha256 this run is based on. Refused if the file has changed since'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const key = parseProgrammeKey(args[0], 'programme')
          const id = parseIncrementId(args[1])
          const field = args[2]
          const parsed = parseStateSetOpts(opts)
          const profile = loadProgramme({ workspaceRoot, key })
          return setIncrementField({
            profile,
            id,
            field,
            value: parsed.value,
            opId: parsed.opId,
            expectSha: parsed.expectSha
          })
        },
        renderText: renderStateSet,
        timVersion
      })
    )

  state
    .command('note <programme> <id>')
    .description("Append one note to one increment's build/journal.jsonl")
    .addHelpText(
      'after',
      '\nExample: tim backlog state note fixture-requirements inc-001 --file note.txt --stage plan --json'
    )
    .requiredOption('--file <path>', 'File holding the note text')
    .option('--stage <name>', 'Which build stage wrote this note')
    .option('--by <who>', 'Who or what wrote this note')
    .option(
      '--op-id <id>',
      'An idempotency key. Replaying the same id is a no-op that prints the original result'
    )
    .option(
      '--expect-sha <sha>',
      'The sha256 this run is based on. Refused if the file has changed since'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const key = parseProgrammeKey(args[0], 'programme')
          const id = parseIncrementId(args[1])
          const parsed = parseStateNoteOpts(opts)
          const profile = loadProgramme({ workspaceRoot, key })
          const note = readNoteFile(parsed.file)
          return appendJournalNote({
            profile,
            id,
            note,
            stage: parsed.stage,
            by: parsed.by,
            opId: parsed.opId,
            expectSha: parsed.expectSha
          })
        },
        renderText: renderStateNote,
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

  backlog
    .command('standards')
    .description(
      'Every rule, skill-routing bundle, CLAUDE.md and memory-index path a task must read for a set of files or repos, resolved live from the current working tree'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog standards --files workspace:tim/src/cli.js --json\n' +
        '  tim backlog standards --programme requirements-pipeline --files plantsFrontend:src/a.js --repo-level plantsFrontend --json\n' +
        '  tim backlog standards --lint'
    )
    .option(
      '--files <repoKey:path>',
      'A file to resolve standards for, as <repoKey>:<path>. Repeatable.',
      collect,
      []
    )
    .option(
      '--repo-level <repoKey>',
      'A repo key to run repo-level technology detection over. Repeatable.',
      collect,
      []
    )
    .option(
      '--programme <key>',
      'A registered programme, whose backlog names the repo keys --files and --repo-level use'
    )
    .option(
      '--lint',
      'Check every rule and both routing files in the whole workspace, whether or not any file was named'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot }, opts) => {
          const parsed = parseStandardsOpts(opts)
          const repos = resolveRepoMap({
            workspaceRoot,
            programme: parsed.programme
          })
          const claudeConfigDir =
            process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')
          const homeDir = homedir()

          for (const { repoKey } of parsed.fileSpecs) {
            requireRepoKey(repos, repoKey)
          }
          for (const repoKey of parsed.repoLevel) {
            requireRepoKey(repos, repoKey)
          }

          const hasStandardsTargets =
            parsed.fileSpecs.length > 0 || parsed.repoLevel.length > 0
          const standardsResult = hasStandardsTargets
            ? resolveStandards({
                workspaceRoot,
                repos,
                files: parsed.fileSpecs,
                repoLevel: parsed.repoLevel,
                claudeConfigDir,
                homeDir
              })
            : null
          const lintResult = parsed.lint
            ? lintStandards({ workspaceRoot, homeDir })
            : null

          return {
            ...(standardsResult ?? {}),
            ...(lintResult ? { lint: lintResult } : {})
          }
        },
        renderText: renderStandards,
        timVersion
      })
    )

  registerLedger(backlog, { timVersion })
  registerRows(backlog, { timVersion })
}
