import { describe, test, expect, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  createBareRepo,
  createFatClone
} from '../../test-support/git-fixtures.js'
import {
  parseRepoList,
  parseStatusEntries,
  readRepoStates,
  renderRepoStateText
} from './repo-state.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=t@example.invalid'
]

const git = async (dir, ...args) =>
  (
    await execa('git', [...IDENTITY, '-C', dir, ...args], { reject: false })
  ).stdout.trim()

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const workspaceWithClone = async (name) => {
  root = mkdtempSync(join(tmpdir(), 'tim-repo-state-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  const origins = join(root, 'origins')
  mkdirSync(origins)
  const fixture = await createBareRepo(origins, name, { withGhPages: false })
  const path = join(root, 'repos', name)
  await createFatClone(fixture.barePath, path)
  return path
}

const commitIn = async (path, file) => {
  writeFileSync(join(path, file), `${file}\n`)
  await git(path, 'add', file)
  await git(path, 'commit', '--quiet', '-m', `add ${file}`)
}

describe('#parseStatusEntries', () => {
  test('Should give each entry its two status letters and path, and a rename the path it came from', () => {
    const stdout = ' M src/a.js\0R  src/new.js\0src/old.js\0?? notes/\0'

    expect(parseStatusEntries(stdout)).toEqual([
      { status: ' M', path: 'src/a.js' },
      { status: 'R ', path: 'src/new.js', from: 'src/old.js' },
      { status: '??', path: 'notes/' }
    ])
  })
})

describe('#parseRepoList', () => {
  test('Should resolve each relative path against the workspace root and keep an absolute one', () => {
    expect(
      parseRepoList('frontend:repos/front, workspace:., abs:/tmp/x', '/ws')
    ).toEqual([
      { key: 'frontend', path: '/ws/repos/front' },
      { key: 'workspace', path: '/ws' },
      { key: 'abs', path: '/tmp/x' }
    ])
  })

  test('Should refuse an entry that is not key:path', () => {
    expect(() => parseRepoList('repos/front', '/ws')).toThrow(
      'Write each repo as key:path, such as frontend:repos/trade-imports-plants-frontend. "repos/front" is not.'
    )
  })

  test('Should refuse a key named twice', () => {
    expect(() => parseRepoList('a:one,a:two', '/ws')).toThrow(
      'a is named twice in --repos.'
    )
  })
})

describe('#readRepoStates', () => {
  test('Should report a clean repo on main, level with origin', async () => {
    const path = await workspaceWithClone('frontend')

    const { repos } = await readRepoStates({
      repos: [{ key: 'frontend', path }]
    })

    expect(repos).toEqual([
      {
        key: 'frontend',
        path,
        cloned: true,
        branch: 'main',
        head: await git(path, 'rev-parse', 'HEAD'),
        dirty: false,
        changed: [],
        staged: 0,
        merging: false,
        unresolved: [],
        origin: 'origin/main',
        ahead: 0,
        behind: 0
      }
    ])
  })

  test('Should report changed paths, staged count and commits ahead of origin and of the base', async () => {
    const path = await workspaceWithClone('frontend')
    await git(path, 'checkout', '--quiet', '-b', 'feat/x')
    await commitIn(path, 'one.txt')
    writeFileSync(join(path, 'staged.txt'), 'staged\n')
    await git(path, 'add', 'staged.txt')
    writeFileSync(join(path, 'loose.txt'), 'loose\n')

    const { repos } = await readRepoStates({
      repos: [{ key: 'frontend', path }],
      branch: 'feat/x',
      base: 'main'
    })

    expect(repos[0]).toMatchObject({
      branch: 'feat/x',
      dirty: true,
      changed: [
        { status: 'A ', path: 'staged.txt' },
        { status: '??', path: 'loose.txt' }
      ],
      staged: 1,
      origin: 'origin/feat/x',
      ahead: null,
      behind: null,
      expectedBranch: 'feat/x',
      onBranch: true,
      branchHead: await git(path, 'rev-parse', 'HEAD'),
      base: 'origin/main',
      aheadOfBase: 1,
      behindBase: 0
    })
  })

  test('Should report a repo off the expected branch and where that branch points', async () => {
    const path = await workspaceWithClone('frontend')
    await git(path, 'branch', 'feat/x')
    await git(path, 'checkout', '--quiet', '-b', 'other')
    await commitIn(path, 'two.txt')

    const { repos } = await readRepoStates({
      repos: [{ key: 'frontend', path }],
      branch: 'feat/x'
    })

    expect(repos[0]).toMatchObject({
      branch: 'other',
      onBranch: false,
      branchHead: await git(path, 'rev-parse', 'main')
    })
  })

  test('Should report a merge in progress and the paths it left unresolved', async () => {
    const path = await workspaceWithClone('frontend')
    await git(path, 'checkout', '--quiet', '-b', 'left')
    writeFileSync(join(path, 'README.md'), 'left\n')
    await git(path, 'commit', '--quiet', '-am', 'left')
    await git(path, 'checkout', '--quiet', 'main')
    writeFileSync(join(path, 'README.md'), 'right\n')
    await git(path, 'commit', '--quiet', '-am', 'right')
    await git(path, 'merge', '--quiet', 'left')

    const { repos } = await readRepoStates({
      repos: [{ key: 'frontend', path }]
    })

    expect(repos[0]).toMatchObject({
      merging: true,
      unresolved: ['README.md'],
      ahead: 1,
      behind: 0
    })
  })

  test('Should report a folder with no git repo as not cloned', async () => {
    root = mkdtempSync(join(tmpdir(), 'tim-repo-state-'))

    const { repos } = await readRepoStates({
      repos: [{ key: 'missing', path: join(root, 'nothing') }]
    })

    expect(repos).toEqual([
      { key: 'missing', path: join(root, 'nothing'), cloned: false }
    ])
  })
})

describe('#renderRepoStateText', () => {
  test('Should give one line per repo and one indented line per changed path', () => {
    const text = renderRepoStateText({
      repos: [
        {
          key: 'frontend',
          cloned: true,
          branch: 'other',
          expectedBranch: 'feat/x',
          onBranch: false,
          dirty: true,
          changed: [{ status: ' M', path: 'a.js' }],
          staged: 0,
          merging: false,
          origin: 'origin/other',
          ahead: null,
          behind: null
        },
        { key: 'tests', path: '/nowhere', cloned: false }
      ]
    })

    expect(text).toBe(
      [
        'frontend: on other, not feat/x; 1 changed, 0 staged; no origin/other',
        '   M a.js',
        'tests: not cloned at /nowhere'
      ].join('\n')
    )
  })
})

describe('tim workspace repo-state CLI', () => {
  test('Should print a JSON envelope naming each repo, its path resolved from the workspace', async () => {
    const path = await workspaceWithClone('frontend')

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'repo-state',
        '--repos',
        'frontend:repos/frontend',
        '--workspace',
        root,
        '--json'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    const payload = JSON.parse(stdout.trim())
    expect({ exitCode, ok: payload.ok, repos: payload.result.repos }).toEqual({
      exitCode: 0,
      ok: true,
      repos: [
        expect.objectContaining({
          key: 'frontend',
          path,
          branch: 'main',
          dirty: false
        })
      ]
    })
  })

  test('Should exit 2 with a usage error when an entry is not key:path', async () => {
    root = mkdtempSync(join(tmpdir(), 'tim-repo-state-'))
    writeFileSync(join(root, 'Makefile'), 'all:\n')
    mkdirSync(join(root, 'repos'))

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'workspace',
        'repo-state',
        '--repos',
        'repos/frontend',
        '--workspace',
        root,
        '--json'
      ],
      { reject: false, env: { TIM_NO_AUTO_PULL: '1' } }
    )

    expect({ exitCode, errors: JSON.parse(stdout.trim()).errors }).toEqual({
      exitCode: 2,
      errors: [
        {
          code: 'USAGE',
          message:
            'Write each repo as key:path, such as frontend:repos/trade-imports-plants-frontend. "repos/frontend" is not.'
        }
      ]
    })
  })
})
