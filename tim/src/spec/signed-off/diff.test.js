import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { commitAll, git, writeFiles } from '../../test-support/branched-repo.js'
import { diffSignedOff } from './diff.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const CAPABILITY = 'plants/journey-pages/origin'
const SPEC_PATH = `openspec/specs/${CAPABILITY}/spec.md`
const COVERAGE_PATH = `openspec/coverage/${CAPABILITY}/coverage.json`
const REPO = 'trade-imports-plants-frontend'
const FIT_FILE = 'src/features/origin/origin.fit.spec.js'
const UNIT_FILE = 'src/features/origin/controller.test.js'
const HINT_FILE = 'src/features/origin/hint.test.js'

const scenarioText = ({ id, name, then, signedOff }) =>
  [
    `#### Scenario: ${name}`,
    `**ID**: ${id}`,
    ...(signedOff ? [`**Signed off**: ${signedOff}`] : []),
    '- **GIVEN** a trader on the origin page',
    `- **THEN** ${then}`,
    ''
  ].join('\n')

const specOf = (scenarios) => `# Origin

## Purpose
The origin page.

**Maturity**: agreed

### Requirement: The origin page asks for the country
**ID**: REQ-ORIGIN-001

${scenarios.map(scenarioText).join('\n')}`

const coverageOf = (scenarios) =>
  JSON.stringify({
    capability: CAPABILITY,
    requirements: [
      {
        id: 'REQ-ORIGIN-001',
        name: 'The origin page asks for the country',
        scenarios: scenarios.map(({ id, name, tests = [] }) => ({
          id,
          name,
          coverage: tests.length > 0 ? 'full' : 'none',
          tests
        }))
      }
    ]
  })

const writeSpec = (workspacePath, scenarios) =>
  writeFiles(workspacePath, {
    [SPEC_PATH]: specOf(scenarios),
    [COVERAGE_PATH]: coverageOf(scenarios)
  })

const link = (file, title, repo = REPO) => ({
  type: 'fit',
  repo,
  file,
  test: title
})

const LISTS = {
  id: 'SCN-ORIGIN-001-A',
  name: 'The page lists countries',
  then: 'the page lists every country',
  signedOff: '2026-11-11',
  tests: [
    link(FIT_FILE, 'lists every country'),
    link(FIT_FILE, 'lists countries in order'),
    link(UNIT_FILE, 'returns every country')
  ]
}
const SAVES = {
  id: 'SCN-ORIGIN-001-B',
  name: 'The page saves the country',
  then: 'the country is saved',
  signedOff: '2026-11-11',
  tests: [link(UNIT_FILE, 'saves the country')]
}
const HINT = {
  id: 'SCN-ORIGIN-001-C',
  name: 'The page shows a hint',
  then: 'a hint shows',
  signedOff: '2026-11-11'
}
const SEARCH = {
  id: 'SCN-ORIGIN-001-D',
  name: 'A search finds a country',
  then: 'the country is offered',
  tests: [link(HINT_FILE, 'offers the country')]
}
const ERROR = {
  id: 'SCN-ORIGIN-001-E',
  name: 'An empty answer shows an error',
  then: 'an error shows'
}

const headOf = async (dir) =>
  (await git(dir, 'rev-parse', 'HEAD')).stdout.trim()

const workspaceWithSpec = async (scenarios) => {
  root = mkdtempSync(join(tmpdir(), 'tim-signed-off-'))
  await git(root, 'init', '--quiet', '-b', 'main', root)
  writeFiles(root, { '.gitignore': 'repos/\n' })
  writeSpec(root, scenarios)
  await commitAll(root, 'spec')
  return root
}

const serviceRepo = async (workspacePath) => {
  const repoPath = join(workspacePath, 'repos', REPO)
  await git(workspacePath, 'init', '--quiet', '-b', 'main', repoPath)
  writeFiles(repoPath, {
    [FIT_FILE]: 'fit\n',
    [UNIT_FILE]: 'unit\n',
    [HINT_FILE]: 'hint\n'
  })
  await commitAll(repoPath, 'tests')
  return repoPath
}

const steps = (then) => [
  '- **GIVEN** a trader on the origin page',
  `- **THEN** ${then}`
]

