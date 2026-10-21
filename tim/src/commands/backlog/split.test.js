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

describe('tim backlog split --theme', () => {
  const requirementsPath = () =>
    join(workspace, 'workareas', WORKAREA, 'distil', 'requirements.json')

  test('a dry run says what would move, and writes nothing', async () => {
    const before = readFileSync(pathOf(WORKAREA), 'utf8')

    const run = await runTim(['split', WORKAREA, '--theme', 'origin'])

    expect([
      run.exitCode,
      envelopeOf(run).result.splitOff.map((theme) => [
        theme.theme,
        theme.increments,
        theme.changed
      ]),
      readFileSync(pathOf(WORKAREA), 'utf8'),
      existsSync(pathOf(themeWorkarea('origin')))
    ]).toEqual([0, [['origin', ['inc-001', 'inc-002'], true]], before, false])
  })

  test('moves the theme and its rows out of the main backlog, leaving a pointer', async () => {
    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])

    const main = readJson(pathOf(WORKAREA))
    expect([
      main.themes.map((theme) => theme.id),
      main.increments.map((row) => row.id),
      main.splitOff.map(({ at, ...pointer }) => pointer)
    ]).toEqual([
      ['commodity', 'documents'],
      ['inc-003', 'inc-004', 'inc-005', 'inc-006'],
      [
        {
          theme: 'origin',
          title: 'Country of origin',
          why: readJson(fixturePath).themes[0].why,
          touches: readJson(fixturePath).themes[0].touches,
          dependsOn: [],
          branch: 'feat/NO_JIRA-hrp-origin-and-commodity-origin',
          workarea: themeWorkarea('origin'),
          backlog: 'themes/origin/backlog.json',
          increments: ['inc-001', 'inc-002'],
          requirements: ['req-001', 'req-002', 'req-003']
        }
      ]
    ])
  })

  test('stamps the pointer with when the theme was split off', async () => {
    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])

    expect(readJson(pathOf(WORKAREA)).splitOff[0].at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
  })

  test('leaves a main backlog and a split backlog that both pass tim backlog check', async () => {
    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])

    const checks = await Promise.all([
      runTim(['check', WORKAREA]),
      runTim(['check', themeWorkarea('origin')])
    ])

    expect(checks.map((check) => check.exitCode)).toEqual([0, 0])
  })

  test('names, in plain words, the rows left behind that now wait on the split backlog', async () => {
    const run = execa(
      'node',
      [
        cliPath,
        'backlog',
        'split',
        WORKAREA,
        '--theme',
        'origin',
        '--workspace',
        workspace,
        '--no-ui'
      ],
      { reject: false }
    )

    expect((await run).stdout).toContain(
      'Rows left in the main backlog that now wait for a row in a split backlog:\n  inc-003 waits for inc-002 in shared/hrp/themes/origin'
    )
  })

  test('names the moved rows that wait on a row still in the main backlog', async () => {
    const run = await runTim(['split', WORKAREA, '--theme', 'documents'])

    expect(envelopeOf(run).result.rewired).toEqual({
      left: [],
      moved: [{ id: 'inc-005', dependsOn: 'inc-006', workarea: WORKAREA }],
      relinked: []
    })
  })

  test('keeps each requirement fingerprint when the workarea has requirements', async () => {
    writeJson(requirementsPath(), {
      requirements: [
        {
          id: 'req-001',
          statement: 'An importer gives the country of origin.',
          why: 'The rules depend on it.',
          claims: ['confluence-6518997274-001'],
          status: 'adopted',
          delta: 'new'
        }
      ]
    })

    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])

    expect(
      Object.keys(readJson(pathOf(WORKAREA)).splitOff[0].fingerprints)
    ).toEqual(['req-001'])
  })

  test('merges the theme into themes.json, keeping every other entry', async () => {
    await runTim(['split', WORKAREA, '--write'])

    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])

    expect(
      readJson(indexPath()).themes.map((theme) => [theme.id, theme.splitOff])
    ).toEqual([
      ['commodity', undefined],
      ['documents', undefined],
      ['origin', true]
    ])
  })

  test('refuses, writing nothing, a theme already split off', async () => {
    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])
    const before = readFileSync(pathOf(WORKAREA), 'utf8')

    const run = await runTim([
      'split',
      WORKAREA,
      '--theme',
      'origin',
      '--write'
    ])

    expect([
      run.exitCode,
      envelopeOf(run).errors[0].message,
      readFileSync(pathOf(WORKAREA), 'utf8')
    ]).toEqual([
      2,
      'Theme "origin" is already split off, to feat/NO_JIRA-hrp-origin-and-commodity-origin. Its rows live in shared/hrp/themes/origin: build it there.',
      before
    ])
  })

  test('the full split later leaves the theme split off untouched', async () => {
    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])
    setRow(themeWorkarea('origin'), 'inc-002', { status: 'done' })
    const before = readFileSync(pathOf(themeWorkarea('origin')), 'utf8')

    const run = await runTim(['split', WORKAREA, '--write'])

    expect([
      run.exitCode,
      envelopeOf(run).result.themes.map((theme) => theme.id),
      envelopeOf(run).result.splitOff.map((theme) => theme.id),
      readFileSync(pathOf(themeWorkarea('origin')), 'utf8')
    ]).toEqual([0, ['commodity', 'documents'], ['origin'], before])
  })

  test('the main backlog waits for the moved row to be done in the split backlog', async () => {
    await runTim(['split', WORKAREA, '--theme', 'origin', '--write'])
    setRow(WORKAREA, 'inc-005', { status: 'deferred' })

    const before = await runTim(['next', WORKAREA])
    setRow(themeWorkarea('origin'), 'inc-002', { status: 'done' })
    const after = await runTim(['next', WORKAREA])

    expect([
      envelopeOf(before).result.next,
      envelopeOf(after).result.next
    ]).toEqual([null, 'inc-003'])
  })

  test("a theme split off waits for a row its main backlog still holds, in that row's own theme split once there is one", async () => {
    await runTim(['split', WORKAREA, '--theme', 'commodity', '--write'])
    const waiting = await runTim(['next', themeWorkarea('commodity')])
    await runTim(['split', WORKAREA, '--write'])
    setRow(themeWorkarea('origin'), 'inc-002', { status: 'done' })

    const ready = await runTim(['next', themeWorkarea('commodity')])

    expect([
      envelopeOf(waiting).result.next,
      envelopeOf(ready).result.next
    ]).toEqual([null, 'inc-003'])
  })

  test('refuses a theme the backlog does not have', async () => {
    const run = await runTim(['split', WORKAREA, '--theme', 'payments'])

    expect([run.exitCode, envelopeOf(run).errors[0].message]).toEqual([
      2,
      'The backlog has no theme "payments". Its themes are origin, commodity, documents.'
    ])
  })
})

