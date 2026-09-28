import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  installHttpMocks,
  closeHttpMocks
} from '../../test-support/http-mock.js'
import {
  runCreate,
  renderCreatePlan,
  renderCreated,
  CREATED_FILE
} from './create.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const BASE = 'https://example.atlassian.net'

const validManifest = (overrides = {}) => ({
  schema: 'tim-ticket/1',
  project: 'EUDPA',
  type: 'Story',
  summary: 'Let importers save transporters they use a lot',
  descriptionFile: 'description.txt',
  labels: ['UCD'],
  attachments: [],
  relates: [],
  ...overrides
})

let workDir
let mockPool
let originalEnv

beforeEach(() => {
  originalEnv = { ...process.env }
  process.env.JIRA_USER = 'sam'
  process.env.JIRA_TOKEN = 'token'
  process.env.JIRA_BASE_URL = BASE
  workDir = mkdtempSync(join(tmpdir(), 'tim-jira-create-'))
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  process.env = originalEnv
  closeHttpMocks()
  rmSync(workDir, { recursive: true, force: true })
})

const writeManifest = ({
  description = 'A clean description.',
  manifest = {}
} = {}) => {
  writeFileSync(join(workDir, 'description.txt'), description)
  const manifestPath = join(workDir, 'ticket.json')
  writeFileSync(manifestPath, JSON.stringify(validManifest(manifest)))
  return manifestPath
}

describe('runCreate — dry run', () => {
  test('makes zero HTTP requests and returns a plan with a plan id', async () => {
    const manifestPath = writeManifest()
    const result = await runCreate({ fromPath: manifestPath })
    expect(result.mode).toBe('dry-run')
    expect(result.planId).toMatch(/^[0-9a-f]{64}$/)
    expect(result.fields.project).toEqual({ key: 'EUDPA' })
    expect(result.fields.description).toBe('A clean description.')
  })

  test('warns about a leftover placeholder in the description', async () => {
    const manifestPath = writeManifest({
      description: 'Body text [Welsh needed] more text.'
    })
    const result = await runCreate({ fromPath: manifestPath })
    expect(result.warnings.some((w) => w.includes('[Welsh needed]'))).toBe(true)
  })

  test('renders the plan as text with the plan id and a confirm hint', () => {
    const plan = {
      planId: 'a'.repeat(64),
      fields: {
        project: { key: 'EUDPA' },
        issuetype: { name: 'Story' },
        summary: 'x',
        labels: ['UCD']
      },
      attachments: [],
      warnings: []
    }
    const text = renderCreatePlan(plan)
    expect(text).toContain(plan.planId)
    expect(text).toContain('dry run')
    expect(text).toContain(`--confirm ${plan.planId}`)
  })
})

describe('runCreate — --confirm drift detection', () => {
  test('throws USAGE before any request when the description changed since the check', async () => {
    const manifestPath = writeManifest()
    const { planId } = await runCreate({ fromPath: manifestPath })

    writeFileSync(
      join(workDir, 'description.txt'),
      'A different description entirely.'
    )

    await expect(
      runCreate({ fromPath: manifestPath, confirmPlanId: planId })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringContaining('changed since you checked it')
    })
  })

  test('throws USAGE before any request when an attachment changed since the check', async () => {
    writeFileSync(join(workDir, 'screenshot.png'), 'original-bytes')
    const manifestPath = writeManifest({
      manifest: { attachments: ['screenshot.png'] }
    })
    const { planId } = await runCreate({ fromPath: manifestPath })

    writeFileSync(join(workDir, 'screenshot.png'), 'changed-bytes')

    await expect(
      runCreate({ fromPath: manifestPath, confirmPlanId: planId })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringContaining('changed since you checked it')
    })
  })
})

