import { z } from 'zod'
import { workareaDirFor } from '../../backlog/workarea.js'
import { distilLayout, loadDistilSchemas } from '../../distil/files.js'
import { checkDistil, distilStatus } from '../../distil/checks.js'
import { mergeVerifyParts } from '../../distil/merge-verify.js'
import { mergeExtractParts } from '../../distil/merge-extract.js'
import { resetReconcile, resetSources } from '../../distil/reset.js'
import {
  areaRequirements,
  checkAreas,
  writeAreaWorkingSets
} from '../../distil/areas.js'
import { mergeReconcile } from '../../distil/merge-reconcile.js'
import {
  checkChallenge,
  clearChallenges,
  listChallenges
} from '../../distil/challenge.js'
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

const RECONCILE_RESET_ALONE =
  '--stage reconcile resets the later stages for the whole workarea, so it takes no --source and no --all.'

const resetOptsSchema = z
  .object({
    stage: z.enum(['extract', 'reconcile'], {
      message: '--stage must be extract or reconcile.'
    }),
    source: z.array(sourceIdSchema),
    all: z.boolean()
  })
  .refine(
    ({ stage, source, all }) =>
      stage === 'extract' || (source.length === 0 && !all),
    { message: RECONCILE_RESET_ALONE }
  )
  .refine(
    ({ stage, source, all }) =>
      stage === 'reconcile' || all !== source.length > 0,
    { message: RESET_CHOICE }
  )

const areaIdSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'An area id is lower-case words joined by hyphens, such as origin or address-book.'
  )

const areasOptsSchema = z
  .object({
    area: areaIdSchema.optional(),
    write: z.boolean(),
    requirements: z.boolean()
  })
  .refine(
    ({ area, write, requirements }) => !(write && (area || requirements)),
    {
      message:
        '--write writes every area at once, so it takes no --area or --requirements. Use one or the other.'
    }
  )

const mergeReconcileOptsSchema = z.object({ area: areaIdSchema.optional() })