describe('#diffSignedOff over the spec', () => {
  test('Should report a signed-off scenario rewritten, removed, unmarked or added already signed off, and nothing else', async () => {
    const workspacePath = await workspaceWithSpec([
      LISTS,
      SAVES,
      HINT,
      SEARCH,
      ERROR
    ])
    const base = await headOf(workspacePath)
    writeSpec(workspacePath, [
      { ...LISTS, then: 'the page lists only some countries' },
      { ...SAVES, signedOff: undefined },
      { ...SEARCH, then: 'the country is offered first' },
      { ...ERROR, signedOff: '2026-11-12' },
      {
        id: 'SCN-ORIGIN-001-F',
        name: 'The page keeps the answer',
        then: 'the answer is kept',
        signedOff: '2026-11-12'
      }
    ])
    await commitAll(workspacePath, 'rework')

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      ranges: [`${base}..HEAD`]
    })

    expect(
      result.signedOff.map(({ id, change, why, before, after }) => ({
        id,
        change,
        why,
        before,
        after
      }))
    ).toEqual([
      {
        id: 'SCN-ORIGIN-001-A',
        change: 'changed',
        why: 'It was signed off, and the change rewrites its name or steps.',
        before: {
          name: LISTS.name,
          steps: steps('the page lists every country')
        },
        after: {
          name: LISTS.name,
          steps: steps('the page lists only some countries')
        }
      },
      {
        id: 'SCN-ORIGIN-001-B',
        change: 'unmarked',
        why: 'The change removes its Signed off mark.',
        before: { name: SAVES.name, steps: steps('the country is saved') },
        after: { name: SAVES.name, steps: steps('the country is saved') }
      },
      {
        id: 'SCN-ORIGIN-001-C',
        change: 'removed',
        why: 'It was signed off, and the change removes it.',
        before: { name: HINT.name, steps: steps('a hint shows') },
        after: null
      },
      {
        id: 'SCN-ORIGIN-001-F',
        change: 'added',
        why: 'It is new and already marked signed off.',
        before: null,
        after: {
          name: 'The page keeps the answer',
          steps: steps('the answer is kept')
        }
      }
    ])
  })

  test('Should name the capability, the requirement and the commit each change was found in', async () => {
    const workspacePath = await workspaceWithSpec([LISTS])
    writeSpec(workspacePath, [
      { ...LISTS, then: 'the page lists no countries' }
    ])
    await commitAll(workspacePath, 'reword')
    const sha = await headOf(workspacePath)

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      commits: ['HEAD']
    })

    expect(
      result.signedOff.map(({ capability, requirementId, foundIn }) => ({
        capability,
        requirementId,
        foundIn
      }))
    ).toEqual([
      {
        capability: CAPABILITY,
        requirementId: 'REQ-ORIGIN-001',
        foundIn: { commit: 'HEAD', sha }
      }
    ])
  })

  test('Should report a rewritten scenario that also loses its mark as changed, saying both', async () => {
    const workspacePath = await workspaceWithSpec([LISTS])
    writeSpec(workspacePath, [
      { ...LISTS, then: 'the page lists no countries', signedOff: undefined }
    ])
    await commitAll(workspacePath, 'reword and unmark')

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      commits: ['HEAD']
    })

    expect(
      result.signedOff.map(({ change, why }) => ({ change, why }))
    ).toEqual([
      {
        change: 'changed',
        why: 'It was signed off, and the change rewrites its name or steps and removes its Signed off mark.'
      }
    ])
  })

  test('Should find nothing, with no ticket draft, when only the coverage of a signed-off scenario changes', async () => {
    const workspacePath = await workspaceWithSpec([LISTS])
    writeSpec(workspacePath, [{ ...LISTS, tests: [] }])
    await commitAll(workspacePath, 'coverage only')

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      commits: ['HEAD', 'deadbeef']
    })

    expect(result).toEqual({
      signedOff: [],
      skipped: [
        { commit: 'deadbeef', reason: 'deadbeef is not a commit in this repo' }
      ],
      ticketDraft: null
    })
  })
})