describe('runCreate — success', () => {
  test('creates the issue, attaches files, links relates, and writes the receipt', async () => {
    writeFileSync(join(workDir, 'screenshot.png'), 'fake-png-bytes')
    const manifestPath = writeManifest({
      manifest: { attachments: ['screenshot.png'], relates: ['EUDPA-1'] }
    })
    const { planId } = await runCreate({ fromPath: manifestPath })

    mockPool(BASE)
      .post('/rest/api/2/issue')
      .reply(201, {
        id: '100001',
        key: 'EUDPA-999',
        self: `${BASE}/rest/api/2/issue/100001`
      })
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-999/attachments')
      .reply(200, [
        {
          id: '1',
          filename: 'screenshot.png',
          size: 14,
          created: '2026-09-28T10:00:00.000Z'
        }
      ])
    mockPool(BASE).post('/rest/api/2/issueLink').reply(201, {})

    const result = await runCreate({
      fromPath: manifestPath,
      confirmPlanId: planId
    })

    expect(result.mode).toBe('created')
    expect(result.key).toBe('EUDPA-999')
    expect(result.url).toBe(`${BASE}/browse/EUDPA-999`)
    expect(result.attachments).toEqual([
      expect.objectContaining({
        filename: 'screenshot.png',
        status: 'attached'
      })
    ])
    expect(result.relates).toEqual(['EUDPA-1'])
    expect(result.partialFailure).toBe(false)

    const receipt = JSON.parse(
      readFileSync(join(workDir, CREATED_FILE), 'utf8')
    )
    expect(receipt.key).toBe('EUDPA-999')
    expect(receipt.planId).toBe(planId)
  })

  test('exits with a partial-failure result when an attachment fails, and still writes the receipt', async () => {
    writeFileSync(join(workDir, 'screenshot.png'), 'fake-png-bytes')
    const manifestPath = writeManifest({
      manifest: { attachments: ['screenshot.png'] }
    })
    const { planId } = await runCreate({ fromPath: manifestPath })

    mockPool(BASE)
      .post('/rest/api/2/issue')
      .reply(201, {
        id: '2',
        key: 'EUDPA-501',
        self: `${BASE}/rest/api/2/issue/2`
      })
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-501/attachments')
      .reply(404, {})

    const result = await runCreate({
      fromPath: manifestPath,
      confirmPlanId: planId
    })

    expect(result.partialFailure).toBe(true)
    expect(result.attachments[0].status).toBe('failed')
    const receipt = JSON.parse(
      readFileSync(join(workDir, CREATED_FILE), 'utf8')
    )
    expect(receipt.attachments[0].status).toBe('failed')
  })

  test('refuses a second create from the same manifest, naming the existing key', async () => {
    const manifestPath = writeManifest()
    const { planId } = await runCreate({ fromPath: manifestPath })

    mockPool(BASE)
      .post('/rest/api/2/issue')
      .reply(201, {
        id: '3',
        key: 'EUDPA-500',
        self: `${BASE}/rest/api/2/issue/3`
      })

    await runCreate({ fromPath: manifestPath, confirmPlanId: planId })

    await expect(
      runCreate({ fromPath: manifestPath, confirmPlanId: planId })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringContaining('EUDPA-500')
    })
  })
})

describe('renderCreated', () => {
  test('lists attachments and relates, and flags a partial failure', () => {
    const text = renderCreated({
      key: 'EUDPA-999',
      url: `${BASE}/browse/EUDPA-999`,
      attachments: [{ filename: 'a.png', status: 'failed' }],
      relates: ['EUDPA-1'],
      partialFailure: true
    })
    expect(text).toContain('EUDPA-999')
    expect(text).toContain('a.png (failed)')
    expect(text).toContain('EUDPA-1')
    expect(text).toContain('Some attachments failed')
  })
})

describe('tim jira create --json (spawn)', () => {
  let cliWorkDir

  beforeEach(() => {
    cliWorkDir = mkdtempSync(join(tmpdir(), 'tim-jira-create-cli-'))
  })

  afterEach(() => {
    rmSync(cliWorkDir, { recursive: true, force: true })
  })

  test('a dry run prints an ok envelope with a plan id, with no Jira credentials set', async () => {
    writeFileSync(join(cliWorkDir, 'description.txt'), 'Plain description.')
    writeFileSync(
      join(cliWorkDir, 'ticket.json'),
      JSON.stringify(validManifest())
    )

    const { stdout, exitCode } = await execa(
      'node',
      [
        cliPath,
        'jira',
        'create',
        '--from',
        join(cliWorkDir, 'ticket.json'),
        '--json'
      ],
      {
        reject: false,
        env: {
          ...process.env,
          JIRA_USER: '',
          JIRA_TOKEN: '',
          JIRA_BASE_URL: ''
        }
      }
    )

    expect(exitCode).toBe(0)
    const payload = JSON.parse(stdout.trim())
    expect(payload).toMatchObject({
      ok: true,
      schema_version: 1,
      result: { mode: 'dry-run' }
    })
    expect(payload.result.planId).toMatch(/^[0-9a-f]{64}$/)
  })
})
