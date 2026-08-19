import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { EXTRACTOR, capturePageModel, stable } from './page-model.js'
import { parsePageModel } from '../page-model-schema.js'

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tim-capture-model-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const model = {
  url: '/notifications/9f1c2b30-4a5e-11ef-9c2d-0242ac120002/tasks',
  title: 'Tasks',
  h1: 'Your notification',
  headings: [{ level: 'h1', text: 'Your notification' }],
  allFields: [{ kind: 'input:text', name: 'reference' }],
  summaryRows: [
    {
      key: 'Reference',
      value: 'GBN-GB-26-A1B2C3',
      source: 'govuk-summary-list'
    }
  ],
  taskItems: [{ title: 'Origin', href: '/origin', status: 'Completed' }],
  links: [{ text: 'Origin', href: '/origin' }]
}

describe('stable', () => {
  test('replaces the generated notification reference', () => {
    expect(stable(model)).toContain('GBN-XX-00-REFERENCE')
    expect(stable(model)).not.toContain('GBN-GB-26-A1B2C3')
  })

  test('replaces every UUID, wherever it appears', () => {
    expect(stable(model)).toContain('/notifications/UUID/tasks')
  })

  test('gives two runs of the same page identical text', () => {
    const second = JSON.parse(
      JSON.stringify(model).replace(
        '9f1c2b30-4a5e-11ef-9c2d-0242ac120002',
        '00000000-1111-2222-3333-444444444444'
      )
    )
    expect(stable(second)).toBe(stable(model))
  })

  test('leaves everything else exactly as it was', () => {
    expect(JSON.parse(stable(model)).h1).toBe('Your notification')
  })
})

describe('capturePageModel', () => {
  // The page is the browser boundary, so the test drives it through a stand-in
  // that returns what the extractor would have returned.
  const page = { evaluate: async (fn) => (fn === EXTRACTOR ? model : null) }

  test('writes the normalised model under the screen id', async () => {
    const result = await capturePageModel(page, 'fe-hub', dir)
    expect(result.file).toBe(join(dir, 'fe-hub.json'))
    expect(readFileSync(result.file, 'utf8')).toBe(`${stable(model)}\n`)
  })

  test('creates the model directory when nothing has written there yet', async () => {
    const nested = join(dir, 'deep', 'model')
    const result = await capturePageModel(page, 'fe-hub', nested)
    expect(readFileSync(result.file, 'utf8')).toContain('Your notification')
  })

  test('reports the counts the manifest row carries', async () => {
    const result = await capturePageModel(page, 'fe-hub', dir)
    expect(result).toMatchObject({ fields: 1, headings: 1 })
  })

  test('writes a model the shared schema accepts', async () => {
    const { file } = await capturePageModel(page, 'fe-hub', dir)
    expect(() =>
      parsePageModel(JSON.parse(readFileSync(file, 'utf8')), 'frontend/fe-hub')
    ).not.toThrow()
  })
})

describe('EXTRACTOR', () => {
  test('closes over nothing, so Playwright can serialise it into the page', () => {
    expect(String(EXTRACTOR)).not.toMatch(/\brequire\(|\bimport\b/)
  })
})