describe('#diffSignedOff over the uncommitted spec', () => {
  const NEW_CAPABILITY = 'plants/journey-pages/destination'

  test('Should report a signed-off scenario rewritten in the working tree, and one added signed off in a new spec file', async () => {
    const workspacePath = await workspaceWithSpec([LISTS, SEARCH])
    writeSpec(workspacePath, [
      { ...LISTS, then: 'the page lists only some countries' },
      { ...SEARCH, then: 'the country is offered first' }
    ])
    writeFiles(workspacePath, {
      [`openspec/specs/${NEW_CAPABILITY}/spec.md`]: specOf([
        { ...HINT, id: 'SCN-DEST-001-A' }
      ])
    })

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      uncommitted: true
    })

    expect(
      result.signedOff.map(({ id, capability, change, foundIn }) => ({
        id,
        capability,
        change,
        foundIn
      }))
    ).toEqual([
      {
        id: 'SCN-DEST-001-A',
        capability: NEW_CAPABILITY,
        change: 'added',
        foundIn: { uncommitted: true }
      },
      {
        id: 'SCN-ORIGIN-001-A',
        capability: CAPABILITY,
        change: 'changed',
        foundIn: { uncommitted: true }
      }
    ])
  })

  test('Should find nothing, with no ticket draft, when the working tree matches HEAD', async () => {
    const workspacePath = await workspaceWithSpec([LISTS])

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      uncommitted: true
    })

    expect(result).toEqual({ signedOff: [], skipped: [], ticketDraft: null })
  })
})

describe('#diffSignedOff over a repo', () => {
  test('Should report each edited or deleted test linked to a signed-off scenario, committed or not, naming the scenario', async () => {
    const workspacePath = await workspaceWithSpec([
      LISTS,
      SAVES,
      HINT,
      SEARCH,
      ERROR
    ])
    const repoPath = await serviceRepo(workspacePath)
    rmSync(join(repoPath, FIT_FILE))
    await commitAll(repoPath, 'drop the fit spec')
    writeFiles(repoPath, {
      [UNIT_FILE]: 'unit, edited\n',
      [HINT_FILE]: 'hint, edited\n',
      'src/features/origin/new.test.js': 'new\n'
    })

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      repos: [REPO],
      base: 'HEAD~1'
    })

    expect(
      result.signedOff.map(({ id, name, change, why, test, foundIn }) => ({
        id,
        name,
        change,
        why,
        test,
        foundIn
      }))
    ).toEqual([
      {
        id: 'SCN-ORIGIN-001-A',
        name: LISTS.name,
        change: 'test-deleted',
        why: `A test linked to it in coverage.json is deleted: ${REPO}/${FIT_FILE}.`,
        test: {
          repo: REPO,
          file: FIT_FILE,
          titles: ['lists every country', 'lists countries in order']
        },
        foundIn: { repo: REPO, base: 'HEAD~1' }
      },
      {
        id: 'SCN-ORIGIN-001-A',
        name: LISTS.name,
        change: 'test-edited',
        why: `A test linked to it in coverage.json is edited: ${REPO}/${UNIT_FILE}.`,
        test: {
          repo: REPO,
          file: UNIT_FILE,
          titles: ['returns every country']
        },
        foundIn: { repo: REPO, base: 'HEAD~1' }
      },
      {
        id: 'SCN-ORIGIN-001-B',
        name: SAVES.name,
        change: 'test-edited',
        why: `A test linked to it in coverage.json is edited: ${REPO}/${UNIT_FILE}.`,
        test: { repo: REPO, file: UNIT_FILE, titles: ['saves the country'] },
        foundIn: { repo: REPO, base: 'HEAD~1' }
      }
    ])
  })

  test('Should leave out a changed file that a signed-off scenario links in another repo', async () => {
    const workspacePath = await workspaceWithSpec([
      {
        ...LISTS,
        tests: [
          link(UNIT_FILE, 'returns every country', 'trade-imports-ins-tests')
        ]
      }
    ])
    const repoPath = await serviceRepo(workspacePath)
    writeFiles(repoPath, { [UNIT_FILE]: 'unit, edited\n' })

    const result = await diffSignedOff({
      workspaceRoot: workspacePath,
      repos: [REPO],
      base: 'HEAD'
    })

    expect(result.signedOff).toEqual([])
  })

  test('Should refuse a base the repo does not have', async () => {
    const workspacePath = await workspaceWithSpec([LISTS])
    await serviceRepo(workspacePath)

    await expect(
      diffSignedOff({
        workspaceRoot: workspacePath,
        repos: [REPO],
        base: 'origin/nope'
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Can't find origin/nope in repos/${REPO}. Fetch first, or name another --base.`
    })
  })

  test('Should refuse a repo that is not under repos/', async () => {
    const workspacePath = await workspaceWithSpec([LISTS])

    await expect(
      diffSignedOff({
        workspaceRoot: workspacePath,
        repos: ['nowhere'],
        base: 'HEAD'
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: "Can't find repos/nowhere. Check the name, or clone it first."
    })
  })
})
