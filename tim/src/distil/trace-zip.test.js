import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { compareVersions, recordedPlaywrightVersionOf } from './trace-zip.js'
import { makeZip } from '../test-support/zip-file.js'

const here = dirname(fileURLToPath(import.meta.url))
const journeyTrace = join(
  here,
  '..',
  'capture',
  '__fixtures__',
  'journey-trace.zip'
)

let folder

afterEach(() => {
  if (folder) rmSync(folder, { recursive: true, force: true })
  folder = undefined
})

const zipOf = (files) => {
  folder = mkdtempSync(join(tmpdir(), 'tim-trace-zip-'))
  const path = join(folder, 'trace.zip')
  writeFileSync(path, makeZip(files))
  return path
}

const contextOptions = (playwrightVersion) =>
  `${JSON.stringify({ version: 9, type: 'context-options', playwrightVersion })}\n{"type":"before"}\n`

describe('recordedPlaywrightVersionOf', () => {
  test('reads the version a real recorded trace names in its first event', () => {
    expect(recordedPlaywrightVersionOf(journeyTrace)).toBe('1.62.1')
  })

  test('reads the first context trace of a trace with several', () => {
    const path = zipOf({
      'test.trace': '{"type":"before"}\n',
      '1-trace.trace': contextOptions('1.61.0'),
      '0-trace.trace': contextOptions('1.63.0')
    })

    expect(recordedPlaywrightVersionOf(path)).toBe('1.63.0')
  })

  test('gives null for a trace that records no version', () => {
    const path = zipOf({ 'trace.trace': '{"type":"context-options"}\n' })

    expect(recordedPlaywrightVersionOf(path)).toBeNull()
  })

  test('gives null for a file that is not a zip', () => {
    folder = mkdtempSync(join(tmpdir(), 'tim-trace-zip-'))
    const path = join(folder, 'not-a-zip.zip')
    writeFileSync(path, 'plain text, long enough to search for an end record')

    expect(recordedPlaywrightVersionOf(path)).toBeNull()
  })

  test('gives null for a file that does not exist', () => {
    expect(recordedPlaywrightVersionOf('/no/such/trace.zip')).toBeNull()
  })
})

describe('compareVersions', () => {
  test.each([
    ['1.62.1', '1.63.0', -1],
    ['1.63.0', '1.63.0', 0],
    ['1.63.1', '1.63.0', 1],
    ['2.0.0', '1.99.9', 1]
  ])('compares %s with %s', (left, right, sign) => {
    expect(Math.sign(compareVersions(left, right))).toBe(sign)
  })
})
