import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  installHttpMocks,
  closeHttpMocks
} from '../../test-support/http-mock.js'
import {
  parseTransitionArgs,
  renderTransition,
  runTransition
} from './transition.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const fixturesDir = join(here, '..', '..', 'test-support', 'fixtures', 'jira')
const loadFixture = (name) =>
  JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'))
const BASE = 'https://example.atlassian.net'
const ISSUE = '/rest/api/2/issue/EUDPA-300'

let mockPool
let originalEnv

beforeEach(() => {
  originalEnv = { ...process.env }
  process.env.JIRA_USER = 'sam'
  process.env.JIRA_TOKEN = 'token'
  process.env.JIRA_BASE_URL = BASE
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  process.env = originalEnv
  closeHttpMocks()
})

const issueIn = (status) => {
  const issue = loadFixture('issue-in-dev.json')
  return { ...issue, fields: { ...issue.fields, status: { name: status } } }
}

const ticketReads = (...statuses) =>
  statuses.forEach((status) =>
    mockPool(BASE).get(ISSUE).reply(200, issueIn(status))
  )

const offersTransitions = (body = loadFixture('list-transitions.json')) =>
  mockPool(BASE).get(`${ISSUE}/transitions`).reply(200, body)

const acceptsTransition = () => {
  const posted = { body: null }
  mockPool(BASE)
    .post(`${ISSUE}/transitions`, (body) => {
      posted.body = body
      return true
    })
    .reply(204)
  return posted
}

describe('parseTransitionArgs', () => {
  test('takes a key and a status', () => {
    expect(parseTransitionArgs({ key: 'EUDPA-300', status: ' Done ' })).toEqual(
      { key: 'EUDPA-300', status: 'Done', list: false }
    )
  })

  test('takes a key with --list and no status', () => {
    expect(parseTransitionArgs({ key: 'EUDPA-300', list: true })).toEqual({
      key: 'EUDPA-300',
      list: true
    })
  })

  test('refuses a key that is not a Jira key', () => {
    expect(() =>
      parseTransitionArgs({ key: 'eudpa 300', status: 'Done' })
    ).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give a Jira ticket key, for example EUDPA-200.'
      })
    )
  })

  test('refuses a key with neither a status nor --list', () => {
    expect(() => parseTransitionArgs({ key: 'EUDPA-300' })).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message:
          'Give the status to move EUDPA-300 to, or --list to see the transitions it offers.'
      })
    )
  })
})

describe('runTransition', () => {
  test('moves the ticket to the status and confirms it landed', async () => {
    ticketReads('In Dev', 'Done')
    offersTransitions()
    const posted = acceptsTransition()

    const result = await runTransition({ key: 'EUDPA-300', status: 'Done' })

    expect({ result, posted: posted.body }).toEqual({
      result: {
        key: 'EUDPA-300',
        action: 'moved',
        status: 'Done',
        previousStatus: 'In Dev',
        requested: 'Done',
        transition: 'Done'
      },
      posted: { transition: { id: '31' } }
    })
  })

  test('succeeds without moving a ticket already in the status', async () => {
    ticketReads('Done')

    const result = await runTransition({ key: 'EUDPA-300', status: 'Done' })

    expect(result).toEqual({
      key: 'EUDPA-300',
      action: 'unchanged',
      status: 'Done',
      previousStatus: 'Done',
      requested: 'Done',
      transition: null
    })
  })

  test('accepts a transition name, as the shell script did', async () => {
    ticketReads('To Do', 'In Dev')
    offersTransitions()
    acceptsTransition()

    const result = await runTransition({
      key: 'EUDPA-300',
      status: 'Start work'
    })

    expect(result).toMatchObject({
      action: 'moved',
      status: 'In Dev',
      requested: 'Start work',
      transition: 'Start work'
    })
  })

  test('fails with the transitions the ticket offers when none leads to the status', async () => {
    ticketReads('In Dev')
    offersTransitions()

    await expect(
      runTransition({ key: 'EUDPA-300', status: 'Closed' })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'EUDPA-300 is In Dev and offers no transition to "Closed". The board offers (transition -> status): Start work -> In Dev, Done -> Done.'
    })
  })

  test('fails when Jira accepts the move but the ticket has not changed', async () => {
    ticketReads('In Dev', 'In Dev')
    offersTransitions()
    acceptsTransition()

    await expect(
      runTransition({ key: 'EUDPA-300', status: 'Done' })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'Jira accepted the move to Done, but EUDPA-300 is still In Dev. Check the ticket in Jira.'
    })
  })

  test('lists the transitions with --list and moves nothing', async () => {
    ticketReads('In Dev')
    offersTransitions()

    const result = await runTransition({ key: 'EUDPA-300', list: true })

    expect(result).toEqual({
      key: 'EUDPA-300',
      action: 'listed',
      status: 'In Dev',
      transitions: [
        { id: '11', name: 'Start work', to: 'In Dev' },
        { id: '31', name: 'Done', to: 'Done' }
      ]
    })
  })
})

