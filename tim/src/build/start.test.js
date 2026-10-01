import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { installHttpMocks, closeHttpMocks } from '../test-support/http-mock.js'
import { createBareRepo, createFatClone } from '../test-support/git-fixtures.js'
import { createJiraClient } from '../clients/jira-client.js'
import {
  runBuildStart,
  branchNameFor,
  resumePointFor,
  incrementReposFor
} from './start.js'

const here = dirname(fileURLToPath(import.meta.url))
const TRANSITIONS = JSON.parse(
  readFileSync(
    join(
      here,
      '..',
      'test-support',
      'fixtures',
      'jira',
      'list-transitions.json'
    ),
    'utf8'
  )
)

const BASE = 'https://example.atlassian.net'
const WORKAREA = 'shared/programme'
const CONFIG = {
  project: 'EUDPA',
  epic: 'EUDPA-1',
  inDevStatus: 'In Dev',
  doneStatus: 'Done',
  board: 13780
}

let root
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
  rmSync(root, { recursive: true, force: true })
})

const row = (fields) => ({
  id: 'inc-001',
  title: 'Add the origin page',
  detail: 'Importers say where the goods come from.',
  acceptanceCriteria: ['The origin page saves the country'],
  dependsOn: [],
  status: 'todo',
  kind: 'feat',
  repos: ['backend', 'frontend'],
  ...fields
})

const backlogPath = () =>
  join(root, 'workareas', 'shared', 'programme', 'backlog.json')

const workspaceWith = async (increments) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-start-'))
  const origins = join(root, 'origins')
  mkdirSync(origins)
  for (const name of ['backend', 'frontend']) {
    const { barePath } = await createBareRepo(origins, name, {
      withGhPages: false
    })
    await createFatClone(barePath, join(root, 'repos', name))
  }
  mkdirSync(dirname(backlogPath()), { recursive: true })
  writeFileSync(
    backlogPath(),
    JSON.stringify({
      programme: 'programme',
      repos: {
        backend: { path: 'repos/backend', github: 'DEFRA/backend' },
        frontend: { path: 'repos/frontend', github: 'DEFRA/frontend' }
      },
      increments
    })
  )
}

const rowOnDisk = (id = 'inc-001') =>
  JSON.parse(readFileSync(backlogPath(), 'utf8')).increments.find(
    (entry) => entry.id === id
  )

const jira = () => createJiraClient({ user: 'u', token: 't', baseUrl: BASE })

const noJira = () => {
  throw new Error('This start should make no Jira call.')
}

const start = (options = {}) =>
  runBuildStart({
    workspaceRoot: root,
    workarea: WORKAREA,
    base: 'main',
    config: CONFIG,
    jira,
    ...options
  })

const captured = { issue: null }

const EPIC_CHILDREN = /^\/rest\/api\/3\/search\/jql\?jql=parent%20%3D%20EUDPA-1/

const epicHolds = (children) =>
  mockPool(BASE)
    .get(EPIC_CHILDREN)
    .reply(200, {
      issues: children.map(({ key, summary }) => ({
        key,
        fields: { summary }
      })),
      isLast: true
    })

const jiraRaises = ({
  status = 'To Do',
  transitions = TRANSITIONS,
  board = 204
} = {}) => {
  captured.issue = null
  epicHolds([{ key: 'EUDPA-499', summary: 'inc-000 — Something else' }])
  mockPool(BASE)
    .post('/rest/api/2/issue', (body) => {
      captured.issue = body.fields
      return true
    })
    .reply(201, { id: '10500', key: 'EUDPA-500' })
  mockPool(BASE)
    .get('/rest/api/2/issue/EUDPA-500')
    .reply(200, { key: 'EUDPA-500', fields: { status: { name: status } } })
  mockPool(BASE)
    .get('/rest/api/2/issue/EUDPA-500/transitions')
    .reply(200, transitions)
  mockPool(BASE).post('/rest/api/2/issue/EUDPA-500/transitions').reply(204)
  mockPool(BASE).post('/rest/agile/1.0/board/13780/issue').reply(board)
}

const jiraKnows = (key, status) => {
  mockPool(BASE)
    .get(`/rest/api/2/issue/${key}`)
    .reply(200, { key, fields: { status: { name: status } } })
  mockPool(BASE).post('/rest/agile/1.0/board/13780/issue').reply(204)
}

const branchOf = async (repo) =>
  (
    await execa('git', [
      '-C',
      join(root, 'repos', repo),
      'branch',
      '--show-current'
    ])
  ).stdout.trim()

