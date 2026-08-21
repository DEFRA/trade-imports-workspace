import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { loadCorpusProfile } from '../../parity/corpus-profile.js'
import { readJsonFile, writeJsonAtomic } from '../../parity/io.js'
import { parseBacklog } from '../../parity/schema.js'
import { normaliseBacklog } from '../../parity/normalise.js'
import { runCounts } from '../../parity/counts.js'
import { runCitations } from '../../parity/citations/run.js'
import { runEvidence } from '../../parity/citations/evidence.js'
import { runReport } from '../../parity/render/run.js'
import { runCheck } from '../../parity/check.js'
import { buildCorpusMeta } from '../../parity/meta.js'
import { runSplitSentinels } from '../../parity/split-sentinels.js'
import { runManifest } from '../../parity/manifest.js'
import { runCapture } from '../../parity/capture/run.js'
import { runCoverage } from '../../parity/coverage.js'
import { runSlices, renderSlices } from '../../parity/slices.js'
import { runYield, renderYield } from '../../parity/yield.js'
import { runDuplicates, renderDuplicates } from '../../parity/duplicates.js'
import { runHeads, renderHeads } from '../../parity/heads.js'
import { runIngest } from '../../parity/ingest.js'
import { runAnchors } from '../../parity/anchors.js'
import {
  runCheckEvidence,
  renderCheckEvidence,
  blockers
} from '../../parity/check-evidence.js'
import { runRepoint } from '../../parity/repoint.js'
import {
  setSlot,
  setSlots,
  setDecisionRequired,
  setCitation
} from '../../parity/set.js'
import { OK, USAGE, ERROR } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'

const SCHEMA_VERSION = 1

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

/**
 * Every parity subcommand does the same three things: resolve the workspace
 * and the corpus, run one pure function over the corpus, then print the
 * result as text or as one JSON line. Wrapping that once keeps the
 * subcommands to their own logic.
 *
 * @param {object} args
 * @param {(context: object, opts: object) => Promise<any>} args.run
 * @param {(result: any) => string} args.renderText
 * @param {string} args.timVersion
 * @returns {Function} A commander action
 */
export const makeParityAction = ({ run, renderText, timVersion }) =>
  async function parityAction(...positional) {
    const args = positional.slice(0, -2)
    const opts = this.optsWithGlobals()
    try {
      const workspaceRoot = resolveWorkspaceRoot({ explicit: opts.workspace })
      const runId = args[0] ?? opts.run
      const profile = loadCorpusProfile({
        workspaceRoot,
        runId,
        explicit: opts.corpus
      })
      const result = await run({ workspaceRoot, runId, profile, args }, opts)
      if (opts.json) {
        emit(
          JSON.stringify({
            ok: true,
            schema_version: SCHEMA_VERSION,
            tim_version: timVersion,
            result,
            errors: [],
            metadata: { ranAt: new Date().toISOString() }
          })
        )
      } else {
        emit(renderText(result))
      }
      process.exit(result?.exitNonZero ? ERROR : OK)
    } catch (error) {
      if (isTimError(error) && opts.json) {
        emit(
          JSON.stringify({
            ok: false,
            schema_version: SCHEMA_VERSION,
            tim_version: timVersion,
            result: null,
            errors: [{ code: error.code, message: error.message }]
          })
        )
      } else {
        emitError(error.message ?? String(error))
      }
      process.exit(
        isTimError(error) && ['USAGE', 'NOT_FOUND'].includes(error.code)
          ? USAGE
          : ERROR
      )
    }
  }

const renderNormalise = (result) => {
  const lines = [
    `${result.changed.length} of ${result.total} increments normalised.`
  ]
  for (const change of result.changed) {
    const parts = []
    if (change.evidence.length) {
      parts.push(`evidence: ${change.evidence.join(', ')}`)
    }
    if (change.screens.length) {
      parts.push(`screens: ${change.screens.join(' | ')}`)
    }
    lines.push(`  ${change.id}  ${parts.join('   ')}`)
  }
  lines.push(
    result.written
      ? `Written to ${result.path}`
      : 'Dry run — nothing written. Pass --write to apply.'
  )
  return lines.join('\n')
}

