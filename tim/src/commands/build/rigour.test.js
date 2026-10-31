import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  realpathSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { BACKLOG_SCHEMA_PATH } from '../../backlog/backlog-schema.js'
import { renderRigourText } from './rigour.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const realSchemaPath = join(here, '..', '..', '..', '..', BACKLOG_SCHEMA_PATH)
const WORKAREA = 'shared/demo'

let workspace

const backlogPath = () => join(workspace, 'workareas', WORKAREA, 'backlog.json')

const writeBacklog = (increments) => {
  mkdirSync(dirname(backlogPath()), { recursive: true })
  writeFileSync(
    backlogPath(),
    JSON.stringify({
      programme: 'demo',
      repos: {
        frontend: { path: 'repos/trade-imports-animals-frontend' },
        tests: { path: 'repos/trade-imports-ins-tests' }
      },
      increments
    })
  )
}

const runTim = (args) =>
  execa('node', [cliPath, 'build', ...args, '--workspace', workspace], {
    reject: false
  })

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

const row = (overrides = {}) => ({
  id: 'inc-001',
  title: 'Show the notification list',
  detail: 'An importer sees their own notifications.',
  acceptanceCriteria: ['The list shows only their own.'],
  dependsOn: [],
  kind: 'feat',
  repos: ['frontend', 'tests'],
  status: 'todo',
  ...overrides
})

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'tim-build-rigour-')))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
  const schemaCopy = join(workspace, BACKLOG_SCHEMA_PATH)
  mkdirSync(dirname(schemaCopy), { recursive: true })
  cpSync(realSchemaPath, schemaCopy)
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim build rigour', () => {
  test('proposes a preset per todo row, with the reason it keyed on', async () => {
    writeBacklog([row(), row({ id: 'inc-002', kind: 'docs' })])

    const run = await runTim(['rigour', WORKAREA, '--json'])

    expect(run.exitCode).toBe(0)
    expect(envelopeOf(run).result).toEqual({
      path: backlogPath(),
      rows: [
        {
          id: 'inc-001',
          title: 'Show the notification list',
          rigour: 'standard',
          source: 'derived',
          reason: 'one service repo, frontend: nothing crosses a repo boundary'
        },
        {
          id: 'inc-002',
          title: 'Show the notification list',
          rigour: 'fast',
          source: 'derived',
          reason: 'a docs row: no production behaviour to read'
        }
      ]
    })
  })

  test('refuses a row whose rigour is not a preset the schema allows', async () => {
    writeBacklog([row({ rigour: 'quick' })])

    const run = await runTim(['rigour', WORKAREA, '--json'])

    expect(run.exitCode).toBe(1)
    expect(envelopeOf(run).errors[0]).toEqual({
      code: 'LINT',
      message: 'inc-001 sets rigour "quick". Use one of: full, standard, fast.'
    })
  })

  test('names a missing backlog', async () => {
    const run = await runTim(['rigour', WORKAREA, '--json'])

    expect(run.exitCode).toBe(2)
    expect(envelopeOf(run).errors[0].message).toBe(
      `Can't find ${backlogPath()}.`
    )
  })

  test('reports only the row that set a preset, never a derived one', async () => {
    writeBacklog([row(), row({ id: 'inc-002', rigour: 'quick' })])

    const run = await runTim(['rigour', WORKAREA, '--json'])

    expect(envelopeOf(run).errors[0].message).toBe(
      'inc-002 sets rigour "quick". Use one of: full, standard, fast.'
    )
  })

  test('names the backlog it read, then each row and its reason', async () => {
    writeBacklog([row(), row({ id: 'inc-002', kind: 'docs' })])

    const run = await runTim(['rigour', WORKAREA])

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toBe(
      [
        `2 rows still to build in ${backlogPath()}:`,
        'inc-001  standard  Show the notification list',
        '                   one service repo, frontend: nothing crosses a repo boundary',
        'inc-002  fast      Show the notification list',
        '                   a docs row: no production behaviour to read'
      ].join('\n')
    )
  })
})

describe('renderRigourText', () => {
  const PATH = '/ws/workareas/shared/demo/backlog.json'

  const rendered = (...rows) => renderRigourText({ path: PATH, rows })

  const proposal = (overrides = {}) => ({
    id: 'inc-001',
    title: 'Show the notification list',
    rigour: 'standard',
    source: 'derived',
    reason: 'one service repo, frontend: nothing crosses a repo boundary',
    ...overrides
  })

  test('names the backlog, then each title with its reason beneath', () => {
    expect(
      rendered(
        proposal(),
        proposal({
          id: 'inc-002',
          title: 'Say which files were scanned',
          rigour: 'fast',
          source: 'row',
          reason: 'set on the row'
        })
      )
    ).toBe(
      [
        `2 rows still to build in ${PATH}:`,
        'inc-001  standard  Show the notification list',
        '                   one service repo, frontend: nothing crosses a repo boundary',
        'inc-002  fast      Say which files were scanned',
        '                   set on the row'
      ].join('\n')
    )
  })

  test('counts a single row in the singular', () => {
    expect(rendered(proposal()).split('\n')[0]).toBe(
      `1 row still to build in ${PATH}:`
    )
  })

  test('clips a long title so every row line fits 80 columns', () => {
    const [, ...rowLines] = rendered(
      proposal({
        title:
          'Document references accept punctuation, and the document type list drops Health certificate'
      })
    ).split('\n')

    expect(rowLines[0]).toBe(
      'inc-001  standard  Document references accept punctuation, and the documen…'
    )
    expect(rowLines.every((line) => line.length <= 80)).toBe(true)
  })

  test('names the backlog it found nothing left to build in', () => {
    expect(renderRigourText({ path: PATH, rows: [] })).toBe(
      `Every increment in ${PATH} is built out: there is nothing to propose a rigour for.`
    )
  })
})