describe('runBuildStart — a new increment', () => {
  test('derives the next increment, raises its ticket, and puts its repos on its branch', async () => {
    await workspaceWith([row()])
    jiraRaises()

    const outcome = await start()

    expect({
      outcome: {
        id: outcome.id,
        failedStep: outcome.failedStep,
        ticket: outcome.ticket,
        branch: outcome.branch,
        repos: outcome.repos,
        resumeAt: outcome.resumeAt
      },
      backend: await branchOf('backend'),
      frontend: await branchOf('frontend')
    }).toEqual({
      outcome: {
        id: 'inc-001',
        failedStep: null,
        ticket: {
          key: 'EUDPA-500',
          created: true,
          status: 'In Dev',
          movedToBoard: true,
          warnings: []
        },
        branch: 'feat/EUDPA-500-add-the-origin-page',
        repos: ['backend', 'frontend'],
        resumeAt: 'build'
      },
      backend: 'feat/EUDPA-500-add-the-origin-page',
      frontend: 'feat/EUDPA-500-add-the-origin-page'
    })
  })

  test('raises the ticket under the epic with the row as its wiki-markup description', async () => {
    await workspaceWith([row()])
    jiraRaises()

    await start()

    expect(captured.issue).toEqual({
      project: { key: 'EUDPA' },
      summary: 'inc-001 — Add the origin page',
      description: expect.stringContaining(
        'h2. Acceptance criteria\n\n* The origin page saves the country'
      ),
      issuetype: { name: 'Task' },
      priority: { name: 'Medium' },
      labels: [],
      parent: { key: 'EUDPA-1' }
    })
  })

  test('records the ticket and the branch on the row', async () => {
    await workspaceWith([row()])
    jiraRaises()

    await start()

    expect(rowOnDisk()).toMatchObject({
      ticket: 'EUDPA-500',
      branch: 'feat/EUDPA-500-add-the-origin-page'
    })
  })

  test('records a raised ticket before the status step, so a retry never raises a second', async () => {
    await workspaceWith([row()])
    jiraRaises({ transitions: { transitions: [] } })

    const outcome = await start()

    expect({
      failedStep: outcome.failedStep,
      reason: outcome.reason,
      ticketOnRow: rowOnDisk().ticket
    }).toEqual({
      failedStep: 'ticket',
      reason:
        'EUDPA-500 is To Do and offers no transition to "In Dev". The board offers (transition -> status): none. Fix jiraInDevStatus in the args.',
      ticketOnRow: 'EUDPA-500'
    })
  })

  test('fails the ticket step when the board will not take the ticket', async () => {
    await workspaceWith([row()])
    jiraRaises({ board: 400 })

    const outcome = await start()

    expect({
      failedStep: outcome.failedStep,
      branched: outcome.branched
    }).toEqual({ failedStep: 'ticket', branched: [] })
  })
})

describe('runBuildStart — a ticket raised before its key was recorded', () => {
  test('reuses the open ticket under the epic with this increment’s summary, and raises none', async () => {
    await workspaceWith([row()])
    epicHolds([{ key: 'EUDPA-488', summary: 'inc-001 — Add the origin page' }])
    jiraKnows('EUDPA-488', 'In Dev')

    const outcome = await start()

    expect({
      ticket: outcome.ticket,
      ticketOnRow: rowOnDisk().ticket
    }).toEqual({
      ticket: {
        key: 'EUDPA-488',
        created: false,
        status: 'In Dev',
        movedToBoard: true,
        warnings: [
          "EUDPA-488 under EUDPA-1 already has this increment's summary, probably raised by an attempt that died before it recorded the key. It was reused, not raised again."
        ]
      },
      ticketOnRow: 'EUDPA-488'
    })
  })

  test('says to check Jira for the summary when raising the ticket fails', async () => {
    await workspaceWith([row()])
    epicHolds([])
    mockPool(BASE).post('/rest/api/2/issue').replyWithError('socket hang up')

    const outcome = await start()

    expect({ failedStep: outcome.failedStep, reason: outcome.reason }).toEqual({
      failedStep: 'ticket',
      reason: expect.stringContaining(
        'Jira may have raised it anyway. Check EUDPA under EUDPA-1 for a ticket titled "inc-001 — Add the origin page" before running again'
      )
    })
  })
})

describe('runBuildStart — an increment that already has a ticket', () => {
  test('reuses the ticket on the row and raises none', async () => {
    await workspaceWith([
      row({ ticket: 'EUDPA-77', branch: 'feat/EUDPA-77-origin' })
    ])
    jiraKnows('EUDPA-77', 'In Dev')

    const outcome = await start()

    expect({
      ticket: outcome.ticket,
      branch: outcome.branch
    }).toEqual({
      ticket: {
        key: 'EUDPA-77',
        created: false,
        status: 'In Dev',
        movedToBoard: true,
        warnings: []
      },
      branch: 'feat/EUDPA-77-origin'
    })
  })

  test('leaves a Done ticket alone and warns that the backlog disagrees', async () => {
    await workspaceWith([row({ ticket: 'EUDPA-77' })])
    jiraKnows('EUDPA-77', 'Done')

    const outcome = await start()

    expect(outcome.warnings).toEqual([
      'EUDPA-77 is already Done, but inc-001 is not done in the backlog. A human needs to look at that mismatch.'
    ])
  })

  test('says the ticket on the row does not exist', async () => {
    await workspaceWith([row({ ticket: 'EUDPA-404' })])
    mockPool(BASE).get('/rest/api/2/issue/EUDPA-404').reply(404, {})

    const outcome = await start()

    expect({ failedStep: outcome.failedStep, reason: outcome.reason }).toEqual({
      failedStep: 'ticket',
      reason:
        'EUDPA-404 is the ticket on inc-001, but getTicket(EUDPA-404): not found.'
    })
  })

  test('resumes from the backlog fields, not the ticket', async () => {
    await workspaceWith([
      row({
        ticket: 'EUDPA-77',
        commit: 'abc1234',
        prs: [{ url: 'https://x/1' }]
      })
    ])
    jiraKnows('EUDPA-77', 'In Dev')

    const outcome = await start()

    expect(outcome.resumeAt).toBe('ci')
  })
})

