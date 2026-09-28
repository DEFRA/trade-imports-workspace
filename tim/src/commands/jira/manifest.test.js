import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadManifest, manifestSchema, MANIFEST_SCHEMA } from './manifest.js'

const validManifest = () => ({
  schema: MANIFEST_SCHEMA,
  project: 'EUDPA',
  type: 'Story',
  summary: 'Let importers save transporters they use a lot',
  descriptionFile: 'description.txt',
  labels: ['UCD'],
  attachments: [],
  relates: []
})

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-jira-manifest-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const writeManifestFile = (body) => {
  const manifestPath = join(dir, 'ticket.json')
  writeFileSync(manifestPath, JSON.stringify(body))
  return manifestPath
}

describe('manifestSchema', () => {
  test('accepts a well-formed manifest and defaults the array fields', () => {
    const result = manifestSchema.safeParse({
      schema: MANIFEST_SCHEMA,
      project: 'EUDPA',
      type: 'Task',
      summary: 'x',
      descriptionFile: 'description.txt'
    })
    expect(result.success).toBe(true)
    expect(result.data.labels).toEqual([])
    expect(result.data.attachments).toEqual([])
    expect(result.data.relates).toEqual([])
  })

  test('refuses a schema value other than tim-ticket/1', () => {
    const result = manifestSchema.safeParse({
      ...validManifest(),
      schema: 'tim-ticket/2'
    })
    expect(result.success).toBe(false)
  })

  test('refuses a type outside Story, Task, Bug', () => {
    const result = manifestSchema.safeParse({
      ...validManifest(),
      type: 'Epic'
    })
    expect(result.success).toBe(false)
  })

  test('refuses a summary over 255 characters', () => {
    const result = manifestSchema.safeParse({
      ...validManifest(),
      summary: 'x'.repeat(256)
    })
    expect(result.success).toBe(false)
  })
})

describe('loadManifest', () => {
  test('reads and validates a manifest, returning its directory', () => {
    const manifestPath = writeManifestFile(validManifest())
    const { manifest, dir: manifestDir } = loadManifest(manifestPath)
    expect(manifest.project).toBe('EUDPA')
    expect(manifestDir).toBe(dir)
  })

  test('throws USAGE naming the path when the manifest is missing', () => {
    expect(() => loadManifest(join(dir, 'missing.json'))).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('missing.json')
      })
    )
  })

  test('throws USAGE when the file is not valid JSON', () => {
    const manifestPath = join(dir, 'ticket.json')
    writeFileSync(manifestPath, 'not json')
    expect(() => loadManifest(manifestPath)).toThrowError(
      expect.objectContaining({ code: 'USAGE' })
    )
  })

  test('throws USAGE with the first schema issue when validation fails', () => {
    const manifestPath = writeManifestFile({ ...validManifest(), type: 'Epic' })
    expect(() => loadManifest(manifestPath)).toThrowError(
      expect.objectContaining({ code: 'USAGE' })
    )
  })
})