describe('parseSplitOpts', () => {
  test('takes --theme more than once, each once', () => {
    expect(
      parseSplitOpts({ theme: ['origin', 'documents', 'origin'] }).theme
    ).toEqual(['origin', 'documents'])
  })

  test('refuses a theme that is not a theme id', () => {
    expect(() => parseSplitOpts({ theme: ['Origin Pages'] })).toThrow(
      '--theme must be a theme id: lower-case words joined by hyphens, such as origin-pages.'
    )
  })

  test('is a dry run unless told to write', () => {
    expect(parseSplitOpts({})).toEqual({
      write: false,
      relink: false,
      theme: [],
      rows: []
    })
  })

  test('takes --rows separated by commas or given more than once, each once', () => {
    expect(
      parseSplitOpts({
        rows: ['inc-003,inc-004', 'inc-003'],
        to: 'commodity-b'
      }).rows
    ).toEqual(['inc-003', 'inc-004'])
  })

  test('refuses --rows without --to', () => {
    expect(() => parseSplitOpts({ rows: ['inc-003'] })).toThrow(
      'Give --rows and --to together: the rows to move, and the theme id of the backlog they move to. To move rows back, give --rows and --back-from.'
    )
  })

  test('refuses --rows with --theme', () => {
    expect(() =>
      parseSplitOpts({
        rows: ['inc-003'],
        to: 'commodity-b',
        theme: ['origin']
      })
    ).toThrow(
      'Give --rows and --to without --theme, --relink or --branch-prefix. Name the new branch with --branch.'
    )
  })

  test('refuses --branch without --rows', () => {
    expect(() => parseSplitOpts({ branch: 'feat/x-b' })).toThrow(
      '--branch and --title go with --rows and --to. To name theme branches, give --branch-prefix.'
    )
  })

  test('refuses --relink with --theme', () => {
    expect(() => parseSplitOpts({ relink: true, theme: ['origin'] })).toThrow(
      'Give --relink on its own. Splitting a theme off with --theme already relinks the themes split off before it.'
    )
  })

  test('refuses a branch prefix with a space', () => {
    expect(() => parseSplitOpts({ branchPrefix: 'feat/my plants' })).toThrow(
      '--branch-prefix must be a branch name with no spaces, such as feat/EUDPA-123-plants.'
    )
  })

  test('refuses --back-from without --rows', () => {
    expect(() => parseSplitOpts({ backFrom: 'commodity-b' })).toThrow(
      'Give --rows with --back-from: the rows to move back from that theme.'
    )
  })

  test('refuses --back-from with --to or --branch', () => {
    expect(() =>
      parseSplitOpts({
        rows: ['inc-003'],
        backFrom: 'commodity-b',
        to: 'commodity-c',
        branch: 'feat/x-c'
      })
    ).toThrow(
      'Give --rows and --back-from without --to or --branch. The rows go back to the backlog you name, on its own branch.'
    )
  })
})

