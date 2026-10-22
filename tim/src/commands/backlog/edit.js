import { z } from 'zod'
import { existsSync, readFileSync } from 'node:fs'
import { addRow } from '../../backlog/add-row.js'
import { loadBacklogSchema } from '../../backlog/backlog-schema.js'
import { readJsonFile, writeJsonAtomic } from '../../backlog/io.js'
import { NOTE_FIELDS, editNotes, notesOf } from '../../backlog/row-notes.js'
import { moveRow } from '../../backlog/row-order.js'
import { workareaBacklogReader } from '../../backlog/workarea.js'
import { TimError } from '../../errors.js'
import { makeBacklogAction, parseOptions } from './shared.js'
import { backlogPathFor } from './rows.js'

const ROW_ID_MESSAGE = 'must be a row id, such as inc-004.'

const rowIdSchema = (option) =>
  z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, `${option} ${ROW_ID_MESSAGE}`)

const placeSchema = {
  before: rowIdSchema('--before').optional(),
  after: rowIdSchema('--after').optional(),
  write: z.boolean().optional().default(false)
}

const notBoth = (opts) => !(opts.before && opts.after)
const NOT_BOTH = { message: 'Give --before or --after, not both.' }

const moveOptsSchema = z
  .object(placeSchema)
  .refine(notBoth, NOT_BOTH)
  .refine((opts) => opts.before || opts.after, {
    message: 'Give --before or --after.'
  })

const GIVE_FROM = 'Give --from: the JSON file holding the row.'

const addOptsSchema = z
  .object({
    ...placeSchema,
    from: z.string({ message: GIVE_FROM }).trim().min(1, GIVE_FROM)
  })
  .refine(notBoth, NOT_BOTH)

const POSITION = /^[1-9]\d*$/
const REPLACE_ENTRY = /^([1-9]\d*)=(.+)$/

const notesOptsSchema = z.object({
  remove: z.string().optional(),
  replace: z.array(z.string()).optional().default([]),
  openQuestions: z.boolean().optional().default(false),
  write: z.boolean().optional().default(false)
})

/**
 * Validate `tim backlog move`'s options before the backlog is read.
 *
 * @param {object} opts
 * @returns {{before?: string, after?: string, write: boolean}}
 * @throws {TimError} USAGE
 */
export const parseMoveOpts = (opts) =>
  parseOptions(moveOptsSchema, {
    before: opts.before,
    after: opts.after,
    write: opts.write
  })

/**
 * Validate `tim backlog add`'s options before the backlog is read.
 *
 * @param {object} opts
 * @returns {{from: string, before?: string, after?: string, write: boolean}}
 * @throws {TimError} USAGE
 */
export const parseAddOpts = (opts) =>
  parseOptions(addOptsSchema, {
    from: opts.from,
    before: opts.before,
    after: opts.after,
    write: opts.write
  })

const parseRemove = (raw) => {
  if (raw === undefined) return []
  const positions = raw
    .split(',')
    .map((position) => position.trim())
    .filter(Boolean)
  const invalid = positions.filter((position) => !POSITION.test(position))
  if (invalid.length || !positions.length) {
    throw new TimError(
      'USAGE',
      '--remove must be note numbers separated by commas, counting from 1, such as 2,5.'
    )
  }
  return positions.map(Number)
}

const readNoteText = (path) => {
  if (!existsSync(path)) throw new TimError('NOT_FOUND', `Can't find ${path}.`)
  const text = readFileSync(path, 'utf8').trim()
  if (!text) throw new TimError('USAGE', `${path} is empty. A note needs text.`)
  return text
}

const parseReplaceEntry = (entry) => {
  const match = REPLACE_ENTRY.exec(entry.trim())
  if (!match) {
    throw new TimError(
      'USAGE',
      `--replace "${entry}" must be <note number>=<file>, such as 5=note.txt.`
    )
  }
  return [Number(match[1]), readNoteText(match[2])]
}

/**
 * Validate `tim backlog notes`'s options and read each replacement note's
 * text, before the backlog is read.
 *
 * @param {object} opts
 * @returns {{remove: number[], replace: Record<number, string>, field: 'notes'|'openQuestions', write: boolean}}
 * @throws {TimError} USAGE, or NOT_FOUND when a replacement file is missing
 */
export const parseNotesOpts = (opts) => {
  const parsed = parseOptions(notesOptsSchema, {
    remove: opts.remove,
    replace: opts.replace,
    openQuestions: opts.openQuestions,
    write: opts.write
  })
  return {
    remove: parseRemove(parsed.remove),
    replace: Object.fromEntries(parsed.replace.map(parseReplaceEntry)),
    field: parsed.openQuestions ? 'openQuestions' : 'notes',
    write: parsed.write
  }
}

const writeLine = ({ written, path }) =>
  written ? `Written to ${path}` : 'Nothing written. Add --write to write it.'

const placeOf = ({ before, after }) =>
  before ? `before ${before}` : `after ${after}`

const renderMove = (result) =>
  result.from === result.to
    ? `${result.id} is already ${placeOf(result)}. Nothing written.`
    : [
        `${result.id} moves from row ${result.from} to row ${result.to}, ${placeOf(result)}.`,
        writeLine(result)
      ].join('\n')

const renderAdd = (result) =>
  [
    `${result.id} goes in as row ${result.position} of ${result.total}${result.before || result.after ? `, ${placeOf(result)}` : ''}.`,
    writeLine(result)
  ].join('\n')

