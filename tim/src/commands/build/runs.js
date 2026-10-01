import { resolve } from 'node:path'
import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import {
  archiveRootFor,
  archiveRuns,
  claudeProjectsDirFor,
  listRunSources,
  resolveRunSource
} from '../../build/runs/archive.js'
import { buildAllRunsReport, buildRunReport } from '../../build/runs/report.js'
import {
  renderAllRunsText,
  renderArchiveText,
  renderRunText
} from '../../build/runs/render.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const ONE_TARGET = 'Name one run, or pass --all — not both, and not neither.'

const targetSchema = z
  .object({
    run: z.string().trim().min(1).optional(),
    all: z.boolean().default(false)
  })
  .refine(({ run, all }) => Boolean(run) !== all, { message: ONE_TARGET })

const reportSchema = z
  .object({
    run: z.string().trim().min(1).optional(),
    all: z.boolean().default(false),
    session: z.string().trim().min(1).optional(),
    workflow: z.string().trim().min(1)
  })
  .refine(({ run, all }) => Boolean(run) !== all, { message: ONE_TARGET })

const runIdOf = (reference) =>
  reference.startsWith('wf_') || reference.includes('/')
    ? reference.split('/').filter(Boolean).at(-1)
    : `wf_${reference}`

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

const emitResult = (globalOpts, timVersion, result, text) => {
  emit(
    globalOpts.json
      ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
      : text
  )
  process.exit(OK)
}

const workspaceFrom = (globalOpts) =>
  resolveWorkspaceRoot({ explicit: globalOpts.workspace })

const projectsDirFrom = (opts, workspaceRoot) =>
  opts.projects
    ? resolve(opts.projects)
    : claudeProjectsDirFor({ workspaceRoot })

const registerArchive = (runs, timVersion) =>
  runs
    .command('archive')
    .argument(
      '[run]',
      'A run id such as wf_850da050-87a, or the path of its transcript folder'
    )
    .option(
      '--all',
      'Archive every workflow run Claude Code has kept for this workspace'
    )
    .option(
      '--projects <dir>',
      "Claude Code's transcript folder for this workspace (default: ~/.claude/projects/<workspace path>)"
    )
    .description(
      "Copy a workflow run's transcripts — the journal, every agent's transcript and meta file, the run's own record and any subagents its agents started — into workareas/build-telemetry/, and record it in that folder's index.json. Only reads ~/.claude. Running it again copies only what changed."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build runs archive wf_850da050-87a\n  tim build runs archive --all --json'
    )
    .action(async function archiveAction(run, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        parseOptions(targetSchema, { run, all: Boolean(opts.all) })
        const workspaceRoot = workspaceFrom(globalOpts)
        const projectsDir = projectsDirFrom(opts, workspaceRoot)
        const archiveRoot = archiveRootFor(workspaceRoot)
        const sources = opts.all
          ? listRunSources(projectsDir)
          : [resolveRunSource(projectsDir, run)]
        const results = archiveRuns({ sources, archiveRoot })
        emitResult(
          globalOpts,
          timVersion,
          {
            archiveRoot,
            runs: results.map(({ entry, copied, unchanged, runDir }) => ({
              ...entry,
              runDir,
              copied,
              unchanged
            }))
          },
          renderArchiveText({ results, archiveRoot })
        )
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })

const registerReport = (runs, timVersion) =>
  runs
    .command('report')
    .argument('[run]', 'An archived run id such as wf_850da050-87a')
    .option('--all', 'Report on every archived run')
    .option('--session <id>', 'With --all, only the runs from this session')
    .option(
      '--workflow <name>',
      'With --all, only runs of this workflow, or "all"',
      'increment-build-loop'
    )
    .description(
      'Show what an archived run cost and how long it took: per increment, per stage and per agent — model, input, output and cache tokens, tool calls, time and outcome — with the most expensive and slowest stages. With --all, one line per run and each stage across every run.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build runs report wf_850da050-87a\n  tim build runs report --all --session ead10300-79c8-4b6e-a37c-eb6630313b45\n  tim build runs report --all --json'
    )
    .action(async function reportAction(run, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(reportSchema, {
          run,
          all: Boolean(opts.all),
          session: opts.session,
          workflow: opts.workflow
        })
        const archiveRoot = archiveRootFor(workspaceFrom(globalOpts))
        if (parsed.all) {
          const report = buildAllRunsReport({
            archiveRoot,
            sessionId: parsed.session,
            workflow: parsed.workflow
          })
          emitResult(globalOpts, timVersion, report, renderAllRunsText(report))
          return
        }
        const report = buildRunReport({
          archiveRoot,
          runId: runIdOf(parsed.run)
        })
        emitResult(globalOpts, timVersion, report, renderRunText(report))
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })

/**
 * Adds `tim build runs archive|report` under `tim build`.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerRuns = (build, timVersion) => {
  const runs = build
    .command('runs')
    .description(
      "Keep workflow runs' transcripts and report what each stage cost"
    )
  registerArchive(runs, timVersion)
  registerReport(runs, timVersion)
}
