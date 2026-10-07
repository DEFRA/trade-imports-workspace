import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { BACKLOG_SCHEMA_PATH } from '../../backlog/backlog-schema.js'
import { parseSplitOpts } from './split.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const realSchemaPath = join(here, '..', '..', '..', '..', BACKLOG_SCHEMA_PATH)
const fixturePath = join(
  here,
  '..',
  '..',
  'backlog',
  '__fixtures__',
  'themed',
  'backlog.json'
)

const WORKAREA = 'shared/hrp'
const THEMES = ['origin', 'commodity', 'documents']

let workspace

const pathOf = (workarea) =>
  join(workspace, 'workareas', workarea, 'backlog.json')

const indexPath = () =>
  join(workspace, 'workareas', WORKAREA, 'themes', 'themes.json')

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

const themeWorkarea = (theme) => `${WORKAREA}/themes/${theme}`

const runTim = (args) =>
  execa(
    'node',
    [cliPath, 'backlog', ...args, '--workspace', workspace, '--json'],
    { reject: false }
  )

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

const setRow = (workarea, id, fields) => {
  const backlog = readJson(pathOf(workarea))
  writeJson(pathOf(workarea), {
    ...backlog,
    increments: backlog.increments.map((row) =>
      row.id === id ? { ...row, ...fields } : row
    )
  })
}

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'tim-split-')))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
  const schemaCopy = join(workspace, BACKLOG_SCHEMA_PATH)
  mkdirSync(dirname(schemaCopy), { recursive: true })
  cpSync(realSchemaPath, schemaCopy)
  writeJson(pathOf(WORKAREA), readJson(fixturePath))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('tim backlog split', () => {
  test('a dry run says what it would write, and writes nothing', async () => {
    const run = await runTim(['split', WORKAREA])

    expect(run.exitCode).toBe(0)
    expect(envelopeOf(run).result.themes.map((theme) => theme.changed)).toEqual(
      [true, true, true]
    )
    expect(existsSync(join(workspace, 'workareas', WORKAREA, 'themes'))).toBe(
      false
    )
  })

  test('writes one backlog per theme, each of which passes tim backlog check', async () => {
    await runTim(['split', WORKAREA, '--write'])

    const checks = await Promise.all(
      THEMES.map((theme) => runTim(['check', themeWorkarea(theme)]))
    )

    expect(checks.map((check) => check.exitCode)).toEqual([0, 0, 0])
  })

  test('writes themes.json with the landing order in waves', async () => {
    await runTim(['split', WORKAREA, '--write'])

    expect(readJson(indexPath()).landingOrder).toEqual([
      { wave: 1, themes: ['origin', 'documents'] },
      { wave: 2, themes: ['commodity'] }
    ])
  })

  test('reports the cross-theme dependencies it turned into externalDependsOn', async () => {
    const run = await runTim(['split', WORKAREA, '--write'])

    expect(envelopeOf(run).result.crossThemeDependencies).toEqual([
      {
        from: {
          theme: 'commodity',
          id: 'inc-003',
          workarea: themeWorkarea('commodity')
        },
        to: {
          theme: 'origin',
          id: 'inc-002',
          workarea: themeWorkarea('origin')
        }
      },
      {
        from: {
          theme: 'documents',
          id: 'inc-005',
          workarea: themeWorkarea('documents')
        },
        to: { theme: null, id: 'inc-006', workarea: WORKAREA }
      }
    ])
  })

  test('names each branch after the programme and the theme, or the prefix given', async () => {
    const defaults = await runTim(['split', WORKAREA])
    const prefixed = await runTim([
      'split',
      WORKAREA,
      '--branch-prefix',
      'feat/EUDPA-123-plants'
    ])

    expect([
      envelopeOf(defaults).result.themes.map((theme) => theme.branch),
      envelopeOf(prefixed).result.themes.map((theme) => theme.branch)
    ]).toEqual([
      [
        'feat/NO_JIRA-hrp-origin-and-commodity-origin',
        'feat/NO_JIRA-hrp-origin-and-commodity-commodity',
        'feat/NO_JIRA-hrp-origin-and-commodity-documents'
      ],
      [
        'feat/EUDPA-123-plants-origin',
        'feat/EUDPA-123-plants-commodity',
        'feat/EUDPA-123-plants-documents'
      ]
    ])
  })

  test('changes nothing when run again', async () => {
    await runTim(['split', WORKAREA, '--write'])
    const before = THEMES.map((theme) =>
      readFileSync(pathOf(themeWorkarea(theme)), 'utf8')
    )

    const again = await runTim(['split', WORKAREA, '--write'])

    expect([
      envelopeOf(again).result.themes.map((theme) => theme.changed),
      envelopeOf(again).result.index.changed,
      THEMES.map((theme) => readFileSync(pathOf(themeWorkarea(theme)), 'utf8'))
    ]).toEqual([[false, false, false], false, before])
  })

  test('keeps a row the loop built when split again after a re-distil', async () => {
    await runTim(['split', WORKAREA, '--write'])
    setRow(themeWorkarea('origin'), 'inc-002', {
      status: 'done',
      commit: 'fed9876'
    })
    setRow(WORKAREA, 'inc-002', { title: 'Ask for the region, reworded' })

    await runTim(['split', WORKAREA, '--write'])

    expect(
      readJson(pathOf(themeWorkarea('origin'))).increments.find(
        (row) => row.id === 'inc-002'
      )
    ).toMatchObject({
      title: 'Ask for the region of origin',
      status: 'done',
      commit: 'fed9876'
    })
  })

  test('refuses, writing nothing, to move a built row to another theme', async () => {
    await runTim(['split', WORKAREA, '--write'])
    setRow(themeWorkarea('origin'), 'inc-002', { status: 'done' })
    setRow(WORKAREA, 'inc-002', { theme: 'commodity' })
    const before = readFileSync(pathOf(themeWorkarea('commodity')), 'utf8')

    const run = await runTim(['split', WORKAREA, '--write'])

    expect([
      run.exitCode,
      envelopeOf(run).errors[0].message,
      readFileSync(pathOf(themeWorkarea('commodity')), 'utf8')
    ]).toEqual([
      1,
      '1 problems with the split already on disk, so nothing was split:\ninc-002 is done in shared/hrp/themes/origin, but the backlog now puts it in theme "commodity". A row built or set aside keeps its theme: put it back in theme "origin".',
      before
    ])
  })

  test('refuses a backlog out of shape, naming its problems', async () => {
    setRow(WORKAREA, 'inc-005', { repos: ['backend', 'tests', 'frontend'] })

    const run = await runTim(['split', WORKAREA, '--write'])

    expect([run.exitCode, envelopeOf(run).errors[0].message]).toEqual([
      1,
      `1 problems in ${pathOf(WORKAREA)}, so nothing was split:\ninc-005 builds in backend, which theme "documents" does not touch. Add a backend path to the theme's "touches", or move the row.`
    ])
  })

  test('refuses a backlog whose externalDependsOn names a row that is not there', async () => {
    setRow(WORKAREA, 'inc-001', {
      externalDependsOn: [{ workarea: 'shared/elsewhere', id: 'inc-100' }]
    })
    writeJson(pathOf('shared/elsewhere'), { increments: [] })

    const run = await runTim(['split', WORKAREA, '--write'])

    expect(envelopeOf(run).errors[0].message).toBe(
      `1 problems in ${pathOf(WORKAREA)}, so nothing was split:\ninc-001 depends on inc-100 in shared/elsewhere, which is not in that backlog.`
    )
  })

  test('refuses a backlog with no themes', async () => {
    const { themes, ...unthemed } = readJson(fixturePath)
    writeJson(pathOf(WORKAREA), {
      ...unthemed,
      increments: unthemed.increments.map(({ theme, ...row }) => row)
    })

    const run = await runTim(['split', WORKAREA])

    expect([run.exitCode, envelopeOf(run).errors[0].message]).toEqual([
      2,
      'The backlog in shared/hrp has no "themes", so there is nothing to split. Give its sources.json a "themes" rule and distil again.'
    ])
  })

  test('refuses to split a split backlog', async () => {
    await runTim(['split', WORKAREA, '--write'])

    const run = await runTim(['split', themeWorkarea('origin')])

    expect(envelopeOf(run).errors[0].message).toBe(
      'shared/hrp/themes/origin is theme "origin"\'s split. Split its parent, shared/hrp, instead.'
    )
  })
})

describe('tim backlog next over split backlogs', () => {
  test('waits for the row another theme must land first', async () => {
    await runTim(['split', WORKAREA, '--write'])

    const before = await runTim(['next', themeWorkarea('commodity')])
    setRow(themeWorkarea('origin'), 'inc-002', { status: 'done' })
    const after = await runTim(['next', themeWorkarea('commodity')])

    expect([
      envelopeOf(before).result.next,
      envelopeOf(after).result.next
    ]).toEqual([null, 'inc-003'])
  })

  test('builds a row whose dependency in no theme is done in the parent', async () => {
    await runTim(['split', WORKAREA, '--write'])

    const run = await runTim(['next', themeWorkarea('documents')])

    expect(envelopeOf(run).result.next).toBe('inc-005')
  })
})

describe('parseSplitOpts', () => {
  test('is a dry run unless told to write', () => {
    expect(parseSplitOpts({})).toEqual({ write: false })
  })

  test('refuses a branch prefix with a space', () => {
    expect(() => parseSplitOpts({ branchPrefix: 'feat/my plants' })).toThrow(
      '--branch-prefix must be a branch name with no spaces, such as feat/EUDPA-123-plants.'
    )
  })
})