const capitalised = (text) => `${text[0].toUpperCase()}${text.slice(1)}`

const renderNoteList = (notes, words) =>
  notes.length
    ? notes.map((note, at) => `${at + 1}. ${note}`).join('\n\n')
    : `No ${words.many}.`

const renderChange = (change, words) => {
  const label = `${capitalised(words.one)} ${change.position}`
  return change.after === null
    ? `${label} removed:\n- ${change.before}`
    : `${label} replaced:\n- ${change.before}\n+ ${change.after}`
}

const renderNotes = (result) => {
  const words = NOTE_FIELDS[result.field]
  const entries = result[result.field]
  if (!result.changes) return renderNoteList(entries, words)
  if (!result.changes.length) {
    return `${result.id} already has those ${words.many}. Nothing written.`
  }
  return [
    ...result.changes.map((change) => renderChange(change, words)),
    writeLine(result)
  ].join('\n\n')
}

const writeIf = (shouldWrite, path, backlog) => {
  if (shouldWrite) writeJsonAtomic(path, backlog)
  return shouldWrite
}

const DRY_RUN = 'A dry run unless given --write'

export const register = (backlog, { timVersion }) => {
  backlog
    .command('move <workarea> <id>')
    .description(
      `Move one row straight before or after another row, keeping every other row in its order. The build takes the first buildable row in file order, so this changes what builds next. ${DRY_RUN}`
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog move shared/my-programme inc-009 --before inc-004 --json\n' +
        '  tim backlog move shared/my-programme inc-009 --after inc-004 --write --json'
    )
    .option('--before <id>', 'The row to move it straight before')
    .option('--after <id>', 'The row to move it straight after')
    .option('--write', 'Write the new order to backlog.json')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          const id = args[1]
          const options = parseMoveOpts(opts)
          const moved = moveRow({ backlog: readJsonFile(path), id, ...options })
          const changed = moved.from !== moved.to
          return {
            path,
            id,
            before: options.before,
            after: options.after,
            from: moved.from,
            to: moved.to,
            written: writeIf(options.write && changed, path, moved.backlog)
          }
        },
        renderText: renderMove,
        timVersion
      })
    )

  backlog
    .command('add <workarea>')
    .description(
      `Add one row, read from a JSON file, straight before or after another row, or at the end. Refused when the row would put the backlog out of the shape tim backlog check holds it to. ${DRY_RUN}`
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog add shared/my-programme --from inc-012.json --json\n' +
        '  tim backlog add shared/my-programme --from inc-012.json --after inc-004 --write --json'
    )
    .option('--from <file>', 'The JSON file holding the row to add')
    .option('--before <id>', 'The row to add it straight before')
    .option('--after <id>', 'The row to add it straight after')
    .option('--write', 'Write the row to backlog.json')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          const options = parseAddOpts(opts)
          const row = readJsonFile(options.from)
          const added = addRow({
            backlog: readJsonFile(path),
            row,
            before: options.before,
            after: options.after,
            schema: loadBacklogSchema(workspaceRoot),
            readWorkareaBacklog: workareaBacklogReader(workspaceRoot)
          })
          return {
            path,
            id: row.id,
            before: options.before,
            after: options.after,
            position: added.position,
            total: added.backlog.increments.length,
            written: writeIf(options.write, path, added.backlog)
          }
        },
        renderText: renderAdd,
        timVersion
      })
    )

  backlog
    .command('notes <workarea> <id>')
    .description(
      `List one row's notes, or with --open-questions its open questions, numbered from 1, or remove and replace them by number. Numbers refer to the list before the edit. Listing writes nothing; an edit is ${DRY_RUN.toLowerCase()}`
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim backlog notes shared/my-programme inc-004 --json\n' +
        '  tim backlog notes shared/my-programme inc-004 --remove 2,5 --json\n' +
        '  tim backlog notes shared/my-programme inc-004 --replace 3=note.txt --remove 6 --write --json\n' +
        '  tim backlog notes shared/my-programme inc-004 --open-questions --json\n' +
        '  tim backlog notes shared/my-programme inc-004 --open-questions --remove 1 --write --json\n' +
        'To add a note or an open question, use tim backlog set --note or --open-question.'
    )
    .option(
      '--open-questions',
      "Work on the row's open questions instead of its notes"
    )
    .option(
      '--remove <numbers>',
      'The notes to remove, by number, separated by commas'
    )
    .option(
      '--replace <number=file>',
      'Replace a note with the text in a file. Repeat for more than one note',
      (value, previous = []) => [...previous, value]
    )
    .option('--write', 'Write the edited notes to backlog.json')
    .action(
      makeBacklogAction({
        run: ({ workspaceRoot, args }, opts) => {
          const path = backlogPathFor(workspaceRoot, args[0])
          const id = args[1]
          const options = parseNotesOpts(opts)
          const current = readJsonFile(path)
          const isEdit =
            options.remove.length > 0 || Object.keys(options.replace).length > 0
          const { field } = options
          if (!isEdit) {
            return { path, id, field, [field]: notesOf(current, id, field) }
          }
          const edited = editNotes({
            backlog: current,
            id,
            remove: options.remove,
            replace: options.replace,
            field
          })
          return {
            path,
            id,
            field,
            [field]: edited.notes,
            changes: edited.changes,
            written: writeIf(
              options.write && edited.changes.length > 0,
              path,
              edited.backlog
            )
          }
        },
        renderText: renderNotes,
        timVersion
      })
    )
}
