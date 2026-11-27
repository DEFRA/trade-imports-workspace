import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import { domainsToStart } from './lease.js'

const SCOPE = {
  default: { suites: ['all'] },
  'trade-imports-animals-frontend': {
    suites: ['tests/animals/'],
    tags: ['@animals-frontend']
  },
  'trade-imports-plants-frontend': { suites: ['tests/plants/'] },
  'trade-imports-performance-tests': { suites: ['tests/plants/'] }
}

let workspace

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
}

const givenTaggedAdminSpec = () => {
  const path = join(
    workspace,
    'repos',
    'trade-imports-ins-tests',
    'tests',
    'animals-admin',
    'seed.spec.ts'
  )
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, "tag: '@animals-frontend'")
}

const givenBacklog = (increments, repos) =>
  writeJson(join(workspace, 'workareas', 'shared', 'theme', 'backlog.json'), {
    repos,
    increments
  })

const FRONTEND_ONLY = {
  frontend: {
    path: 'repos/trade-imports-animals-frontend',
    github: 'DEFRA/trade-imports-animals-frontend'
  }
}

const domainsFor = (parsed) =>
  domainsToStart({ workspaceRoot: workspace, parsed })

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'tim-lease-domains-')))
  markWorkspaceRoot(workspace)
  writeJson(join(workspace, 'config', 'e2e-tests-pr-scope.json'), SCOPE)
  givenTaggedAdminSpec()
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('#domainsToStart', () => {
  test('Should take the domains named with --domain', () => {
    expect(domainsFor({ domain: ['plants', 'animals'] })).toEqual([
      'plants',
      'animals'
    ])
  })

  test('Should take no domains when none is named and no workarea is given', () => {
    expect(domainsFor({})).toEqual([])
  })

  test('Should leave a repo’s tagged domains out under a targeted run', () => {
    givenBacklog(
      [{ id: 'inc-001', repos: ['frontend'], status: 'todo' }],
      FRONTEND_ONLY
    )

    expect(
      domainsFor({ forWorkarea: 'shared/theme', e2e: 'targeted' })
    ).toEqual(['animals'])
  })

  test('Should count a repo’s tagged domains when the run is not targeted', () => {
    givenBacklog(
      [{ id: 'inc-001', repos: ['frontend'], status: 'todo' }],
      FRONTEND_ONLY
    )

    expect(domainsFor({ forWorkarea: 'shared/theme', e2e: 'local' })).toEqual([
      'animals',
      'animals-admin'
    ])
  })

  test('Should narrow to nothing when a row needs every domain, so the whole stack starts', () => {
    givenBacklog(
      [
        { id: 'inc-001', repos: ['frontend'], status: 'todo' },
        { id: 'inc-002', repos: ['perftests'], status: 'todo' }
      ],
      {
        ...FRONTEND_ONLY,
        perftests: {
          path: 'repos/trade-imports-performance-tests',
          github: 'DEFRA/trade-imports-performance-tests'
        }
      }
    )

    expect(
      domainsFor({ forWorkarea: 'shared/theme', e2e: 'targeted' })
    ).toEqual([])
  })

  test('Should narrow to nothing when no row needs a stack', () => {
    givenBacklog([{ id: 'inc-001', repos: ['workspace'], status: 'todo' }], {
      workspace: { path: '.', github: 'DEFRA/trade-imports-workspace' }
    })

    expect(
      domainsFor({ forWorkarea: 'shared/theme', e2e: 'targeted' })
    ).toEqual([])
  })

  test('Should leave a row already built out of the domains it starts', () => {
    givenBacklog(
      [
        { id: 'inc-001', repos: ['frontend'], status: 'done' },
        { id: 'inc-002', repos: ['plantsfrontend'], status: 'todo' }
      ],
      {
        ...FRONTEND_ONLY,
        plantsfrontend: {
          path: 'repos/trade-imports-plants-frontend',
          github: 'DEFRA/trade-imports-plants-frontend'
        }
      }
    )

    expect(
      domainsFor({ forWorkarea: 'shared/theme', e2e: 'targeted' })
    ).toEqual(['plants'])
  })

  test('Should refuse --domain and --for-workarea together', () => {
    expect(() =>
      domainsFor({ domain: ['plants'], forWorkarea: 'shared/theme' })
    ).toThrow(
      'Name the domains with --domain, or let --for-workarea work them out. Not both.'
    )
  })
})