describe('tim backlog split, a second early split', () => {
  const waitsOfCommodityRow = () =>
    readJson(pathOf(themeWorkarea('commodity'))).increments.find(
      (row) => row.id === 'inc-003'
    ).externalDependsOn

  const splitCommodityThenOrigin = async () => {
    await runTim(['split', WORKAREA, '--theme', 'commodity', '--write'])
    const commodityBefore = readJson(pathOf(themeWorkarea('commodity')))
    const run = await runTim([
      'split',
      WORKAREA,
      '--theme',
      'origin',
      '--write'
    ])
    return { commodityBefore, run }
  }

  test('points the theme split off first at the row the second one moved', async () => {
    const { run } = await splitCommodityThenOrigin()

    expect([
      envelopeOf(run).result.rewired.relinked,
      waitsOfCommodityRow()
    ]).toEqual([
      [
        {
          id: 'inc-003',
          dependsOn: 'inc-002',
          workarea: themeWorkarea('origin')
        }
      ],
      [{ workarea: themeWorkarea('origin'), id: 'inc-002' }]
    ])
  })

  test('flags a wait an earlier split left on the main backlog', async () => {
    const { commodityBefore } = await splitCommodityThenOrigin()
    writeJson(pathOf(themeWorkarea('commodity')), commodityBefore)

    const run = await runTim(['check', WORKAREA])

    expect(run.stdout).toContain(
      'In shared/hrp/themes/commodity, split off early: inc-003 depends on inc-002 in shared/hrp, which is not in that backlog.'
    )
  })

  test('--relink repairs that wait, and writes only with --write', async () => {
    const { commodityBefore } = await splitCommodityThenOrigin()
    writeJson(pathOf(themeWorkarea('commodity')), commodityBefore)

    const dryRun = await runTim(['split', WORKAREA, '--relink'])
    const waitsAfterDryRun = waitsOfCommodityRow()
    await runTim(['split', WORKAREA, '--relink', '--write'])

    expect([
      envelopeOf(dryRun).result.relinked.map(({ workarea, rows }) => [
        workarea,
        rows
      ]),
      waitsAfterDryRun,
      waitsOfCommodityRow()
    ]).toEqual([
      [
        [
          themeWorkarea('commodity'),
          [
            {
              id: 'inc-003',
              dependsOn: 'inc-002',
              workarea: themeWorkarea('origin')
            }
          ]
        ]
      ],
      [{ workarea: WORKAREA, id: 'inc-002' }],
      [{ workarea: themeWorkarea('origin'), id: 'inc-002' }]
    ])
  })
})