describe('renderTransition', () => {
  test('says where a moved ticket came from and went to', () => {
    expect(
      renderTransition({
        key: 'EUDPA-300',
        action: 'moved',
        status: 'Done',
        previousStatus: 'In Dev',
        requested: 'Done',
        transition: 'Done'
      })
    ).toBe('Moved EUDPA-300 from In Dev to Done.')
  })

  test('notes when the name given was a transition rather than the status', () => {
    expect(
      renderTransition({
        key: 'EUDPA-300',
        action: 'moved',
        status: 'In Dev',
        previousStatus: 'To Do',
        requested: 'Start work',
        transition: 'Start work'
      })
    ).toBe(
      'Moved EUDPA-300 from To Do to In Dev.\n"Start work" is a transition, so EUDPA-300 is now In Dev.'
    )
  })

  test('says nothing changed for a ticket already in the status', () => {
    expect(
      renderTransition({
        key: 'EUDPA-300',
        action: 'unchanged',
        status: 'Done',
        previousStatus: 'Done',
        requested: 'Done',
        transition: null
      })
    ).toBe('EUDPA-300 is already Done. Nothing changed.')
  })

  test('lists each transition with the status it leads to', () => {
    expect(
      renderTransition({
        key: 'EUDPA-300',
        action: 'listed',
        status: 'In Dev',
        transitions: [
          { id: '11', name: 'Start work', to: 'In Dev' },
          { id: '31', name: 'Done', to: 'Done' }
        ]
      })
    ).toBe(
      [
        'EUDPA-300 is In Dev. It offers these transitions (transition -> the status it leads to):',
        '  - Start work -> In Dev',
        '  - Done -> Done'
      ].join('\n')
    )
  })

  test('says when the ticket offers no transitions', () => {
    expect(
      renderTransition({
        key: 'EUDPA-300',
        action: 'listed',
        status: 'Done',
        transitions: []
      })
    ).toBe('EUDPA-300 is Done. It offers no transitions.')
  })
})

describe('tim jira transition (spawn)', () => {
  const spawnTim = (args, env = {}) =>
    execa('node', [cliPath, 'jira', 'transition', ...args], {
      reject: false,
      env: { ...process.env, ...env }
    })

  test('exits 2 with a USAGE envelope when neither a status nor --list is given', async () => {
    const { stdout, exitCode } = await spawnTim(['EUDPA-300', '--json'])

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 2,
      payload: {
        ok: false,
        schema_version: 1,
        result: null,
        errors: [
          {
            code: 'USAGE',
            message:
              'Give the status to move EUDPA-300 to, or --list to see the transitions it offers.'
          }
        ]
      }
    })
  })

  test('emits an AUTH envelope when no Jira credentials are set', async () => {
    const { stdout, exitCode } = await spawnTim(
      ['EUDPA-300', 'Done', '--json'],
      { JIRA_USER: '', JIRA_TOKEN: '', JIRA_BASE_URL: '' }
    )

    expect({ exitCode, payload: JSON.parse(stdout.trim()) }).toMatchObject({
      exitCode: 1,
      payload: { ok: false, errors: [{ code: 'AUTH' }] }
    })
  })

  test('accepts --workspace, as the build loop passes it', async () => {
    const { stdout } = await spawnTim(
      ['EUDPA-300', '--list', '--workspace', here, '--json'],
      { JIRA_USER: '', JIRA_TOKEN: '', JIRA_BASE_URL: '' }
    )

    expect(JSON.parse(stdout.trim())).toMatchObject({
      ok: false,
      errors: [{ code: 'AUTH' }]
    })
  })

  test('shows both forms in --help', async () => {
    const { stdout } = await spawnTim(['--help'])

    expect(stdout).toContain(
      [
        'Examples:',
        '  tim jira transition EUDPA-200 "Done" --json',
        '  tim jira transition EUDPA-200 --list'
      ].join('\n')
    )
  })
})