const resolutionBreakdown = (byResolution) =>
  Object.entries(byResolution)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, n]) => `  ${kind.padEnd(20)} ${n}`)

// Two breakdowns, never one. The parser rebuilds citations[] from the prose
// every run, so on its own it reports every hand-resolved citation as
// unresolved — true of the parser, and false of the file it manages. Printing
// both says which is which.
const handResolutions = (n) =>
  n === 1 ? '1 hand resolution' : `${n} hand resolutions`

const renderCitations = (result) => {
  const named = (entry) =>
    `${entry.increment}/${entry.ref} "${entry.asWritten}" in ${entry.field ?? 'this finding'}`
  const lost = result.orphaned.length
  return [
    `${result.total} citations across ${result.increments} increments.`,
    result.written
      ? 'What the backlog now holds:'
      : 'What the backlog would hold:',
    ...resolutionBreakdown(result.byResolution),
    'What the parser derives from the prose alone:',
    ...resolutionBreakdown(result.derived.byResolution),
    result.carried.length
      ? `Carried forward ${handResolutions(result.carried.length)} the backlog already held.`
      : 'The backlog holds no hand resolutions to carry forward.',
    lost
      ? `${handResolutions(lost)} no longer ${lost === 1 ? 'occurs' : 'occur'} in the prose. Kept as an orphaned record rather than dropped, and attached to no marker: ${result.orphaned.map(named).join('; ')}`
      : 'Every hand resolution still occurs in the prose it was made against.',
    `${result.unresolved.length} queued for a human.`,
    result.written
      ? `Written to ${result.path}`
      : 'Dry run — pass --write to apply.'
  ].join('\n')
}

const countLine = (label, counts) =>
  `${label.padEnd(10)} ${Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, n]) => `${key} ${n}`)
    .join('   ')}`

const renderIngest = (result) =>
  [
    `${result.total} findings from ${result.findingsDir} — ${result.new} new, ${result.refreshed} refreshed, ${result.carriedOver} carried over from the previous run.`,
    countLine('band', result.byBand),
    countLine('domain', result.byDomain),
    countLine('type', result.byType),
    ...(result.dropped.length
      ? [
          `${result.dropped.length} increments left the backlog because their finding files are gone: ${result.dropped.join(', ')}`
        ]
      : []),
    ...result.assignment.map(
      (entry) =>
        `  ${entry.id}  ${entry.isNew ? 'new     ' : 'existing'}  ${entry.file}`
    ),
    ...(result.screensCheckable
      ? []
      : [
          'No side has a capture manifest yet, so no screen id could be checked against one.'
        ]),
    result.written
      ? `Written to ${result.path}`
      : 'Nothing written. Drop --dry-run to apply.'
  ].join('\n')

// A control that matches several places on its page is a fact about the page,
// not a failure, and it changes what the crop is worth: one of six identical
// tags, or the first of fifteen Change links. Named here so a reader knows
// which crops are an instance rather than the instance.
const ambiguousLine = (entries) => {
  if (entries.length === 0) return null
  const refused = entries.filter((entry) => entry.cropped === false)
  const say = (entry) =>
    `${entry.increment} ${entry.named} on ${entry.screen} (${entry.role}, ${entry.places} places)`
  return [
    `  ${entries.length} controls match more than one place on their page.`,
    `    ${entries.length - refused.length} cropped at the first: ${entries
      .filter((entry) => entry.cropped)
      .map(say)
      .join(', ')}`,
    refused.length
      ? `    ${refused.length} refused, because nothing about the match says which one was meant: ${refused.map(say).join(', ')}`
      : null
  ]
    .filter(Boolean)
    .join('\n')
}

