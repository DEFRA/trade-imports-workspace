import { z } from 'zod'
import { workareaDirFor } from '../../backlog/workarea.js'
import { distilLayout, loadDistilSchemas } from '../../distil/files.js'
import { checkDistil, distilStatus } from '../../distil/checks.js'
import { mergeVerifyParts } from '../../distil/merge-verify.js'
import { mergeExtractParts } from '../../distil/merge-extract.js'
import { resetSources } from '../../distil/reset.js'
import { workingSetOf, writeWorkingSet } from '../../distil/working-set.js'
import { distilCoverage } from '../../distil/coverage.js'
import { stampScopeHash } from '../../distil/stamp.js'
import { adoptSource } from '../../distil/adopt.js'
import { snapshotBacklog } from '../../distil/backlog-snapshot.js'
import { runTrace } from '../../distil/trace.js'
import { makeBacklogAction, parseOptions } from '../backlog/shared.js'

const sourceIdSchema = z
  .string({ message: 'Name a source with --source, such as repo:tests.' })
  .trim()
  .min(1, 'Name a source with --source, such as repo:tests.')

const wholeNumberAbove0 = (option) =>
  z
    .string()
    .regex(/^[1-9][0-9]*$/, `${option} must be a whole number above 0.`)
    .transform(Number)
    .optional()

const checkOptsSchema = z.object({
  source: sourceIdSchema.optional(),
  stage: z.enum(['partition', 'extract', 'verify', 'all'], {
    message: '--stage must be one of: partition, extract, verify, all.'
  }),
  chunk: wholeNumberAbove0('--chunk'),
  part: wholeNumberAbove0('--part')
})

const sourceOptsSchema = z.object({ source: sourceIdSchema })

const RESET_CHOICE =
  'Name the sources to reset with --source, once for each, or reset every source with --all. Not both.'

const resetOptsSchema = z
  .object({
    source: z.array(sourceIdSchema),
    all: z.boolean()
  })
  .refine(({ source, all }) => all !== source.length > 0, {
    message: RESET_CHOICE
  })

const collect = (value, previous) => [...previous, value]

const snapshotTagSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    'A snapshot tag is lower-case letters, digits and hyphens, such as before or after-1.'
  )

const snapshotOptsSchema = z.object({
  save: snapshotTagSchema.optional(),
  compareTo: snapshotTagSchema.optional()
})

const traceOptsSchema = z.object({
  source: sourceIdSchema,
  out: z.string().optional(),
  folder: z.string().optional()
})

/**
 * The workarea folder and every DISTIL path in it, and the six schemas,
 * resolved and read before any command's own work begins.
 *
 * @param {string} workspaceRoot
 * @param {unknown} workarea
 * @returns {{workarea: string, layout: object, schemas: object}}
 */
const contextFor = (workspaceRoot, workarea) => {
  const layout = distilLayout(workareaDirFor(workspaceRoot, workarea))
  return {
    workarea: workarea.trim().replace(/\/+$/, ''),
    layout,
    schemas: loadDistilSchemas(workspaceRoot)
  }
}

const renderStatus = (result) =>
  [
    ...result.sources.map(
      (source) =>
        `${source.state.padEnd(9)} ${source.id}${source.next ? `  next: ${source.next}` : ''}  ${source.reason}`
    ),
    `${result.work.length} of ${result.sources.length} sources need work: ${Object.entries(
      result.counts
    )
      .map(([state, count]) => `${count} ${state}`)
      .join(', ')}.`,
    ...(result.orphans.length
      ? [
          `${result.orphans.length} files belong to no source in sources.json: ${result.orphans.join(', ')}`
        ]
      : [])
  ].join('\n')

const countOf = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const renderPartition = (source) =>
  [
    `${source.id}: ${countOf(source.parts.length, 'part')}. In shape.`,
    ...source.parts.map(
      (part) => `  part ${part.part}, ${part.title}: ${part.prefix}-001 on`
    )
  ].join('\n')

const renderPartRange = (part) =>
  `  part ${part.part}, ${part.title}: ${countOf(part.claims, 'claim')}${part.from ? `, ${part.from} to ${part.to}` : ''}`

const renderCheck = (result) =>
  [
    ...(result.stage === 'partition'
      ? result.sources.map(renderPartition)
      : []),
    ...(result.part
      ? result.sources.map(
          (source) =>
            `${source.id}: part ${result.part} in shape.\n${source.parts.map(renderPartRange).join('\n')}`
        )
      : []),
    ...(result.stage === 'partition' || result.part
      ? []
      : result.sources.map(renderCheckedSource)),
    ...(result.removedParts
      ? [
          `Removed ${countOf(result.removedParts.length, 'part file')}${result.removedParts.length ? `: ${result.removedParts.join(', ')}` : '.'}`
        ]
      : [])
  ].join('\n')

