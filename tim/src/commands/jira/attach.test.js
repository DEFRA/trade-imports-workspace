import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  installHttpMocks,
  closeHttpMocks
} from '../../test-support/http-mock.js'
import { runAttach, renderAttachResult, parseAttachOptions } from './attach.js'

const BASE = 'https://example.atlassian.net'

let workDir
let mockPool
let originalEnv

beforeEach(() => {
  originalEnv = { ...process.env }
  process.env.JIRA_USER = 'sam'
  process.env.JIRA_TOKEN = 'token'
  process.env.JIRA_BASE_URL = BASE
  workDir = mkdtempSync(join(tmpdir(), 'tim-jira-attach-'))
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  process.env = originalEnv
  closeHttpMocks()
  rmSync(workDir, { recursive: true, force: true })
})

describe('parseAttachOptions', () => {
  test('defaults confirm and replace to false', () => {
    expect(parseAttachOptions({})).toEqual({ confirm: false, replace: false })
  })
})

describe('runAttach', () => {
  test('throws USAGE when no file is named', async () => {
    await expect(
      runAttach({
        key: 'EUDPA-200',
        filePaths: [],
        confirm: false,
        replace: false
      })
    ).rejects.toMatchObject({ code: 'USAGE' })
  })

  test('dry run skips a filename already on the issue', async () => {
    writeFileSync(join(workDir, 'existing.png'), 'x')
    writeFileSync(join(workDir, 'new.png'), 'y')
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=attachment')
      .reply(200, {
        fields: {
          attachment: [
            { id: '1', filename: 'existing.png', size: 1, created: 'now' }
          ]
        }
      })

    const result = await runAttach({
      key: 'EUDPA-200',
      filePaths: [join(workDir, 'existing.png'), join(workDir, 'new.png')],
      confirm: false,
      replace: false
    })

    expect(result.mode).toBe('dry-run')
    expect(result.planned).toEqual([
      {
        path: join(workDir, 'existing.png'),
        filename: 'existing.png',
        skip: true
      },
      { path: join(workDir, 'new.png'), filename: 'new.png', skip: false }
    ])
  })

  test('--confirm uploads only the files not already there', async () => {
    writeFileSync(join(workDir, 'existing.png'), 'x')
    writeFileSync(join(workDir, 'new.png'), 'y')
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=attachment')
      .reply(200, {
        fields: {
          attachment: [
            { id: '1', filename: 'existing.png', size: 1, created: 'now' }
          ]
        }
      })
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-200/attachments')
      .reply(200, [{ id: '2', filename: 'new.png', size: 1, created: 'now' }])

    const result = await runAttach({
      key: 'EUDPA-200',
      filePaths: [join(workDir, 'existing.png'), join(workDir, 'new.png')],
      confirm: true,
      replace: false
    })

    expect(result.mode).toBe('attached')
    expect(result.skipped).toEqual(['existing.png'])
    expect(result.attached).toEqual([
      expect.objectContaining({ filename: 'new.png', status: 'attached' })
    ])
    expect(result.partialFailure).toBe(false)
  })

  test('--replace re-uploads a file even when the same filename is already there', async () => {
    writeFileSync(join(workDir, 'existing.png'), 'x')
    mockPool(BASE)
      .get('/rest/api/2/issue/EUDPA-200?fields=attachment')
      .reply(200, {
        fields: {
          attachment: [
            { id: '1', filename: 'existing.png', size: 1, created: 'now' }
          ]
        }
      })
    mockPool(BASE)
      .post('/rest/api/2/issue/EUDPA-200/attachments')
      .reply(200, [
        { id: '3', filename: 'existing.png', size: 1, created: 'now' }
      ])

    const result = await runAttach({
      key: 'EUDPA-200',
      filePaths: [join(workDir, 'existing.png')],
      confirm: true,
      replace: true
    })

    expect(result.skipped).toEqual([])
    expect(result.attached).toEqual([
      expect.objectContaining({ filename: 'existing.png', status: 'attached' })
    ])
  })
})

describe('renderAttachResult', () => {
  test('marks a skipped file in the dry-run plan', () => {
    const text = renderAttachResult({
      mode: 'dry-run',
      key: 'EUDPA-200',
      planned: [{ path: '/x/a.png', filename: 'a.png', skip: true }]
    })
    expect(text).toContain('a.png (already there — skipped)')
    expect(text).toContain('dry run')
  })

  test('lists what attached and what was skipped', () => {
    const text = renderAttachResult({
      mode: 'attached',
      key: 'EUDPA-200',
      attached: [{ filename: 'a.png', status: 'attached' }],
      skipped: ['b.png'],
      partialFailure: false
    })
    expect(text).toContain('a.png (attached)')
    expect(text).toContain('Skipped (already there): b.png')
  })
})
