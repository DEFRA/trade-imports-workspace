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
          reason: 'one service repo, frontend'
        },
        {
          id: 'inc-002',
          title: 'Show the notification list',
          rigour: 'fast',
          source: 'derived',
          reason: 'a docs row changes no production behaviour'
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

    expect(envelopeOf(run).errors[0].message).toBe(
      `Can't find ${backlogPath()}.`
    )
  })

  test('prints a line a row, lined up, without --json', async () => {
    writeBacklog([row(), row({ id: 'inc-002', kind: 'docs' })])

    const run = await runTim(['rigour', WORKAREA])

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toBe(
      [
        'inc-001  standard  one service repo, frontend',
        'inc-002  fast      a docs row changes no production behaviour'
      ].join('\n')
    )
  })
})

describe('renderRigourText', () => {
  test('lines up the id, the preset and the reason', () => {
    expect(
      renderRigourText({
        path: '/ws/workareas/shared/demo/backlog.json',
        rows: [
          {
            id: 'inc-001',
            title: 'A',
            rigour: 'standard',
            source: 'derived',
            reason: 'one service repo, frontend'
          },
          {
            id: 'inc-002',
            title: 'B',
            rigour: 'fast',
            source: 'row',
            reason: 'set on the row'
          }
        ]
      })
    ).toBe(
      'inc-001  standard  one service repo, frontend\ninc-002  fast      set on the row'
    )
  })

  test('says so when nothing is left to build', () => {
    expect(renderRigourText({ path: '/ws/b.json', rows: [] })).toBe(
      'Every increment is built out: there is nothing to propose a rigour for.'
    )
  })
})
