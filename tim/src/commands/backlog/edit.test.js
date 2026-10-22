import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  cpSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BACKLOG_SCHEMA_PATH } from '../../backlog/backlog-schema.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'

const here = dirname(fileURLToPath(import.meta.url))
const realSchemaPath = join(here, '..', '..', '..', '..', BACKLOG_SCHEMA_PATH)

const WORKAREA = 'shared/demo'

const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  detail:
    'An importer sees their own notifications, so they can pick one up again.',
  acceptanceCriteria: [
    'The list shows only notifications the signed-in user created.'
  ],
  dependsOn: [],
  status: 'todo',
  ...overrides
})

let workspace

const backlogPath = () => join(workspace, 'workareas', WORKAREA, 'backlog.json')

const writeBacklog = (rows) => {
  mkdirSync(dirname(backlogPath()), { recursive: true })
  writeFileSync(
    backlogPath(),
    JSON.stringify({ programme: 'demo', increments: rows })
  )
}

const readRows = () =>
  JSON.parse(readFileSync(backlogPath(), 'utf8')).increments

const idsOnDisk = () => readRows().map((candidate) => candidate.id)

const writeScratch = (name, content) => {
  const path = join(workspace, name)
  writeFileSync(path, content)
  return path
}

const runTim = (args) =>
  runTimInWorkspace(workspace, ['backlog', ...args, '--json'])

beforeEach(() => {
  workspace = realpathSync(createCliWorkspace('tim-edit-'))
  const schemaCopy = join(workspace, BACKLOG_SCHEMA_PATH)
  mkdirSync(dirname(schemaCopy), { recursive: true })
  cpSync(realSchemaPath, schemaCopy)
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim backlog move', () => {
  test('reports the move and writes nothing without --write', async () => {
    writeBacklog([row(), row({ id: 'inc-002' }), row({ id: 'inc-003' })])

    const run = await runTim([
      'move',
      WORKAREA,
      'inc-003',
      '--before',
      'inc-001'
    ])

    expect(envelopeOf(run).result).toEqual({
      path: backlogPath(),
      id: 'inc-003',
      before: 'inc-001',
      from: 3,
      to: 1,
      written: false
    })
    expect(idsOnDisk()).toEqual(['inc-001', 'inc-002', 'inc-003'])
  })

  test('writes the new order with --write', async () => {
    writeBacklog([row(), row({ id: 'inc-002' }), row({ id: 'inc-003' })])

    const run = await runTim([
      'move',
      WORKAREA,
      'inc-001',
      '--after',
      'inc-002',
      '--write'
    ])

    expect(run.exitCode).toBe(0)
    expect(idsOnDisk()).toEqual(['inc-002', 'inc-001', 'inc-003'])
  })

  test('changes which row tim backlog next returns', async () => {
    writeBacklog([row(), row({ id: 'inc-002' })])

    await runTim([
      'move',
      WORKAREA,
      'inc-002',
      '--before',
      'inc-001',
      '--write'
    ])
    const next = await runTim(['next', WORKAREA])

    expect(envelopeOf(next).result.next).toBe('inc-002')
  })

  test('refuses a move with neither --before nor --after', async () => {
    writeBacklog([row(), row({ id: 'inc-002' })])

    const run = await runTim(['move', WORKAREA, 'inc-002'])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe('Give --before or --after.')
  })

  test('refuses both --before and --after', async () => {
    writeBacklog([row(), row({ id: 'inc-002' })])

    const run = await runTim([
      'move',
      WORKAREA,
      'inc-002',
      '--before',
      'inc-001',
      '--after',
      'inc-001'
    ])

    expect(envelopeOf(run).errors[0].message).toBe(
      'Give --before or --after, not both.'
    )
  })
})