describe('tim backlog split --rows --to', () => {
  const COMMODITY = themeWorkarea('commodity')
  const COMMODITY_B = themeWorkarea('commodity-b')
  const ORIGIN_B = themeWorkarea('origin-b')

  const splitIntoThemes = () => runTim(['split', WORKAREA, '--write'])

  const moveRows = (workarea, rows, to, ...extra) =>
    runTim(['split', workarea, '--rows', rows, '--to', to, ...extra])

  const rowIn = (workarea, id) =>
    readJson(pathOf(workarea)).increments.find((row) => row.id === id)

  test('a dry run says what would move, and writes nothing', async () => {
    await splitIntoThemes()
    const before = readFileSync(pathOf(COMMODITY), 'utf8')

    const run = await moveRows(COMMODITY, 'inc-003', 'commodity-b')

    expect([
      run.exitCode,
      envelopeOf(run).result.movedTo.rows,
      existsSync(pathOf(COMMODITY_B)),
      readFileSync(pathOf(COMMODITY), 'utf8')
    ]).toEqual([0, ['inc-003'], false, before])
  })

  test('moves the rows into a new theme backlog on its own branch, leaving a pointer', async () => {
    await splitIntoThemes()

    await moveRows(COMMODITY, 'inc-003', 'commodity-b', '--write')
    const source = readJson(pathOf(COMMODITY))
    const moved = readJson(pathOf(COMMODITY_B))

    expect({
      left: source.increments.map((row) => row.id),
      movedOut: source.movedOut.map(({ at, ...pointer }) => pointer),
      envelope: {
        programme: moved.programme,
        theme: moved.theme,
        branch: moved.branch,
        parent: moved.parent
      },
      rows: moved.increments.map((row) => [row.id, row.theme])
    }).toEqual({
      left: ['inc-004'],
      movedOut: [
        {
          theme: 'commodity-b',
          branch: 'feat/NO_JIRA-hrp-origin-and-commodity-commodity-b',
          workarea: COMMODITY_B,
          backlog: '../commodity-b/backlog.json',
          increments: ['inc-003'],
          requirements: ['req-005']
        }
      ],
      envelope: {
        programme: 'hrp-origin-and-commodity-commodity-b',
        theme: 'commodity-b',
        branch: 'feat/NO_JIRA-hrp-origin-and-commodity-commodity-b',
        parent: { workarea: WORKAREA, wave: 2, landsAfter: ['origin'] }
      },
      rows: [['inc-003', 'commodity-b']]
    })
  })

  test('names the new branch as given', async () => {
    await splitIntoThemes()

    await moveRows(
      COMMODITY,
      'inc-003',
      'commodity-b',
      '--branch',
      'feat/EUDPA-9-commodity-b',
      '--write'
    )

    expect(readJson(pathOf(COMMODITY_B)).branch).toBe(
      'feat/EUDPA-9-commodity-b'
    )
  })

  test('leaves the old, the new and the main backlog each passing tim backlog check', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b', '--write')

    const checks = await Promise.all(
      [COMMODITY, COMMODITY_B, WORKAREA].map((workarea) =>
        runTim(['check', workarea])
      )
    )

    expect(checks.map((check) => check.exitCode)).toEqual([0, 0, 0])
  })

  test('a row left behind waits for the moved row to be done in the new backlog', async () => {
    await splitIntoThemes()
    setRow(themeWorkarea('origin'), 'inc-002', { status: 'done' })
    await moveRows(COMMODITY, 'inc-003', 'commodity-b', '--write')

    const nextLeft = await runTim(['next', COMMODITY])
    const nextMoved = await runTim(['next', COMMODITY_B])

    expect([
      rowIn(COMMODITY, 'inc-004').externalDependsOn,
      envelopeOf(nextLeft).result.next,
      envelopeOf(nextMoved).result.next
    ]).toEqual([[{ workarea: COMMODITY_B, id: 'inc-003' }], null, 'inc-003'])
  })

  test('a moved row stops waiting for a done row left behind, and keeps waiting for one not done', async () => {
    await splitIntoThemes()

    const doneLeftBehind = await moveRows(
      themeWorkarea('origin'),
      'inc-002',
      'origin-b',
      '--write'
    )
    const notDoneLeftBehind = await moveRows(
      COMMODITY,
      'inc-004',
      'commodity-b',
      '--write'
    )

    expect([
      envelopeOf(doneLeftBehind).result.moveRewired.dropped,
      rowIn(ORIGIN_B, 'inc-002').dependsOn,
      envelopeOf(notDoneLeftBehind).result.moveRewired.moved,
      rowIn(COMMODITY_B, 'inc-004').externalDependsOn
    ]).toEqual([
      [{ id: 'inc-002', dependsOn: 'inc-001' }],
      [],
      [{ id: 'inc-004', dependsOn: 'inc-003', workarea: COMMODITY }],
      [{ workarea: COMMODITY, id: 'inc-003' }]
    ])
  })

  test('points every other backlog that waits for a moved row at its new workarea', async () => {
    await splitIntoThemes()

    const run = await moveRows(
      themeWorkarea('origin'),
      'inc-002',
      'origin-b',
      '--write'
    )

    expect([
      envelopeOf(run).result.moveRewired.relinked,
      rowIn(COMMODITY, 'inc-003').externalDependsOn
    ]).toEqual([
      [{ id: 'inc-003', dependsOn: 'inc-002', workarea: ORIGIN_B }],
      [{ workarea: ORIGIN_B, id: 'inc-002' }]
    ])
  })

  test('adds the new theme to themes.json in the old theme wave', async () => {
    await splitIntoThemes()

    await moveRows(COMMODITY, 'inc-003', 'commodity-b', '--write')
    const index = readJson(indexPath())

    expect([
      index.landingOrder,
      index.themes.map(({ id, rows, movedFrom }) => ({ id, rows, movedFrom }))
    ]).toEqual([
      [
        { wave: 1, themes: ['origin', 'documents'] },
        { wave: 2, themes: ['commodity', 'commodity-b'] }
      ],
      [
        { id: 'origin', rows: 2, movedFrom: undefined },
        { id: 'commodity', rows: 1, movedFrom: undefined },
        { id: 'documents', rows: 1, movedFrom: undefined },
        { id: 'commodity-b', rows: 1, movedFrom: 'commodity' }
      ]
    ])
  })

  test('refuses, writing nothing, a row that is already built', async () => {
    await splitIntoThemes()
    const before = readFileSync(pathOf(themeWorkarea('origin')), 'utf8')

    const run = await moveRows(
      themeWorkarea('origin'),
      'inc-001',
      'origin-b',
      '--write'
    )

    expect([
      run.exitCode,
      envelopeOf(run).errors[0].message,
      readFileSync(pathOf(themeWorkarea('origin')), 'utf8')
    ]).toEqual([
      2,
      'inc-001 is done. Only a todo or blocked row moves: a row built or set aside stays where it was built.',
      before
    ])
  })

  test('refuses a backlog that is not a theme split', async () => {
    const run = await moveRows(WORKAREA, 'inc-003', 'commodity-b', '--write')

    expect([run.exitCode, envelopeOf(run).errors[0].message]).toEqual([
      2,
      "--rows moves rows out of a theme's split backlog, and shared/hrp is not one. To split a whole theme off a themed backlog, give --theme."
    ])
  })

  test('tim backlog check flags a row that reuses the id of a moved row', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b', '--write')
    const source = readJson(pathOf(COMMODITY))
    writeJson(pathOf(COMMODITY), {
      ...source,
      increments: [
        ...source.increments,
        { ...rowIn(COMMODITY_B, 'inc-003'), theme: 'commodity' }
      ]
    })

    const run = await runTim(['check', COMMODITY])

    expect(run.stdout).toContain(
      `inc-003 moved to ${COMMODITY_B}, to build on feat/NO_JIRA-hrp-origin-and-commodity-commodity-b. Give this row a new id, or build it there.`
    )
  })
})

