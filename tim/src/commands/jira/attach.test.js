import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { runAttach, renderAttachResult, parseAttachOptions } from './attach.js'

const jira = mockJiraForEachTest()

let workDir

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'tim-jira-attach-'))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const filesInWorkDir = (...names) =>
  names.map((name) => {
    const path = join(workDir, name)
    writeFileSync(path, name)
    return path
  })

const issueAlreadyHas = (filename) =>
  jira()
    .get('/rest/api/2/issue/EUDPA-200?fields=attachment')
    .reply(200, {
      fields: {
        attachment: [{ id: '1', filename, size: 1, created: 'now' }]
      }
    })

const acceptsUpload = (id, filename) =>
  jira()
    .post('/rest/api/2/issue/EUDPA-200/attachments')
    .reply(200, [{ id, filename, size: 1, created: 'now' }])

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
    const [existing, added] = filesInWorkDir('existing.png', 'new.png')
    issueAlreadyHas('existing.png')

    const result = await runAttach({
      key: 'EUDPA-200',
      filePaths: [existing, added],
      confirm: false,
      replace: false
    })

    expect(result.mode).toBe('dry-run')
    expect(result.planned).toEqual([
      { path: existing, filename: 'existing.png', skip: true },
      { path: added, filename: 'new.png', skip: false }
    ])
  })

  test('--confirm uploads only the files not already there', async () => {
    const [existing, added] = filesInWorkDir('existing.png', 'new.png')
    issueAlreadyHas('existing.png')
    acceptsUpload('2', 'new.png')

    const result = await runAttach({
      key: 'EUDPA-200',
      filePaths: [existing, added],
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
    const [existing] = filesInWorkDir('existing.png')
    issueAlreadyHas('existing.png')
    acceptsUpload('3', 'existing.png')

    const result = await runAttach({
      key: 'EUDPA-200',
      filePaths: [existing],
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