describe('tim backlog add', () => {
  test('reports where the row goes and writes nothing without --write', async () => {
    writeBacklog([row(), row({ id: 'inc-002' })])
    const from = writeScratch(
      'row.json',
      JSON.stringify(row({ id: 'inc-003' }))
    )

    const run = await runTim([
      'add',
      WORKAREA,
      '--from',
      from,
      '--after',
      'inc-001'
    ])

    expect(envelopeOf(run).result).toEqual({
      path: backlogPath(),
      id: 'inc-003',
      after: 'inc-001',
      position: 2,
      total: 3,
      written: false
    })
    expect(idsOnDisk()).toEqual(['inc-001', 'inc-002'])
  })

  test('writes the row with --write', async () => {
    writeBacklog([row(), row({ id: 'inc-002' })])
    const added = row({ id: 'inc-003', title: 'Tidy the documents page' })
    const from = writeScratch('row.json', JSON.stringify(added))

    await runTim([
      'add',
      WORKAREA,
      '--from',
      from,
      '--before',
      'inc-002',
      '--write'
    ])

    expect(readRows()[1]).toEqual(added)
  })

  test('refuses a row out of shape, naming the problem, and writes nothing', async () => {
    writeBacklog([row()])
    const from = writeScratch(
      'row.json',
      JSON.stringify(row({ id: 'inc-002', filesToTouch: ['a.js'] }))
    )

    const run = await runTim(['add', WORKAREA, '--from', from, '--write'])

    expect(run.exitCode).toBe(1)
    expect(envelopeOf(run).errors[0].message).toBe(
      'Adding inc-002 would put the backlog out of shape:\ninc-002 carries "filesToTouch". A row says what, why and acceptance; the build plans the how.'
    )
    expect(idsOnDisk()).toEqual(['inc-001'])
  })

  test('names a missing row file', async () => {
    writeBacklog([row()])
    const from = join(workspace, 'absent.json')

    const run = await runTim(['add', WORKAREA, '--from', from])

    expect(envelopeOf(run).errors[0].message).toBe(`Can't find ${from}.`)
  })

  test('refuses an add with no --from', async () => {
    writeBacklog([row()])

    const run = await runTim(['add', WORKAREA])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      'Give --from: the JSON file holding the row.'
    )
  })
})

describe('tim backlog notes', () => {
  test('lists the notes, numbered from 1 in the text output', async () => {
    writeBacklog([row({ notes: ['First', 'Second'] })])

    const run = await runTimInWorkspace(workspace, [
      'backlog',
      'notes',
      WORKAREA,
      'inc-001'
    ])

    expect(run.stdout).toBe('1. First\n\n2. Second')
  })

  test('reports a remove and a replace and writes nothing without --write', async () => {
    writeBacklog([row({ notes: ['First', 'Second', 'Third'] })])
    const replacement = writeScratch('note.txt', 'Third, trimmed\n')

    const run = await runTim([
      'notes',
      WORKAREA,
      'inc-001',
      '--remove',
      '1',
      '--replace',
      `3=${replacement}`
    ])

    expect(envelopeOf(run).result).toEqual({
      path: backlogPath(),
      id: 'inc-001',
      notes: ['Second', 'Third, trimmed'],
      changes: [
        { position: 1, before: 'First', after: null },
        { position: 3, before: 'Third', after: 'Third, trimmed' }
      ],
      written: false
    })
    expect(readRows()[0].notes).toEqual(['First', 'Second', 'Third'])
  })

  test('writes the edited notes with --write', async () => {
    writeBacklog([row({ notes: ['First', 'Second'] })])
    const replacement = writeScratch('note.txt', 'Second, split')

    await runTim([
      'notes',
      WORKAREA,
      'inc-001',
      '--replace',
      `2=${replacement}`,
      '--write'
    ])

    expect(readRows()[0].notes).toEqual(['First', 'Second, split'])
  })

  test('refuses a --remove that is not note numbers', async () => {
    writeBacklog([row({ notes: ['First'] })])

    const run = await runTim(['notes', WORKAREA, 'inc-001', '--remove', 'one'])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      '--remove must be note numbers separated by commas, counting from 1, such as 2,5.'
    )
  })

  test('refuses a --replace without a file', async () => {
    writeBacklog([row({ notes: ['First'] })])

    const run = await runTim(['notes', WORKAREA, 'inc-001', '--replace', '1'])

    expect(envelopeOf(run).errors[0].message).toBe(
      '--replace "1" must be <note number>=<file>, such as 5=note.txt.'
    )
  })

  test('refuses an empty replacement file', async () => {
    writeBacklog([row({ notes: ['First'] })])
    const replacement = writeScratch('note.txt', '\n')

    const run = await runTim([
      'notes',
      WORKAREA,
      'inc-001',
      '--replace',
      `1=${replacement}`
    ])

    expect(envelopeOf(run).errors[0].message).toBe(
      `${replacement} is empty. A note needs text.`
    )
  })
})
