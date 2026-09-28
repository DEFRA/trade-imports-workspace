import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  installHttpMocks,
  closeHttpMocks
} from '../../test-support/http-mock.js'
import { runEpics, renderEpics, parseEpicsOptions } from './epics.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const BASE = 'https://example.atlassian.net'

let mockPool
let originalEnv

beforeEach(() => {
  originalEnv = { ...process.env }
  process.env.JIRA_USER = 'sam'
  process.env.JIRA_TOKEN = 'token'
  process.env.JIRA_BASE_URL = BASE
  delete process.env.JIRA_PROJECT_KEY
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  process.env = originalEnv
  closeHttpMocks()
})

describe('parseEpicsOptions', () => {
  test('uses --project when given', () => {
    expect(parseEpicsOptions({ project: 'EUDPA' })).toEqual({
      project: 'EUDPA'
    })
  })

  test('falls back to JIRA_PROJECT_KEY when --project is not given', () => {
    process.env.JIRA_PROJECT_KEY = 'EUDPA'
    expect(parseEpicsOptions({})).toEqual({ project: 'EUDPA' })
  })

  test('throws USAGE when neither is set', () => {
    expect(() => parseEpicsOptions({})).toThrowError(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})

describe('runEpics', () => {
  test('returns the project and its open epics', async () => {
    mockPool(BASE)
      .get(/^\/rest\/api\/3\/search\/jql/)
      .reply(200, {
        issues: [
          { key: 'EUDPA-100', fields: { summary: 'Designer prototyping' } }
        ]
      })

    const result = await runEpics({ project: 'EUDPA' })
    expect(result).toEqual({
      project: 'EUDPA',
      epics: [{ key: 'EUDPA-100', summary: 'Designer prototyping' }]
    })
  })
})

describe('renderEpics', () => {
  test('lists key and summary per epic', () => {
    const text = renderEpics({
      project: 'EUDPA',
      epics: [{ key: 'EUDPA-100', summary: 'Designer prototyping' }]
    })
    expect(text).toBe('EUDPA-100  Designer prototyping')
  })

  test('says when there are none', () => {
    expect(renderEpics({ project: 'EUDPA', epics: [] })).toBe(
      'No open epics in EUDPA.'
    )
  })
})

describe('tim jira epics --json (spawn)', () => {
  test('emits an ok:false envelope with an AUTH error when no Jira credentials are set', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'jira', 'epics', '--project', 'EUDPA', '--json'],
      {
        reject: false,
        env: {
          ...process.env,
          JIRA_USER: '',
          JIRA_TOKEN: '',
          JIRA_BASE_URL: '',
          JIRA_PROJECT_KEY: ''
        }
      }
    )

    // AUTH isn't in envelope.js's USAGE/NOT_FOUND/LOST_UPDATE/LOCKED map, so
    // it falls through to the generic "a run that failed" exit code (1) —
    // unlike the read-only jira commands, which map AUTH to exit 2 via
    // their own `_client-action.js` helper.
    expect(exitCode).toBe(1)
    const payload = JSON.parse(stdout.trim())
    expect(payload).toMatchObject({
      ok: false,
      schema_version: 1,
      result: null,
      errors: [{ code: 'AUTH' }]
    })
  })
})