describe('tim backlog split --rows --back-from', () => {
  const COMMODITY = themeWorkarea('commodity')
  const COMMODITY_B = themeWorkarea('commodity-b')
  const ORIGIN = themeWorkarea('origin')
  const ORIGIN_B = themeWorkarea('origin-b')

  const splitIntoThemes = () => runTim(['split', WORKAREA, '--write'])

  const moveRows = (workarea, rows, to) =>
    runTim(['split', workarea, '--rows', rows, '--to', to, '--write'])

  const moveBack = (workarea, rows, from, ...extra) =>
    runTim(['split', workarea, '--rows', rows, '--back-from', from, ...extra])

  const rowIn = (workarea, id) =>
    readJson(pathOf(workarea)).increments.find((row) => row.id === id)

  test('a dry run says what would move back, and writes nothing', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003,inc-004', 'commodity-b')
    const before = readFileSync(pathOf(COMMODITY), 'utf8')

    const run = await moveBack(COMMODITY, 'inc-003,inc-004', 'commodity-b')

    expect([
      run.exitCode,
      envelopeOf(run).result.movedBackFrom.rows,
      readFileSync(pathOf(COMMODITY), 'utf8')
    ]).toEqual([0, ['inc-003', 'inc-004'], before])
  })

  test('moving every row back leaves the backlog as it was before they moved', async () => {
    await splitIntoThemes()
    const beforeMove = readFileSync(pathOf(COMMODITY), 'utf8')
    await moveRows(COMMODITY, 'inc-003,inc-004', 'commodity-b')

    await moveBack(COMMODITY, 'inc-003,inc-004', 'commodity-b', '--write')

    expect(readFileSync(pathOf(COMMODITY), 'utf8')).toBe(beforeMove)
  })

  test('a row left behind waits for the returning row in its own backlog again', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b')

    const run = await moveBack(COMMODITY, 'inc-003', 'commodity-b', '--write')

    expect([
      envelopeOf(run).result.backRewired.home,
      readJson(pathOf(COMMODITY)).increments.map(
        ({ id, dependsOn, externalDependsOn }) => ({
          id,
          dependsOn,
          externalDependsOn
        })
      )
    ]).toEqual([
      [{ id: 'inc-004', dependsOn: 'inc-003', workarea: COMMODITY }],
      [
        {
          id: 'inc-003',
          dependsOn: [],
          externalDependsOn: [{ workarea: ORIGIN, id: 'inc-002' }]
        },
        { id: 'inc-004', dependsOn: ['inc-003'], externalDependsOn: undefined }
      ]
    ])
  })

  test('empties the theme they leave, with a pointer to where they went', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b')

    await moveBack(COMMODITY, 'inc-003', 'commodity-b', '--write')
    const left = readJson(pathOf(COMMODITY_B))

    expect([
      left.increments,
      left.movedBack.map(({ at, ...pointer }) => pointer),
      readJson(pathOf(COMMODITY)).movedOut
    ]).toEqual([
      [],
      [
        {
          theme: 'commodity',
          workarea: COMMODITY,
          backlog: '../commodity/backlog.json',
          increments: ['inc-003']
        }
      ],
      undefined
    ])
  })

  test('takes the emptied theme out of the landing order in themes.json', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b')

    await moveBack(COMMODITY, 'inc-003', 'commodity-b', '--write')
    const index = readJson(indexPath())

    expect([
      index.landingOrder,
      index.themes.map(({ id, rows, movedBackTo }) => ({
        id,
        rows,
        movedBackTo
      }))
    ]).toEqual([
      [
        { wave: 1, themes: ['origin', 'documents'] },
        { wave: 2, themes: ['commodity'] }
      ],
      [
        { id: 'origin', rows: 2, movedBackTo: undefined },
        { id: 'commodity', rows: 2, movedBackTo: undefined },
        { id: 'documents', rows: 1, movedBackTo: undefined },
        { id: 'commodity-b', rows: 0, movedBackTo: 'commodity' }
      ]
    ])
  })

  test('leaves every backlog passing tim backlog check, with nothing to build in the emptied theme', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b')
    await moveBack(COMMODITY, 'inc-003', 'commodity-b', '--write')

    const checks = await Promise.all(
      [COMMODITY, COMMODITY_B, WORKAREA].map((workarea) =>
        runTim(['check', workarea])
      )
    )
    const next = await runTim(['next', COMMODITY_B])

    expect([
      checks.map((check) => check.exitCode),
      envelopeOf(next).result.next
    ]).toEqual([[0, 0, 0], null])
  })

  test('moving some rows back keeps the rest in the pointer and in the theme they moved to', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003,inc-004', 'commodity-b')

    await moveBack(COMMODITY, 'inc-003', 'commodity-b', '--write')

    expect([
      readJson(pathOf(COMMODITY)).movedOut.map(
        ({ increments, requirements }) => ({ increments, requirements })
      ),
      rowIn(COMMODITY_B, 'inc-004').externalDependsOn,
      envelopeOf(await runTim(['check', COMMODITY_B])).ok
    ]).toEqual([
      [{ increments: ['inc-004'], requirements: ['req-006'] }],
      [{ workarea: COMMODITY, id: 'inc-003' }],
      true
    ])
  })

  test('points every other backlog that waits for a returning row back at its home', async () => {
    await splitIntoThemes()
    await moveRows(ORIGIN, 'inc-002', 'origin-b')

    const run = await moveBack(ORIGIN, 'inc-002', 'origin-b', '--write')

    expect([
      envelopeOf(run).result.backRewired.relinked,
      rowIn(COMMODITY, 'inc-003').externalDependsOn
    ]).toEqual([
      [{ id: 'inc-003', dependsOn: 'inc-002', workarea: ORIGIN }],
      [{ workarea: ORIGIN, id: 'inc-002' }]
    ])
  })

  test('refuses a theme this backlog moved no rows to', async () => {
    await splitIntoThemes()

    const run = await moveBack(COMMODITY, 'inc-003', 'commodity-b', '--write')

    expect([run.exitCode, envelopeOf(run).errors[0].message]).toEqual([
      2,
      'This backlog moved no rows to theme "commodity-b", so there are none to move back. Its "movedOut" names no theme.'
    ])
  })

  test('refuses a row that did not move to that theme', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b')

    const run = await moveBack(COMMODITY, 'inc-004', 'commodity-b', '--write')

    expect([run.exitCode, envelopeOf(run).errors[0].message]).toEqual([
      2,
      'inc-004 did not move to theme "commodity-b", so nothing was moved back.'
    ])
  })

  test('refuses, writing nothing, a row already built where it moved to', async () => {
    await splitIntoThemes()
    await moveRows(COMMODITY, 'inc-003', 'commodity-b')
    setRow(COMMODITY_B, 'inc-003', { status: 'done' })
    const before = readFileSync(pathOf(COMMODITY), 'utf8')

    const run = await moveBack(COMMODITY, 'inc-003', 'commodity-b', '--write')

    expect([
      run.exitCode,
      envelopeOf(run).errors[0].message,
      readFileSync(pathOf(COMMODITY), 'utf8')
    ]).toEqual([
      2,
      'inc-003 is done. Only a todo or blocked row moves back: a row built or set aside stays where it was built.',
      before
    ])
  })

  test('tim backlog check flags a row that reuses the id of a row moved back', async () => {
    await splitIntoThemes()
    await moveRows(ORIGIN, 'inc-002', 'origin-b')
    await moveBack(ORIGIN, 'inc-002', 'origin-b', '--write')
    const away = readJson(pathOf(ORIGIN_B))
    writeJson(pathOf(ORIGIN_B), {
      ...away,
      increments: [{ ...rowIn(ORIGIN, 'inc-002'), theme: 'origin-b' }]
    })

    const run = await runTim(['check', ORIGIN_B])

    expect(envelopeOf(run).errors[0].message).toContain(
      `inc-002 moved back to ${ORIGIN}, theme "origin", which builds it. Give this row a new id, or build it there.`
    )
  })
})
