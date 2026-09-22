import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  realpathSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { BACKLOG_SCHEMA_PATH } from '../../backlog/backlog-schema.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
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

const runTim = (args) =>
  execa(
    'node',
    [cliPath, 'backlog', ...args, '--workspace', workspace, '--json'],
    {
      reject: false
    }
  )

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'tim-rows-')))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
  const schemaCopy = join(workspace, BACKLOG_SCHEMA_PATH)
  mkdirSync(dirname(schemaCopy), { recursive: true })
  cpSync(realSchemaPath, schemaCopy)
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim backlog check', () => {
  test('passes a backlog in the one shape, with counts', async () => {
    writeBacklog([row(), row({ id: 'inc-002', status: 'done' })])
    const run = await runTim(['check', WORKAREA])
    expect(run.exitCode).toBe(0)
    expect(envelopeOf(run).result).toEqual({
      path: backlogPath(),
      problems: [],
      counts: { todo: 1, done: 1 },
      total: 2
    })
  })

  test('exits 1 and names every problem', async () => {
    writeBacklog([row({ filesToTouch: ['a.js'] })])
    const run = await runTim(['check', WORKAREA])
    expect(run.exitCode).toBe(1)
    expect(envelopeOf(run).errors[0].message).toBe(
      `1 problems in ${backlogPath()}:\ninc-001 carries "filesToTouch". A row says what, why and acceptance; the build plans the how.`
    )
  })

  test('refuses a workarea outside workareas/', async () => {
    const run = await runTim(['check', '../elsewhere'])
    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      'Workarea "../elsewhere" must be a path inside workareas/, such as shared/my-programme.'
    )
  })

  test('names a missing backlog', async () => {
    const run = await runTim(['check', WORKAREA])
    expect(envelopeOf(run).errors[0].message).toBe(
      `Can't find ${backlogPath()}.`
    )
  })

  test('names a missing backlog schema', async () => {
    writeBacklog([row()])
    rmSync(join(workspace, BACKLOG_SCHEMA_PATH))

    const run = await runTim(['check', WORKAREA])

    expect(envelopeOf(run).errors[0].message).toBe(
      `Can't find the backlog schema at ${join(workspace, BACKLOG_SCHEMA_PATH)}. tim checks every backlog against it.`
    )
  })
})

describe('tim backlog next', () => {
  test('prints the next buildable id', async () => {
    writeBacklog([
      row({ status: 'done' }),
      row({ id: 'inc-002', dependsOn: ['inc-001'] })
    ])
    const run = await runTim(['next', WORKAREA])
    expect(envelopeOf(run).result.next).toBe('inc-002')
  })

  test('returns null in JSON when nothing is buildable', async () => {
    writeBacklog([row({ status: 'done' })])

    const run = await runTim(['next', WORKAREA])

    expect(envelopeOf(run).result.next).toBeNull()
  })

  test('prints NONE in text when nothing is buildable', async () => {
    writeBacklog([row({ status: 'done' })])
    const run = await execa(
      'node',
      [cliPath, 'backlog', 'next', WORKAREA, '--workspace', workspace],
      { reject: false }
    )
    expect(run.stdout.trim()).toBe('NONE')
  })
})

describe('tim backlog set', () => {
  test('records a commit and a status, and writes the file', async () => {
    writeBacklog([row()])
    const run = await runTim([
      'set',
      WORKAREA,
      'inc-001',
      '--commit',
      'abc1234',
      '--status',
      'done'
    ])
    expect(run.exitCode).toBe(0)
    expect(readRows()).toEqual([row({ commit: 'abc1234', status: 'done' })])
  })

  test('adds a pull request, then marks it merged', async () => {
    writeBacklog([row()])
    const url = 'https://github.com/DEFRA/x/pull/9'
    await runTim([
      'set',
      WORKAREA,
      'inc-001',
      '--pr',
      JSON.stringify({ repo: 'frontend', url, number: 9 })
    ])
    await runTim([
      'set',
      WORKAREA,
      'inc-001',
      '--pr',
      JSON.stringify({ url, merged: true, sha: 'f00ba12' })
    ])
    expect(readRows()[0].prs).toEqual([
      { repo: 'frontend', url, number: 9, merged: true, sha: 'f00ba12' }
    ])
  })

  test('adds a note and an open question', async () => {
    writeBacklog([row()])
    await runTim([
      'set',
      WORKAREA,
      'inc-001',
      '--note',
      'ATTEMPT FAILED: ladder red',
      '--open-question',
      'Who may see drafts?'
    ])
    const [updated] = readRows()
    expect(updated.notes).toEqual(['ATTEMPT FAILED: ladder red'])
    expect(updated.openQuestions).toEqual(['Who may see drafts?'])
  })

  test('writes nothing when the values are already there', async () => {
    writeBacklog([row()])
    const before = readFileSync(backlogPath(), 'utf8')

    const run = await runTim(['set', WORKAREA, 'inc-001', '--status', 'todo'])

    expect(envelopeOf(run).result.changed).toEqual({})
    expect(readFileSync(backlogPath(), 'utf8')).toBe(before)
  })

  test('refuses an unknown status before writing', async () => {
    writeBacklog([row()])
    const run = await runTim([
      'set',
      WORKAREA,
      'inc-001',
      '--status',
      'finished'
    ])
    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      '--status must be one of: todo, blocked, done, deferred, dropped, rejected, merged-into.'
    )
    expect(readRows()).toEqual([row()])
  })

  test('refuses a pull request with no url', async () => {
    writeBacklog([row()])
    const run = await runTim([
      'set',
      WORKAREA,
      'inc-001',
      '--pr',
      '{"repo":"frontend"}'
    ])
    expect(envelopeOf(run).errors[0].message).toBe(
      '--pr must be a JSON object with a "url".'
    )
  })

  test('refuses a call that changes nothing', async () => {
    writeBacklog([row()])
    const run = await runTim(['set', WORKAREA, 'inc-001'])
    expect(envelopeOf(run).errors[0].message).toBe(
      'Give at least one of --status, --commit, --ticket, --branch, --note, --open-question or --pr.'
    )
  })

  test('names an id that is not in the backlog', async () => {
    writeBacklog([row()])
    const run = await runTim(['set', WORKAREA, 'inc-009', '--status', 'done'])
    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      "Can't find inc-009 in the backlog."
    )
  })
})