const renderMergeExtract = (result) =>
  [
    `Merged ${countOf(result.parts.length, 'part')} into ${result.path}: ${countOf(result.claims, 'claim')}, stamped with scope hash ${result.scopeHash}.`,
    ...result.parts.map(renderPartRange),
    'Kept the partition and the part files.'
  ].join('\n')

const renderReset = (result) =>
  result.superseded
    ? [
        `Moved ${countOf(result.moved, 'file')} to ${result.superseded}:`,
        ...result.sources.map(
          (source) =>
            `  ${source.id}: ${source.moved.length ? source.moved.map((file) => file.to).join(', ') : 'nothing to move'}`
        ),
        'These sources are pending: the next launch extracts and verifies them again.'
      ].join('\n')
    : `Nothing to move: ${result.sources.map((source) => source.id).join(', ')} had no extract or verify files.`

const renderCheckedSource = (source) => {
  const verify = source.verify
    ? `, ${source.verify.held} held, ${source.verify.refuted} refuted, ${source.verify.missed} missed`
    : ''
  return [
    `${source.id}: ${source.claims} claims${verify}. In shape.`,
    ...(source.parts ?? []).map(renderPartRange)
  ].join('\n')
}

const renderMerge = (result) =>
  [
    `Merged ${countOf(result.parts.length, 'part')} into ${result.path}: ${countOf(result.verdicts, 'verdict')} (${result.held} held, ${result.refuted} refuted), ${result.missed} missed.`,
    'Removed the part files.'
  ].join('\n')

const renderWorkingSet = (result) =>
  [
    ...result.sources.map(
      (source) =>
        `${source.id}: ${source.held} held, ${source.missed} missed, ${source.refuted} refuted and left out`
    ),
    ...result.unavailable.map(
      (source) => `${source.id}: left out, ${source.state}. ${source.reason}`
    ),
    `${result.total} claims in the working set.`,
    ...(result.path ? [`Written to ${result.path}`] : [])
  ].join('\n')

const renderCoverage = (result) =>
  [
    `${countOf(result.requirements.total, 'requirement')} and ${countOf(result.conflicts.total, 'conflict')} (${countOf(result.conflicts.question, 'question')}), all in shape.`,
    ...result.questions.map(
      (question) =>
        `${question.id}: ${question.question} Default: ${question.default}`
    ),
    result.backlog
      ? `${result.backlog.increments} increments cover ${result.backlog.covered} requirements.`
      : 'No backlog.json yet.'
  ].join('\n')

const renderStamp = (result) =>
  result.changed
    ? `Stamped ${result.path} with scope hash ${result.scopeHash}.`
    : `${result.path} already has scope hash ${result.scopeHash}. Nothing written.`

const renderAdopt = (result) =>
  [
    result.extract.stamped
      ? `Recorded the scope hash in ${result.extract.path}.`
      : `${result.extract.path} already had its scope hash.`,
    ...(result.verify.exists
      ? [
          result.verify.stamped
            ? `Recorded the extract hash in ${result.verify.path}.`
            : `${result.verify.path} already had its extract hash.`
        ]
      : []),
    `${result.source} is now ${result.state}.`
  ].join('\n')

const renderSnapshot = (result) =>
  [
    `${countOf(result.rows, 'row')}, ${result.frozen.length} built or set aside: ${result.frozen.join(', ') || 'none'}.`,
    ...(result.saved ? [`Saved to ${result.saved}.`] : []),
    ...(result.compared
      ? [
          `Since ${result.compared.tag}: removed ${result.compared.removed.join(', ') || 'none'}; changed ${result.compared.changed.join(', ') || 'none'}.`
        ]
      : [])
  ].join('\n')

const renderTrace = (result) =>
  result.out
    ? `Wrote ${countOf(result.lines, 'line')} to ${result.out}.`
    : result.stdout