const challengeOptsSchema = z
  .object({
    conflict: z
      .string()
      .regex(/^c-[0-9]{3,}$/, 'A conflict id is c- then digits, such as c-002.')
      .optional(),
    clear: z.boolean()
  })
  .refine(({ conflict, clear }) => !(conflict && clear), {
    message: '--clear removes every verdict, so it takes no --conflict.'
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

const countOf = (count, word, plural = `${word}s`) =>
  `${count} ${count === 1 ? word : plural}`

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

const renderReconcileReset = (result) =>
  result.superseded
    ? [
        `Moved ${countOf(result.moved.length, 'file or folder', 'files or folders')} to ${result.superseded}/reconcile:`,
        ...result.moved.map((file) => `  ${file.from}`),
        'Every verified extract is kept: the next launch reconciles from nothing.'
      ].join('\n')
    : 'Nothing to move: the workarea has no requirements, conflicts, areas, backlog or report yet.'

const renderReset = (result) =>
  result.stage === 'reconcile'
    ? renderReconcileReset(result)
    : renderSourceReset(result)

const renderAreaLine = (area) =>
  `  ${area.id}, ${area.title}: ${countOf(area.claims, 'claim')} from ${area.sources.map((source) => `${source.id} ${source.claims}`).join(', ')}${area.toBuild ? `. ${countOf(area.reconciled.length, 'requirement')}, ${area.toBuild.length} to build` : ''}`

const renderAreas = (result) =>
  [
    ...(result.total !== undefined
      ? [
          `${countOf(result.areas.length, 'area')}, ${countOf(result.total, 'claim')} between them, all in shape.`
        ]
      : []),
    ...result.areas.map(renderAreaLine),
    ...(result.unassigned?.length
      ? [`In no area: ${result.unassigned.join(', ')}`]
      : []),
    ...(result.written
      ? [
          `Wrote ${countOf(result.written.length, 'working set')}. Removed ${countOf(result.removed.length, 'file or folder', 'files or folders')} an earlier reconcile left.`
        ]
      : [])
  ].join('\n')

const renderMergeReconcile = (result) =>
  [
    ...result.areas.map(
      (area) =>
        `  ${area.id}: ${countOf(area.requirements, 'requirement')} (${area.newRequirements} new), ${countOf(area.conflicts, 'conflict')} (${area.newConflicts} new)`
    ),
    result.requirements === undefined
      ? 'In shape. Nothing written.'
      : `Merged into ${countOf(result.requirements, 'requirement')} and ${countOf(result.conflicts, 'conflict')}, ${result.renumbered} new ids numbered. Id map: ${result.idMap}`
  ].join('\n')

const renderChallenge = (result) => {
  if (result.removed) {
    return `Removed ${countOf(result.removed.length, 'verdict')}.`
  }
  if (result.verdict) {
    return `${result.conflict}: ${result.verdict}, in shape.`
  }
  return [
    `${countOf(result.questions.length, 'question')} to challenge:`,
    ...result.questions.map(
      (question) =>
        `  ${question.id}: ${question.question} (${question.requirements.join(', ')})`
    ),
    ...result.verdicts.map(
      (verdict) => `  verdict ${verdict.conflict}: ${verdict.verdict}`
    )
  ].join('\n')
}

const renderSourceReset = (result) =>
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
      'Start a stage again, keeping what it replaces under distil/superseded/<time>/. --stage extract (the default) sets sources back to pending, moving their extract, partition, parts and verify files. --stage reconcile keeps every verified extract and moves the requirements, conflicts, areas, challenge verdicts, backlog and report'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil reset shared/my-programme --source repo:frontend --source trace:recorded-run --json\n' +
        '  tim distil reset shared/my-programme --all --json\n' +
        '  tim distil reset shared/my-programme --stage reconcile --json\n' +
        'Use --stage extract when the extract method has changed: the next reconcile re-cites the new claims. Use --stage reconcile when the reconcile or consolidate method has changed: the next launch reconciles from nothing, and new ids start again. A normal re-distil needs no reset. --stage reconcile refuses while a backlog row has build work on it.'
    )
    .option('--stage <stage>', 'extract or reconcile', 'extract')
    .option(
      '--source <id>',
      'With --stage extract: a source to reset. Give it once for each source',
      collect,
      []
    )
    .option('--all', 'With --stage extract: reset every source in sources.json')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(resetOptsSchema, {
            stage: opts.stage,
            source: opts.source,
            all: opts.all === true
          })
          const { layout, schemas } = contextFor(workspaceRoot, args[0])
          if (parsed.stage === 'reconcile') {
            return { stage: 'reconcile', ...resetReconcile({ layout }) }
          }
          return {
            stage: 'extract',
            ...resetSources({
              layout,
              schemas,
              sourceIds: parsed.source,
              all: parsed.all
            })
          }
        },
        renderText: renderReset,
        timVersion
      })
    )

  distil
    .command('areas <workarea>')
    .description(
      "Check distil/areas.json, the plan that cuts reconcile into areas, and count each area's claims. --write starts a reconcile: it writes each area's working set and removes what an earlier reconcile left. --area lists one area's reconciled requirements"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil areas shared/my-programme --json\n' +
        '  tim distil areas shared/my-programme --write --json\n' +
        '  tim distil areas shared/my-programme --area origin --json\n' +
        '  tim distil areas shared/my-programme --requirements --json\n' +
        'Exits 1 and names every problem: a claim in no area, a slice that names no part or claim, an existing id in no area or two.'
    )
    .option(
      '--write',
      "Write each area's working set to distil/areas/<area id>/working-set.json, and remove each area's reconciled and draft-row files, the merge's id map and the challenge verdicts an earlier run left"
    )
    .option(
      '--area <id>',
      'One area, with the requirements now in requirements.json that it reconciled and those still to build'
    )
    .option(
      '--requirements',
      "Every area's reconciled requirements and those still to build, and the requirements no area holds"
    )
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(areasOptsSchema, {
            area: opts.area,
            write: opts.write === true,
            requirements: opts.requirements === true
          })
          const context = contextFor(workspaceRoot, args[0])
          if (parsed.write) return writeAreaWorkingSets(context)
          if (parsed.area || parsed.requirements) {
            return areaRequirements({ ...context, areaId: parsed.area })
          }
          return checkAreas(context)
        },
        renderText: renderAreas,
        timVersion
      })
    )

  distil
    .command('merge-reconcile <workarea>')
    .description(
      "Join every area's distil/areas/<area id>/reconciled.json into requirements.json and conflicts.json. Existing ids stay; each new id takes the next free number, and the citations follow. Writes nothing unless every area's file is in shape. --area checks one area's file and writes nothing"
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil merge-reconcile shared/my-programme --area origin --json\n' +
        '  tim distil merge-reconcile shared/my-programme --json\n' +
        "Exits 1 and names every problem: a missing area file, an id that is not the area's, an existing id left out, a claim outside the area's working set, a conflict nobody can find."
    )
    .option('--area <id>', "Check this area's file only, and write nothing")
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(mergeReconcileOptsSchema, {
            area: opts.area
          })
          return mergeReconcile({
            ...contextFor(workspaceRoot, args[0]),
            areaId: parsed.area
          })
        },
        renderText: renderMergeReconcile,
        timVersion
      })
    )

  distil
    .command('challenge <workarea>')
    .description(
      'The question conflicts a challenge works through, and the verdicts already written to distil/challenge/. --conflict checks one verdict; --clear removes them all'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim distil challenge shared/my-programme --json\n' +
        '  tim distil challenge shared/my-programme --conflict c-002 --json\n' +
        '  tim distil challenge shared/my-programme --clear --json\n' +
        'tim distil coverage then checks every settling verdict was applied to conflicts.json and requirements.json.'
    )
    .option('--conflict <id>', 'Check the verdict for this conflict')
    .option('--clear', 'Remove every verdict')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const parsed = parseOptions(challengeOptsSchema, {
            conflict: opts.conflict,
            clear: opts.clear === true
          })
          const context = contextFor(workspaceRoot, args[0])
          if (parsed.clear) return clearChallenges(context)
          if (parsed.conflict) {
            return checkChallenge({ ...context, conflictId: parsed.conflict })
          }
          return listChallenges(context)
        },
        renderText: renderChallenge,
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
            folder: parsed.folder,
            workspaceRoot
          })
        },
        renderText: renderTrace,
        timVersion
      })
    )
}