// The four numbers together are the honest coverage statement for element
// evidence: what is cropped from the control itself, what is shown as an
// absence, what resolved nowhere, and what named no control at all.
const renderAnchors = (result) =>
  result.sides
    .flatMap((side) =>
      [
        `${side.side}: ${side.anchors} anchors and ${side.insertions} insertion points across ${side.screens} screens.`,
        side.unresolved.length
          ? `  ${side.unresolved.length} controls resolve to no one place on any side, so nothing is cropped for them: ${side.unresolved
              .map((entry) => `${entry.increment} ${entry.named}`)
              .join(', ')}`
          : '  Every control a finding names resolves to one place on a side.',
        side.withoutControls.length
          ? `  ${side.withoutControls.length} findings name no control, so they fall back to a whole-page shot: ${side.withoutControls.join(', ')}`
          : '  Every finding on this side names a control.',
        ambiguousLine(side.ambiguous ?? []),
        // Not a gap. A finding that names three controls across three pages
        // has each of them on one of those pages, and the crop is taken where
        // the control is rather than counted as missing where it is not.
        side.onOtherScreens?.length
          ? `  ${side.onOtherScreens.length} controls sit on another screen this finding names, and are cropped there: ${side.onOtherScreens
              .map(
                (entry) =>
                  `${entry.increment} ${entry.named} (${entry.screen} → ${entry.cropped})`
              )
              .join(', ')}`
          : null,
        side.withoutPlacement.length
          ? `  ${side.withoutPlacement.length} absences have no field on their page to point at: ${side.withoutPlacement
              .map((entry) => `${entry.increment} ${entry.named}`)
              .join(', ')}`
          : null,
        side.uncaptured.length
          ? `  ${side.uncaptured.length} screens have no page model yet, so their anchors go unchecked: ${side.uncaptured.join(', ')}`
          : null,
        side.written
          ? `  Written to ${side.path}`
          : `  Nothing written. Pass --write to apply, to ${side.path}`
      ].filter(Boolean)
    )
    .join('\n')