export const register = (program, { timVersion }) => {
  const distil = program
    .command('distil')
    .description(
      "The requirements-pipeline skill's DISTIL files in one workarea: what each source still needs, and whether each file is in shape"
    )

  distil
    .command('status <workarea>')
    .description(
      "Every source in sources.json with its state (pending, extracted, verified, stale or invalid), what it needs next, and its scope hash. The distil workflow's work list"
    )
    .addHelpText(
      'after',
      '\nExample: tim distil status shared/my-programme --json\n' +
        'Exits 1 when sources.json is out of shape.'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }) =>
          distilStatus(contextFor(workspaceRoot, args[0])),
        renderText: renderStatus,
        timVersion
      })
    )

  distil
    .command('check <workarea>')
    .description(
      'Check the partition, extract parts, extract and verify files of one source, or every source, against their schemas and each other'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil check shared/my-programme --source repo:tests --stage partition --clear-parts --json\n' +
        '  tim distil check shared/my-programme --source repo:tests --stage extract --part 2 --json\n' +
        '  tim distil check shared/my-programme --source repo:tests --stage extract --chunk 60 --clear-parts --json\n' +
        '  tim distil check shared/my-programme --stage all --json\n' +
        'Exits 1 and names every problem when anything is out of shape.'
    )
    .option('--source <id>', 'One source id from sources.json')
    .option('--stage <stage>', 'partition, extract, verify or all', 'all')
    .option(
      '--chunk <claims>',
      'Split each extract into verify ranges of at most this many claims'
    )
    .option(
      '--part <n>',
      'With --stage extract: check only the partition and this one extract part file'
    )
    .option(
      '--clear-parts',
      'Once the check passes, remove the part files the next stage writes and list them, so nothing from an earlier run is merged: the extract part files after --stage partition, the verify part files after any other stage'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(checkOptsSchema, {
            source: opts.source,
            stage: opts.stage,
            chunk: opts.chunk,
            part: opts.part
          })
          return checkDistil({
            ...contextFor(workspaceRoot, args[0]),
            stage: parsed.stage,
            sourceId: parsed.source,
            chunk: parsed.chunk,
            part: parsed.part,
            clearParts: opts.clearParts === true
          })
        },
        renderText: renderCheck,
        timVersion
      })
    )

  distil
    .command('merge-extract <workarea>')
    .description(
      "Join a source's extract part files into its one extract, in part order, and stamp it with the scope hash. Writes nothing unless the partition and every part are in shape and no claim id is in two places. Keeps the parts"
    )
    .addHelpText(
      'after',
      '\nExample: tim distil merge-extract shared/my-programme --source repo:frontend --json\n' +
        'Exits 1 and names every problem when a part is missing or out of shape.'
    )
    .option('--source <id>', 'The source whose parts to merge')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(sourceOptsSchema, {
            source: opts.source
          })
          return mergeExtractParts({
            ...contextFor(workspaceRoot, args[0]),
            sourceId: parsed.source
          })
        },
        renderText: renderMergeExtract,
        timVersion
      })
    )

  distil
    .command('reset <workarea>')
    .description(
      'Set sources back to pending, so the next distil launch extracts and verifies them again even though their scope has not changed. Moves their extract, partition, parts and verify files to distil/superseded/<time>/, so nothing is lost'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil reset shared/my-programme --source repo:frontend --source trace:recorded-run --json\n' +
        '  tim distil reset shared/my-programme --all --json\n' +
        'Use it when the extract method has changed. Requirements that cite the old claims are rewritten by the next reconcile.'
    )
    .option(
      '--source <id>',
      'A source to reset. Give it once for each source',
      collect,
      []
    )
    .option('--all', 'Reset every source in sources.json')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(resetOptsSchema, {
            source: opts.source,
            all: opts.all === true
          })
          const { layout, schemas } = contextFor(workspaceRoot, args[0])
          return resetSources({
            layout,
            schemas,
            sourceIds: parsed.source,
            all: parsed.all
          })
        },
        renderText: renderReset,
        timVersion
      })
    )

  distil
    .command('merge-verify <workarea>')
    .description(
      "Join a source's verify part files into its one verify file, then remove the parts. Writes nothing unless every claim has exactly one verdict"
    )
    .addHelpText(
      'after',
      '\nExample: tim distil merge-verify shared/my-programme --source confluence:6604328622 --json'
    )
    .option('--source <id>', 'The source whose parts to merge')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(sourceOptsSchema, {
            source: opts.source
          })
          return mergeVerifyParts({
            ...contextFor(workspaceRoot, args[0]),
            sourceId: parsed.source
          })
        },
        renderText: renderMerge,
        timVersion
      })
    )

  distil
    .command('working-set <workarea>')
    .description(
      "The reconciler's input: each verified source's claims that held, plus the claims its verifiers found missing. Refuted claims are left out"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil working-set shared/my-programme --json\n' +
        '  tim distil working-set shared/my-programme --write --json'
    )
    .option(
      '--write',
      'Write the working set to distil/working-set.json and print only its counts'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const context = contextFor(workspaceRoot, args[0])
          const workingSet = workingSetOf(context)
          return opts.write
            ? writeWorkingSet({ layout: context.layout, workingSet })
            : workingSet
        },
        renderText: renderWorkingSet,
        timVersion
      })
    )

  distil
    .command('coverage <workarea>')
    .description(
      'Check requirements.json and conflicts.json against their schemas, the working set and each other, and, once backlog.json exists, that every adopted requirement to build sits in exactly one increment'
    )
    .addHelpText(
      'after',
      '\nExample: tim distil coverage shared/my-programme --json\n' +
        'Exits 1 and names every problem when anything is out of shape.'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }) =>
          distilCoverage(contextFor(workspaceRoot, args[0])),
        renderText: renderCoverage,
        timVersion
      })
    )

  distil
    .command('stamp <workarea>')
    .description(
      "Record a source's current scope hash in its extract, so status counts the extract as made for the source as sources.json describes it now"
    )
    .addHelpText(
      'after',
      '\nExample: tim distil stamp shared/my-programme --source repo:tests --json'
    )
    .option('--source <id>', 'The source whose extract to stamp')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(sourceOptsSchema, {
            source: opts.source
          })
          return stampScopeHash({
            ...contextFor(workspaceRoot, args[0]),
            sourceId: parsed.source
          })
        },
        renderText: renderStamp,
        timVersion
      })
    )

  distil
    .command('adopt <workarea>')
    .description(
      'Take on a source distilled before scope and extract hashes existed: record both hashes, so a launch skips it. Writes nothing unless its extract and verification are in shape and current'
    )
    .addHelpText(
      'after',
      '\nExample: tim distil adopt shared/my-programme --source repo:tests --json\n' +
        'Run it only for a source you know was extracted for its current scope. Exits 1 and names every reason it cannot be adopted.'
    )
    .option('--source <id>', 'The source to adopt')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(sourceOptsSchema, {
            source: opts.source
          })
          return adoptSource({
            ...contextFor(workspaceRoot, args[0]),
            sourceId: parsed.source
          })
        },
        renderText: renderAdopt,
        timVersion
      })
    )

  distil
    .command('backlog-snapshot <workarea>')
    .description(
      "The backlog's row ids and its rows built or set aside (any status but todo or blocked). Keep a snapshot under a tag, and compare with one later to see every row removed or changed that a re-distil must keep"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil backlog-snapshot shared/my-programme --save before --json\n' +
        '  tim distil backlog-snapshot shared/my-programme --compare-to before --json'
    )
    .option('--save <tag>', 'Keep this snapshot under a tag, such as before')
    .option(
      '--compare-to <tag>',
      'Report the rows removed, and the rows built or set aside that changed, since the snapshot with this tag'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(snapshotOptsSchema, {
            save: opts.save,
            compareTo: opts.compareTo
          })
          return snapshotBacklog({
            layout: contextFor(workspaceRoot, args[0]).layout,
            save: parsed.save,
            compareTo: parsed.compareTo
          })
        },
        renderText: renderSnapshot,
        timVersion
      })
    )

  distil
    .command('trace <workarea> [traceArgs...]')
    .description(
      "Run one playwright trace subcommand for a trace source, in that source's own working folder under distil/extract/, so no cd is needed"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil trace shared/my-programme --source trace:ched-p --json -- open ~/traces/abc.zip\n' +
        '  tim distil trace shared/my-programme --source trace:ched-p --out actions.txt --json -- actions\n' +
        '  tim distil trace shared/my-programme --source trace:ched-p --folder part3 --json -- open ~/traces/abc.zip\n' +
        "Put tim's own options first and the trace subcommand after --."
    )
    .option('--source <id>', 'A source whose kind is trace')
    .option(
      '--out <file>',
      'Write the output to this file in the working folder, rather than printing it'
    )
    .option(
      '--folder <name>',
      'Run in this sub-folder of the working folder, such as part3, so agents reading one source side by side each open their own trace'
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(traceOptsSchema, {
            source: opts.source,
            out: opts.out,
            folder: opts.folder
          })
          const context = contextFor(workspaceRoot, args[0])
          return runTrace({
            layout: context.layout,
            schemas: context.schemas,
            sourceId: parsed.source,
            traceArgs: args[1] ?? [],
            out: parsed.out,
            folder: parsed.folder
          })
        },
        renderText: renderTrace,
        timVersion
      })
    )
}