describe('runBuildStart — derive', () => {
  test('makes no Jira call when nothing is buildable', async () => {
    await workspaceWith([row({ status: 'done' })])

    const outcome = await start({ jira: noJira })

    expect({ id: outcome.id, failedStep: outcome.failedStep }).toEqual({
      id: null,
      failedStep: null
    })
  })

  test('stops before the ticket when the next increment is the one the last attempt built', async () => {
    await workspaceWith([row()])

    const outcome = await start({ jira: noJira, last: 'inc-001' })

    expect({
      id: outcome.id,
      repeat: outcome.repeat,
      ticket: outcome.ticket
    }).toEqual({
      id: 'inc-001',
      repeat: true,
      ticket: null
    })
  })

  test('fails the derive step for an id the backlog does not have', async () => {
    await workspaceWith([row()])

    const outcome = await start({ jira: noJira, id: 'inc-999' })

    expect({ failedStep: outcome.failedStep, reason: outcome.reason }).toEqual({
      failedStep: 'derive',
      reason: `Can't find inc-999 in ${backlogPath()}.`
    })
  })
})

describe('runBuildStart — branch', () => {
  test('branches a row that names no repos in the caller’s repo order, not the envelope’s', async () => {
    await workspaceWith([row({ ticket: 'EUDPA-77', repos: undefined })])
    jiraKnows('EUDPA-77', 'In Dev')

    const outcome = await start({
      config: { ...CONFIG, repoOrder: ['frontend', 'backend'] }
    })

    expect(outcome.repos).toEqual(['frontend', 'backend'])
  })

  test('fails the branch step on a repo with uncommitted work, keeping the ticket', async () => {
    await workspaceWith([row({ ticket: 'EUDPA-77' })])
    jiraKnows('EUDPA-77', 'In Dev')
    writeFileSync(join(root, 'repos', 'frontend', 'scratch.txt'), 'x\n')

    const outcome = await start()

    expect({
      failedStep: outcome.failedStep,
      reason: outcome.reason,
      ticket: outcome.ticket.key,
      backend: await branchOf('backend')
    }).toEqual({
      failedStep: 'branch',
      reason: expect.stringContaining('frontend has uncommitted work'),
      ticket: 'EUDPA-77',
      backend: 'main'
    })
  })
})

describe('branchNameFor', () => {
  test('takes its type from the kind and its slug from the title', () => {
    expect(
      branchNameFor(
        {
          kind: 'test-coverage',
          title: '  Cover the CHED-PP / origin page!  '
        },
        'EUDPA-5'
      )
    ).toBe('chore/EUDPA-5-cover-the-ched-pp-origin-page')
  })

  test('makes a bug a fix', () => {
    expect(branchNameFor({ kind: 'bug', title: 'x' }, 'EUDPA-5')).toBe(
      'fix/EUDPA-5-x'
    )
  })

  test('cuts the slug to 40 characters without a trailing hyphen', () => {
    expect(
      branchNameFor(
        { title: 'abcdefghij abcdefghij abcdefghij abcdef ghij' },
        'EUDPA-5'
      )
    ).toBe('feat/EUDPA-5-abcdefghij-abcdefghij-abcdefghij-abcdef')
  })
})

describe('resumePointFor', () => {
  test('is done when every pull request has merged', () => {
    expect(resumePointFor({ prs: [{ url: 'a', merged: true }] })).toBe('done')
  })

  test('is pr when a commit is recorded and no pull request is', () => {
    expect(resumePointFor({ commit: 'abc', prs: [] })).toBe('pr')
  })

  test('is build for a row with nothing recorded', () => {
    expect(resumePointFor({})).toBe('build')
  })
})

describe('incrementReposFor', () => {
  const LEGACY = ['frontend', 'backend', 'tests']

  test('takes a row’s repos as written under other keys', () => {
    expect(
      incrementReposFor({ repos: ['stub', 'perftests'] }, ['perftests', 'stub'])
    ).toEqual(['stub', 'perftests'])
  })

  test('adds the tests repo to a frontend change and orders backend, tests, frontend', () => {
    expect(
      incrementReposFor({ repos: ['frontend', 'backend'] }, LEGACY)
    ).toEqual(['backend', 'tests', 'frontend'])
  })

  test('reads an older row’s repo of both as all three', () => {
    expect(incrementReposFor({ repo: 'both' }, LEGACY)).toEqual([
      'backend',
      'tests',
      'frontend'
    ])
  })

  test('falls back to every configured repo when the row names none', () => {
    expect(incrementReposFor({}, ['perftests', 'stub'])).toEqual([
      'perftests',
      'stub'
    ])
  })
})