export const register = (program, { timVersion }) => {
  const parity = program
    .command('parity')
    .description('Build and check the findings report for a comparison corpus')
    .option('--corpus <id>', 'Override the corpus resolved from the backlog')

  parity
    .command('normalise <runId>')
    .description(
      'Pass 0: rewrite evidence path roots to repo-relative, split slash-joined screens, stamp the corpus id'
    )
    .option('--write', 'Apply the changes rather than reporting them')
    .action(
      makeParityAction({
        run: ({ profile }, opts) => {
          const raw = readJsonFile(profile.paths.backlog)
          const parsed = parseBacklog(raw)
          const { backlog, changes } = normaliseBacklog(parsed, profile)
          if (opts.write) writeJsonAtomic(profile.paths.backlog, backlog)
          return {
            total: parsed.increments.length,
            changed: changes,
            written: Boolean(opts.write),
            path: profile.paths.backlog
          }
        },
        renderText: renderNormalise,
        timVersion
      })
    )

  parity
    .command('meta <runId>')
    .description(
      'Write .corpus-meta.json — the pins, the captures and every derived count the masthead uses'
    )
    .option('--write', 'Write the file rather than printing it')
    .action(
      makeParityAction({
        run: ({ profile }, opts) => {
          const meta = buildCorpusMeta({
            profile,
            pinSpec: profile.pins ?? {},
            captureSpec: profile.captures ?? {},
            capturedOn: new Date().toISOString().slice(0, 10)
          })
          if (opts.write) writeJsonAtomic(profile.paths.meta, meta)
          return {
            meta,
            written: Boolean(opts.write),
            path: profile.paths.meta
          }
        },
        renderText: ({ meta, written, path }) =>
          [
            ...Object.entries(meta.pins).map(
              ([key, pin]) =>
                `pin  ${key.padEnd(14)} ${pin.short}  ${pin.pushed ? 'pushed' : 'NOT PUSHED'}  ${pin.subject ?? ''}`
            ),
            ...Object.entries(meta.captures).map(
              ([side, capture]) =>
                `shot ${side.padEnd(14)} ${String(capture.sha).padEnd(8)}  ${capture.screenshots} shots, ${capture.models} models, ${capture.deviceScaleFactor}x  ${capture.matchesPin ? 'matches the pin' : 'DOES NOT match the pin'}`
            ),
            written ? `Written to ${path}` : 'Dry run — pass --write to apply.'
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('counts <runId>')
    .description('Every derived number the report puts on the page')
    .action(
      makeParityAction({
        run: ({ profile }) => runCounts({ profile }),
        renderText: (result) =>
          Object.entries(result.counts)
            .map(([key, value]) => `${key.padEnd(28)} ${JSON.stringify(value)}`)
            .join('\n'),
        timVersion
      })
    )

  parity
    .command('citations <runId>')
    .description(
      'Extract citations[] from the prose and queue anything ambiguous for a human'
    )
    .option('--write', 'Write citations[] into the backlog')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runCitations({ profile, write: opts.write }),
        renderText: renderCitations,
        timVersion
      })
    )

  parity
    .command('evidence <runId>')
    .description(
      'Resolve every citation to a permalink and a snippet at the pinned commit'
    )
    .option('--write', 'Write evidence.json')
    .action(
      makeParityAction({
        run: ({ profile }, opts) => runEvidence({ profile, write: opts.write }),
        renderText: (result) =>
          [
            `${result.resolved} of ${result.total} citations resolved to a snippet.`,
            ...Object.entries(result.byState).map(
              ([state, n]) => `  ${state.padEnd(20)} ${n}`
            ),
            `${result.truncated} snippets shortened to keep the card readable.`,
            result.outOfRange.length
              ? `${result.outOfRange.length} citations whose identifier is in the file but outside the cited lines — the range drifted: ${result.outOfRange.map((m) => `${m.increment}/${m.ref}`).join(', ')}`
              : 'Every cited range contains what the prose says it does.',
            result.anchorMisses.length
              ? `${result.anchorMisses.length} citations whose identifier is absent from the whole file at the pin — the premise moved: ${result.anchorMisses.map((m) => `${m.increment}/${m.ref}`).join(', ')}`
              : 'No citation has lost its identifier.',
            `${result.explained.length} citations name a string the prose took from somewhere the citation does not own — a sibling citation, a runtime interpolation or the rendered page. These are expected, not warnings.`,
            result.written
              ? `Written to ${result.path}`
              : 'Dry run — pass --write to apply.'
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('report <runId>')
    .description('Render the findings report')
    .option('--open', 'Open the report when it is written')
    .option(
      '--target <name>',
      'Where the report goes: local for a folder you open, artifact for one file you can send someone',
      'local'
    )
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runReport({
            profile,
            target: opts.target,
            open: opts.open
          }),
        renderText: (result) =>
          [
            `Wrote ${result.path} (${(result.bytes / 1024).toFixed(0)} KB).`,
            `Open it: file://${result.path}`,
            `${result.items.increments} findings, ${result.items.candidates} deferred candidates, ${result.items.withdrawn} withdrawn.`,
            ...result.warnings.map((w) => `warning: ${w}`)
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('check-evidence <runId>')
    .description(
      'Report the state of the evidence: pin drift, capture integrity, cited screens no capture visited, crops the capture could not take, citations whose target has moved'
    )
    .option(
      '--strict',
      'Exit non-zero when the evidence is not usable as it is'
    )
    .action(
      makeParityAction({
        run: ({ profile }, opts) => {
          const result = runCheckEvidence({ profile })
          const stops = blockers(result)
          return {
            ...result,
            blockers: stops,
            exitNonZero: Boolean(opts.strict && stops.length)
          }
        },
        renderText: (result) =>
          [
            renderCheckEvidence(result),
            ...(result.blockers.length
              ? ['', 'blocking:', ...result.blockers.map((b) => `  - ${b}`)]
              : [])
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('repoint <runId>')
    .description(
      'Preview moving one side to a new capture, old picture beside new, before anything is superseded'
    )
    .requiredOption('--side <id>', 'Which side to repoint')
    .requiredOption('--to <sha>', 'The capture sha to move to')
    .option('--accept', 'Point the corpus at the new capture')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runRepoint({
            profile,
            side: opts.side,
            to: opts.to,
            accept: opts.accept
          }),
        renderText: (r) =>
          [
            `${r.side}: ${r.from ?? 'nothing'} → ${r.to}`,
            ...Object.entries(r.counts).map(
              ([verdict, n]) => `  ${String(n).padStart(4)} ${verdict}`
            ),
            `Preview: ${r.path}`,
            r.accepted
              ? `Accepted. Wrote ${r.written.join(', ')}. Run the report to see the ${r.movedScreens.length} moved screens in the drift panel.`
              : 'Nothing changed. Look at the preview, then pass --accept.'
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('set-slot <runId> <incrementId> <slot>')
    .description(
      'Write one prose slot on one increment from a file — the only way a fan-out worker touches the backlog'
    )
    .requiredOption('--file <path>', 'File holding the new text')
    .option('--pass <a|b>', 'Which migration pass wrote this text')
    .action(
      makeParityAction({
        run: ({ profile, args }, opts) =>
          setSlot({
            profile,
            id: args[1],
            slot: args[2],
            file: opts.file,
            pass: opts.pass
          }),
        renderText: (r) =>
          `${r.id}.finding.${r.slot} set — ${r.words} words${r.pass ? `, pass ${r.pass.toUpperCase()}` : ''}.`,
        timVersion
      })
    )

  parity
    .command('manifest <runId>')
    .description(
      'Build the capture manifest for one side, so the report reads an index rather than globbing a directory'
    )
    .requiredOption('--side <id>', 'Which side to index')
    .requiredOption('--sha <sha>', 'The commit the application was at')
    .option('--dsf <n>', 'Device scale factor the capture used')
    .option('--write', 'Write the manifest')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runManifest({
            profile,
            side: opts.side,
            sha: opts.sha,
            deviceScaleFactor: opts.dsf ? Number(opts.dsf) : undefined,
            write: opts.write
          }),
        renderText: (r) =>
          `${r.screens} screens and ${r.crops} element crops indexed for ${r.side}.\n${r.written ? `Written to ${r.path}` : 'Dry run — pass --write to apply.'}`,
        timVersion
      })
    )

  parity
    .command('capture <runId>')
    .description(
      "Run one side's capture specs and record what the application does — a screenshot, an element crop per anchor and a page model for every screen a spec names"
    )
    .requiredOption('--side <id>', 'Which side to capture')
    .option(
      '--specs <path>',
      "Run specs from somewhere other than this side's directory in the corpus"
    )
    .option('--headed', 'Watch the run in a browser window')
    .action(
      makeParityAction({
        run: ({ profile, workspaceRoot }, opts) =>
          runCapture({
            profile,
            workspaceRoot,
            side: opts.side,
            specs: opts.specs,
            headed: opts.headed
          }),
        renderText: (r) =>
          [
            `${r.side} at ${r.sha.slice(0, 8)}: ran ${r.specs.length} specs from ${r.specDir}.`,
            ...r.specs.map((spec) => `  ${spec}`),
            `Pictures: ${r.captureDir}`,
            `Page models: ${r.modelDir}`,
            ...(r.htmlDir ? [`Rendered pages: ${r.htmlDir}`] : []),
            r.exitNonZero
              ? `The run did not finish cleanly. Read the output above, then the trace in ${r.runDir}.`
              : `Index them next: tim parity manifest <runId> --side ${r.side} --sha ${r.sha.slice(0, 8)} --write`
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('coverage <runId>')
    .description(
      "Did we get everything? Enumerate a side's screens from its source and diff that against what the capture recorded"
    )
    .option('--side <id>', 'Just one side')
    .option('--strict', 'Exit non-zero while any enumerated screen is missing')
    .action(
      makeParityAction({
        run: ({ profile }, opts) => {
          const result = runCoverage({ profile, side: opts.side })
          return {
            ...result,
            exitNonZero: Boolean(opts.strict) && !result.complete
          }
        },
        renderText: (r) =>
          r.sides
            .flatMap((side) =>
              side.enumerated
                ? [
                    `${side.side}: ${side.covered} of ${side.expected} pages captured, plus ${side.states.length} states of them.`,
                    ...(side.why ? [`  ${side.why}`] : []),
                    ...side.missing.map((entry) =>
                      `  not captured  ${entry.screen.padEnd(44)} ${entry.why ?? ''}`.trimEnd()
                    ),
                    ...side.unexplained.map(
                      (screen) =>
                        `  unexplained   ${screen.padEnd(44)} captured, but nothing in the source accounts for it`
                    )
                  ]
                : [`${side.side}: ${side.why}`]
            )
            .join('\n'),
        timVersion
      })
    )

  parity
    .command('slices <runId>')
    .description(
      'Prove the slicing before spawning anything: every captured screen owned by exactly one slice, and exactly one slice owning the chrome'
    )
    .option('--file <path>', 'A slicing somewhere other than the workarea')
    .option('--strict', 'Exit non-zero unless the slicing is sound')
    .action(
      makeParityAction({
        run: ({ profile }, opts) => {
          const result = runSlices({ profile, file: opts.file })
          return {
            ...result,
            exitNonZero: Boolean(opts.strict) && !result.sound
          }
        },
        renderText: renderSlices,
        timVersion
      })
    )

  parity
    .command('yield <runId>')
    .description(
      'Did every slice deliver, and did a verifier record looking at every finding? Run it before the ingest, which freezes the prose permanently'
    )
    .option('--file <path>', 'A slicing somewhere other than the workarea')
    .option(
      '--fraction <number>',
      'How far under the median findings-per-screen a slice may sit before it is flagged'
    )
    .option('--strict', 'Exit non-zero unless the corpus is ready to ingest')
    .action(
      makeParityAction({
        run: ({ profile }, opts) => {
          const result = runYield({
            profile,
            file: opts.file,
            fraction: opts.fraction ? Number(opts.fraction) : undefined
          })
          return {
            ...result,
            exitNonZero: Boolean(opts.strict) && !result.readyToIngest
          }
        },
        renderText: renderYield,
        timVersion
      })
    )

  parity
    .command('duplicates <runId>')
    .description(
      'Candidate duplicate findings across the whole corpus at once, which no per-slice verifier can see. Finds candidates; strikes nothing'
    )
    .option('--all', 'Include pairs from within one slice as well')
    .action(
      makeParityAction({
        run: ({ profile }, opts) => runDuplicates({ profile, all: opts.all }),
        renderText: renderDuplicates,
        timVersion
      })
    )

  parity
    .command('heads <runId>')
    .description(
      'Where each application stood when the run began, and what has moved under it since'
    )
    .option('--write', "Record the current heads as this run's starting point")
    .option('--force', 'Re-record over a run already in progress')
    .option('--strict', 'Exit non-zero when an application has moved')
    .action(
      makeParityAction({
        run: async ({ profile }, opts) => {
          const result = await runHeads({
            profile,
            write: opts.write,
            force: opts.force
          })
          return {
            ...result,
            exitNonZero: Boolean(opts.strict) && !result.steady
          }
        },
        renderText: renderHeads,
        timVersion
      })
    )

  parity
    .command('ingest <runId>')
    .description(
      "Assemble backlog.json from the finding files agents wrote under the corpus workarea's findings/ directory"
    )
    .option(
      '--replace',
      'Rebuild from scratch rather than merging. Refuses while any increment holds a ruling'
    )
    .option('--dry-run', 'Report what would be written and write nothing')
    .option('--target <name>', 'Build-loop target the backlog names')
    .action(
      makeParityAction({
        run: ({ profile, workspaceRoot }, opts) =>
          runIngest({
            profile,
            workspaceRoot,
            replace: opts.replace,
            dryRun: opts.dryRun,
            target: opts.target
          }),
        renderText: renderIngest,
        timVersion
      })
    )

  parity
    .command('anchors <runId>')
    .description(
      'Derive the element crops from the controls each finding names, so a finding about one control is shown by that control'
    )
    .option('--side <id>', 'Just one side')
    .option('--write', 'Write anchors.<side>.json rather than reporting it')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runAnchors({ profile, side: opts.side, write: opts.write }),
        renderText: renderAnchors,
        timVersion
      })
    )

  parity
    .command('split-sentinels <runId>')
    .description(
      'Pass A, the mechanical half: fill correction and falsifiedBy verbatim from the sentinels in the frozen detail'
    )
    .option('--write', 'Apply rather than reporting')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runSplitSentinels({ profile, write: opts.write }),
        renderText: (r) =>
          [
            `correction filled on ${r.filled.correction}, falsifiedBy on ${r.filled.falsifiedBy}.`,
            r.withoutFalsifier.length
              ? `no falsifier in detail: ${r.withoutFalsifier.join(', ')}`
              : 'every finding carries a falsifier.',
            r.written
              ? `Written to ${r.path}`
              : 'Dry run — pass --write to apply.'
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('set-slots <runId>')
    .description(
      'Write many slots across many increments in one atomic write, from a JSON file of {id: {slot: text}}'
    )
    .requiredOption('--file <path>', 'JSON file of slots')
    .option('--pass <a|b>', 'Which migration pass wrote this text')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          setSlots({
            profile,
            slots: readJsonFile(opts.file),
            pass: opts.pass
          }),
        renderText: (r) =>
          `${r.slots} slots across ${r.increments} increments${r.pass ? `, pass ${r.pass.toUpperCase()}` : ''}.`,
        timVersion
      })
    )

  parity
    .command('set-decision <runId> <incrementId>')
    .description('Write the decision question for one gated increment')
    .requiredOption('--question <text>', 'One sentence, 25 words or fewer')
    .option('--source <kind>', 'extracted or authored', 'authored')
    .option('--option <text...>', 'An option the prose names')
    .option('--consequence <text>', 'What stays blocked if it is not settled')
    .action(
      makeParityAction({
        run: ({ profile, args }, opts) =>
          setDecisionRequired({
            profile,
            id: args[1],
            decisionRequired: {
              question: opts.question,
              source: opts.source,
              options: opts.option ?? undefined,
              consequence: opts.consequence
            }
          }),
        renderText: (r) => `${r.id}.finding.decisionRequired set.`,
        timVersion
      })
    )

  parity
    .command('set-citation <runId> <incrementId> <ref>')
    .description(
      'Resolve one queued citation by hand, or correct one that is already resolved'
    )
    .requiredOption('--repo <key>', 'Repo key from corpora.json')
    .requiredOption('--path <path>', 'Repo-relative path')
    .option(
      '--lines <spec>',
      'Correct the line, range or list of them, like 41, 41-53 or 27,54,68'
    )
    .option(
      '--why <text>',
      'Why this is the right file. Needed to correct a citation that is already resolved'
    )
    .action(
      makeParityAction({
        run: ({ profile, args }, opts) =>
          setCitation({
            profile,
            id: args[1],
            ref: args[2],
            repo: opts.repo,
            path: opts.path,
            lines: opts.lines,
            why: opts.why
          }),
        renderText: (r) =>
          `${r.amended ? 'Corrected' : 'Resolved'} ${r.id}/${r.ref} -> ${r.repo}:${r.path}${
            r.ranges?.length
              ? `:${r.ranges
                  .map((range) =>
                    range.end !== range.start
                      ? `${range.start}-${range.end}`
                      : `${range.start}`
                  )
                  .join(',')}`
              : ''
          }`,
        timVersion
      })
    )

  parity
    .command('check <runId>')
    .description('Run the migration invariants I1 to I10')
    .option('--pass <a|b>', 'Which gate set to apply', 'a')
    .option('--baseline <ref>', 'Git ref holding the pre-migration backlog')
    .action(
      makeParityAction({
        run: ({ profile, workspaceRoot }, opts) =>
          runCheck({
            profile,
            workspaceRoot,
            pass: opts.pass,
            baseline: opts.baseline
          }),
        renderText: (result) => result.text,
        timVersion
      })
    )
}
