import { describe, expect, test } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  scope,
  stageServiceTagWorkspace,
  tagMap
} from '../commands/service-tag/__fixtures__/service-tag-workspace.js'
import {
  composeEdges,
  loadServiceTagMap,
  repoState,
  serviceTagScope,
  startServiceTag
} from './start.js'

describe('#composeEdges', () => {
  test('Should read list-form URL entries under a two-space service key, skipping _BASE_URL', () => {
    const compose = [
      'services:',
      '  trade-imports-ins-frontend:',
      '    environment:',
      '      - TRADE_IMPORTS_ADDRESS_BOOK_URL=http://localhost:8089',
      '      - TRADE_IMPORTS_INS_FRONTEND_BASE_URL=http://localhost:3002',
      '      - TRADE_IMPORTS_REFERENCE_DATA_URL=http://localhost:8086'
    ].join('\n')

    expect(composeEdges([compose])).toEqual([
      { from: 'trade-imports-ins-frontend', to: 'trade-imports-address-book' },
      { from: 'trade-imports-ins-frontend', to: 'trade-imports-reference-data' }
    ])
  })

  test('Should ignore map-form environment entries', () => {
    const compose = [
      '  zap:',
      '    environment:',
      '      TRADE_IMPORTS_ADDRESS_BOOK_URL: http://localhost:8089',
      '      ZAP_TRADE_IMPORTS_ADDRESS_BOOK_URL: http://localhost:8089'
    ].join('\n')

    expect(composeEdges([compose])).toEqual([])
  })

  test('Should carry the last service key into the next file, and drop repeats', () => {
    const first =
      '  trade-imports-a:\n    environment:\n      - TRADE_IMPORTS_B_URL=x\n'
    const second =
      'x-env: &env\n  - TRADE_IMPORTS_B_URL=y\n  - TRADE_IMPORTS_C_D_URL=z\n'

    expect(composeEdges([first, second])).toEqual([
      { from: 'trade-imports-a', to: 'trade-imports-b' },
      { from: 'trade-imports-a', to: 'trade-imports-c-d' }
    ])
  })

  test('Should ignore entries before any service key', () => {
    expect(composeEdges(['  - TRADE_IMPORTS_B_URL=x'])).toEqual([])
  })
})

const edges = [
  { from: 'trade-imports-ins-frontend', to: 'trade-imports-address-book' },
  {
    from: 'trade-imports-animals-frontend',
    to: 'trade-imports-animals-backend'
  }
]

describe('#serviceTagScope', () => {
  test('Should cover every entry but default, with each one dependents and their domains', () => {
    const { entries } = serviceTagScope({ scope, tagMap, edges })

    expect(entries.map(({ service }) => service)).toEqual([
      'trade-imports-address-book',
      'trade-imports-ins-frontend',
      'trade-imports-animals-backend',
      'trade-imports-odd',
      'trade-imports-no-lists',
      'trade-imports-ins-frontend-base'
    ])
    expect(entries[0].dependents).toEqual([
      { service: 'trade-imports-ins-frontend', domains: ['ins'] }
    ])
  })

  test('Should take a short or a full service name', () => {
    const short = serviceTagScope({ scope, tagMap, edges, service: 'odd' })
    const full = serviceTagScope({
      scope,
      tagMap,
      edges,
      service: 'trade-imports-odd'
    })

    expect(short).toEqual(full)
    expect(short.entries.map(({ service }) => service)).toEqual([
      'trade-imports-odd'
    ])
  })

  test('Should report each kind of disagreement, in order, per entry', () => {
    const { alignment } = serviceTagScope({ scope, tagMap, edges })

    expect(alignment.map(({ service, kind }) => `${service} ${kind}`)).toEqual([
      'trade-imports-ins-frontend domains-differ',
      'trade-imports-odd unexpected-tag-name',
      'trade-imports-odd tag-missing-from-map',
      'trade-imports-odd nested-suite',
      'null map-tag-without-entry'
    ])
  })

  test('Should compare map domains sorted, so their order does not matter', () => {
    const { alignment } = serviceTagScope({
      scope,
      tagMap,
      edges,
      service: 'animals-backend'
    })

    expect(alignment).toEqual([])
  })
})

describe('#repoState', () => {
  test('Should give no branch and no lines for a folder git cannot read', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'tim-repo-state-'))

    const state = await repoState({ name: 'loose', path: folder })

    expect(state).toEqual({
      name: 'loose',
      path: folder,
      branch: '',
      uncommitted: []
    })
    rmSync(folder, { recursive: true, force: true })
  })
})

describe('#loadServiceTagMap', () => {
  test('Should refuse when tsx prints no readable map', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'tim-tag-map-'))

    const loading = loadServiceTagMap(folder)

    await expect(loading).rejects.toMatchObject({ code: 'PARSE' })
    rmSync(folder, { recursive: true, force: true })
  })
})

describe('#startServiceTag', () => {
  test('Should read the map through the loader it is given', async () => {
    const staged = await stageServiceTagWorkspace()

    const report = await startServiceTag({
      workspaceRoot: staged.root,
      service: 'address-book',
      loadTagMap: async () => ({ '@address-book': ['plants'] })
    })
    staged.remove()

    expect(report.alignment).toEqual([
      {
        service: 'trade-imports-address-book',
        kind: 'domains-differ',
        detail:
          '@address-book map domains ["plants"] differ from the domains the entry runs by path ["ins"]'
      }
    ])
  })

  test('Should refuse an unreadable scope file', async () => {
    const staged = await stageServiceTagWorkspace()
    const scopeFile = join(staged.root, 'config', 'e2e-tests-pr-scope.json')
    writeFileSync(scopeFile, '{ not json')

    const starting = startServiceTag({
      workspaceRoot: staged.root,
      loadTagMap: async () => ({})
    })

    await expect(starting).rejects.toMatchObject({ code: 'PARSE' })
    staged.remove()
  })
})
