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
import { runMap } from '../../parity/capture/cartography/run.js'
import { runSeedAnchors } from '../../parity/anchors.js'
import {
  runCheckEvidence,
  renderCheckEvidence,
  blockers
} from '../../parity/check-evidence.js'
import { runRepoint } from '../../parity/repoint.js'
import { runInsertionAnchors } from '../../parity/insertion.js'
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
        renderText: (result) =>
          [
            `${result.total} citations across ${result.increments} increments.`,
            ...Object.entries(result.byResolution).map(
              ([kind, n]) => `  ${kind.padEnd(20)} ${n}`
            ),
            `${result.unresolved.length} queued for a human.`,
            result.written
              ? `Written to ${result.path}`
              : 'Dry run — pass --write to apply.'
          ].join('\n'),
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
            result.outOfRange.length
              ? `${result.outOfRange.length} citations whose identifier is in the file but outside the cited lines — the range drifted.`
              : 'Every cited range contains what the prose says it does.',
            result.anchorMisses.length
              ? `${result.anchorMisses.length} citations whose identifier is absent from the whole file at the pin — the premise moved: ${result.anchorMisses.map((m) => `${m.increment}/${m.ref}`).join(', ')}`
              : 'No citation has lost its identifier.',
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
      'Emitter: local (full resolution) or artifact (crops only)',
      'local'
    )
    .option(
      '--require-images',
      'Exit non-zero when any cited screen has no image on either side'
    )
    .option(
      '--reseal',
      'Accept every picture that moved since it was last shown, clearing the drift panel'
    )
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runReport({
            profile,
            target: opts.target,
            open: opts.open,
            requireImages: opts.requireImages,
            reseal: opts.reseal
          }),
        renderText: (result) =>
          [
            `Wrote ${result.path} (${(result.bytes / 1024).toFixed(0)} KB).`,
            `Open it: file://${result.path}`,
            `${result.items.increments} findings, ${result.items.candidates} deferred candidates, ${result.items.withdrawn} withdrawn.`,
            ...result.imageCoverage.map(
              (c) => `images: ${c.side} ${c.have}/${c.want} cited screens`
            ),
            ...(result.inlining
              ? [
                  `carried inside the file: ${result.inlining.inlined} element crops as WebP, ${(result.inlining.bytes / 1024 / 1024).toFixed(1)} MB, shown ${result.inlining.uses} times.`,
                  `left where they are and linked: ${result.inlining.linked} full-page screenshots.`
                ]
              : []),
            ...result.warnings.map((w) => `warning: ${w}`)
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('check-evidence <runId>')
    .description(
      'Report the state of the evidence: pin drift, capture integrity, screens with no picture, anchors that matched nothing, citations whose target has moved'
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
    .command('seed-anchors <runId>')
    .description(
      'Derive element anchors from the delta files, so a capture can shoot the control a finding is about rather than the page it sits on'
    )
    .option('--write', 'Write the anchor files')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runSeedAnchors({ profile, write: opts.write }),
        renderText: (r) =>
          [
            ...r.sides.map(
              (side) =>
                `${side.side.padEnd(12)} ${side.anchors} anchors across ${side.screens} screens -> ${side.path}`
            ),
            r.written ? '' : 'Dry run — pass --write to apply.'
          ]
            .filter(Boolean)
            .join('\n'),
        timVersion
      })
    )

  parity
    .command('insertion-anchors <runId>')
    .description(
      'Derive where a one-sided control would sit on the side that lacks it, and fold the landmark into the anchor files'
    )
    .option('--write', 'Write the anchor files')
    .action(
      makeParityAction({
        run: ({ profile }, opts) =>
          runInsertionAnchors({ profile, write: opts.write }),
        renderText: (r) =>
          [
            ...r.sides.map(
              (side) =>
                `${side.side.padEnd(12)} ${side.insertions} insertion points across ${side.screens} screens -> ${side.path}`
            ),
            r.skipped?.length
              ? `${r.skipped.length} could not be placed:\n${r.skipped
                  .slice(0, 12)
                  .map(
                    (s) => `  - ${s.side}/${s.screen} ${s.missing}: ${s.why}`
                  )
                  .join('\n')}`
              : '',
            r.written ? '' : 'Dry run — pass --write to apply.'
          ]
            .filter(Boolean)
            .join('\n'),
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
    .command('map <runId>')
    .description(
      'Walk one side with no knowledge of its journey and record which screens it has, how to reach them, and what it could not reach'
    )
    .requiredOption('--side <id>', 'Which side to map')
    .option('--base-url <url>', 'Where the application is running')
    .option('--start-path <path>', 'Where the walk begins')
    .option('--budget-steps <n>', 'Stop after this many forward steps')
    .option('--budget-minutes <n>', 'Stop after this long')
    .option(
      '--data-state <text>',
      'What state the data was in',
      'fresh session'
    )
    .option('--headed', 'Watch the crawl in a browser window')
    .option('--write', 'Write the map, the hints stub and the page models')
    .option(
      '--check',
      'Exit non-zero while anything is unexplored, blocked or unfilled'
    )
    .action(
      makeParityAction({
        run: ({ profile, workspaceRoot }, opts) =>
          runMap({
            profile,
            workspaceRoot,
            side: opts.side,
            baseUrl: opts.baseUrl,
            startPath: opts.startPath,
            budgets: {
              ...(opts.budgetSteps ? { steps: Number(opts.budgetSteps) } : {}),
              ...(opts.budgetMinutes
                ? { wallClockMs: Number(opts.budgetMinutes) * 60_000 }
                : {})
            },
            dataState: opts.dataState,
            headed: opts.headed,
            write: opts.write,
            check: opts.check
          }),
        renderText: (r) =>
          [
            `${r.side}: ${r.coverage.screensMapped} screens across ${r.coverage.routeTemplatesSeen} routes. Stopped by ${r.stoppedBy}.`,
            ...r.screens.map((screen) =>
              `  ${screen.id.padEnd(44)} ${screen.blocked ? `blocked: ${screen.blocked}` : screen.terminal ? 'end of the journey' : ''}`.trimEnd()
            ),
            `${r.coverage.frontierRemaining} choices left unexplored, ${r.coverage.blockedScreens} screens blocked, ${r.coverage.unfilledFields} fields nothing could fill.`,
            ...r.blockers.map((b) => `  - ${b}`),
            `${r.capturable} of ${r.coverage.screensMapped} screens can be walked again by the capture stage.`,
            ...r.unexpressible.map((u) => `  - ${u.screen}: ${u.why}`),
            r.written
              ? `Map: ${r.mapPath}\nRoute plan for the capture: ${r.routePlanPath}\nHints to fill in: ${r.hintsPath}\nPage models: ${r.modelDir}`
              : 'Nothing written — pass --write to keep the map.'
          ].join('\n'),
        timVersion
      })
    )

  parity
    .command('capture <runId>')
    .description(
      'Walk one side and record what it does — a screenshot, an element crop per anchor and a page model for every screen the route plan reaches'
    )
    .requiredOption('--side <id>', 'Which side to capture')
    .option(
      '--plan <path>',
      'Route plan to walk, if not the one the discovery stage wrote for this side'
    )
    .option('--headed', 'Watch the walk in a browser window')
    .action(
      makeParityAction({
        run: ({ profile, workspaceRoot }, opts) =>
          runCapture({
            profile,
            workspaceRoot,
            side: opts.side,
            plan: opts.plan,
            headed: opts.headed
          }),
        renderText: (r) =>
          [
            `${r.side} at ${r.sha.slice(0, 8)}: walked ${r.screens} screens from ${r.routePlan}.`,
            `Pictures: ${r.captureDir}`,
            `Page models: ${r.modelDir}`,
            r.exitNonZero
              ? 'The walk did not finish cleanly. Read the run above, then look at the trace in the run directory.'
              : `Index them next: tim parity manifest <runId> --side ${r.side} --sha ${r.sha.slice(0, 8)} --write`
          ].join('\n'),
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
    .description('Resolve one queued citation by hand')
    .requiredOption('--repo <key>', 'Repo key from corpora.json')
    .requiredOption('--path <path>', 'Repo-relative path')
    .option('--lines <spec>', 'Correct the line or range, like 41 or 41-53')
    .option('--why <text>', 'Why this is the right file')
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
          `${r.id}/${r.ref} -> ${r.repo}:${r.path}${r.lines ? `:${r.lines.start}${r.lines.end !== r.lines.start ? `-${r.lines.end}` : ''}` : ''}`,
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
