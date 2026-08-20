import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { captureContext, recorder } from './spec.js'
import { MASK_VOLATILE_IN_PAGE } from './screens.js'

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  delete process.env.TIM_CAPTURE_CONTEXT
  vi.restoreAllMocks()
})

const writeContext = (extra = {}) => {
  const captureDir = join(root, 'evidence', 'prototype@abc12345')
  const modelDir = join(root, 'models')
  mkdirSync(captureDir, { recursive: true })
  mkdirSync(modelDir, { recursive: true })

  const context = {
    side: 'prototype',
    captureDir,
    modelDir,
    anchorsPath: join(root, 'anchors.prototype.json'),
    screenPrefix: 'dr1-',
    deviceScaleFactor: 2,
    viewport: { width: 1280, height: 1200 },
    appSha: 'abc12345',
    harnessSha: 'def67890',
    ...extra
  }
  const path = join(root, 'context.json')
  writeFileSync(path, JSON.stringify(context))
  return { path, context }
}

describe('captureContext', () => {
  test('reads the one file of resolved paths tim hands the spec', () => {
    const { path } = writeContext()

    const context = captureContext(path)

    expect(context.side).toBe('prototype')
    expect(context.screenPrefix).toBe('dr1-')
  })

  test('takes the path from the environment when a spec passes none', () => {
    const { path } = writeContext()
    process.env.TIM_CAPTURE_CONTEXT = path

    expect(captureContext().side).toBe('prototype')
  })

  test('loads the anchors for the side, so crops are a data change not a spec edit', () => {
    const { path, context } = writeContext()
    writeFileSync(
      context.anchorsPath,
      JSON.stringify({
        screens: { 'dr1-origin': [{ key: 'field-country', kind: 'field' }] }
      })
    )

    expect(captureContext(path).anchors['dr1-origin']).toHaveLength(1)
  })

  test('has no anchors, rather than failing, on a corpus that declares none', () => {
    const { path } = writeContext()

    expect(captureContext(path).anchors).toEqual({})
  })

  test('says how to run it when a spec is run through Playwright directly', () => {
    expect(() => captureContext(undefined)).toThrow(
      /TIM_CAPTURE_CONTEXT is not set.*tim parity capture/s
    )
  })
})

// A stand-in for the parts of a Playwright page the capture touches. The real
// selectors have their own tests; what matters here is that the recorder puts
// the corpus prefix on, keeps its own rows, and merges rather than overwrites.
const fakePage = () => ({
  evaluate: async (fn) => {
    if (fn === MASK_VOLATILE_IN_PAGE) return { substitutions: 0, values: [] }
    return typeof fn === 'function'
      ? { url: '/origin-of-the-import', allFields: [], headings: [] }
      : undefined
  },
  screenshot: async ({ path }) => {
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, 'png')
  },
  url: () => 'http://localhost:3010/origin-of-the-import',
  title: async () => 'Origin of the import',
  locator: () => ({ count: async () => 0 })
})

describe('recorder', () => {
  test('builds the screen id from the corpus prefix and the name the spec gives', async () => {
    const { context } = writeContext()
    const record = recorder(captureContext(join(root, 'context.json')))

    const row = await record.record(fakePage(), 'origin-of-the-import')

    expect(row.screen).toBe('dr1-origin-of-the-import')
    expect(context.screenPrefix).toBe('dr1-')
  })

  test('writes only what this spec recorded, folded into what other specs left', async () => {
    const { context } = writeContext()
    writeFileSync(
      join(context.captureDir, 'manifest.json'),
      JSON.stringify({ rows: [{ screen: 'dr1-already-here' }] })
    )

    const record = recorder(captureContext(join(root, 'context.json')))
    await record.record(fakePage(), 'origin-of-the-import')
    const path = record.write()

    const screens = JSON.parse(readFileSync(path, 'utf8')).rows.map(
      (row) => row.screen
    )
    expect(screens).toEqual(['dr1-already-here', 'dr1-origin-of-the-import'])
  })

  test('keeps its rows so a spec can assert on what it recorded', async () => {
    const record = recorder(captureContext(writeContext().path))

    await record.record(fakePage(), 'one')
    await record.record(fakePage(), 'two')

    expect(record.rows.map((row) => row.screen)).toEqual(['dr1-one', 'dr1-two'])
  })
})
