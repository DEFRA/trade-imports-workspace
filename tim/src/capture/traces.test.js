import { describe, test, expect, afterEach } from 'vitest'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  copyTraces,
  findTraces,
  refuseExistingCapture,
  writeCaptureFile
} from './traces.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

const seedRun = (testFolders) => {
  root = mkdtempSync(join(tmpdir(), 'tim-capture-traces-'))
  const outputDir = join(root, 'run')
  for (const folder of testFolders) {
    mkdirSync(join(outputDir, folder), { recursive: true })
    writeFileSync(join(outputDir, folder, 'trace.zip'), `trace of ${folder}`)
  }
  return outputDir
}

describe('findTraces', () => {
  test('names each trace after the folder Playwright put it in', () => {
    const outputDir = seedRun([
      'journey-smoke-books-a-lorry',
      'origin-picks-a-country'
    ])

    expect(findTraces(outputDir)).toEqual([
      {
        test: 'journey-smoke-books-a-lorry',
        source: join(outputDir, 'journey-smoke-books-a-lorry', 'trace.zip')
      },
      {
        test: 'origin-picks-a-country',
        source: join(outputDir, 'origin-picks-a-country', 'trace.zip')
      }
    ])
  })

  test('finds a trace a retry nested deeper in the output folder', () => {
    const outputDir = seedRun(['origin-picks-a-country-retry1/attempt'])

    expect(findTraces(outputDir).map(({ test: name }) => name)).toEqual([
      'origin-picks-a-country-retry1--attempt'
    ])
  })

  test('returns nothing when the suite wrote no traces', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-capture-traces-'))

    expect(findTraces(join(root, 'never-ran'))).toEqual([])
  })
})

describe('copyTraces', () => {
  test('copies each trace into the capture folder under its test name', () => {
    const outputDir = seedRun(['journey-smoke-books-a-lorry'])
    const captureDir = join(root, 'capture')

    const copied = copyTraces({ traces: findTraces(outputDir), captureDir })

    expect({ copied, onDisk: readdirSync(captureDir) }).toEqual({
      copied: [
        {
          file: 'journey-smoke-books-a-lorry.zip',
          test: 'journey-smoke-books-a-lorry'
        }
      ],
      onDisk: ['journey-smoke-books-a-lorry.zip']
    })
  })
})

describe('refuseExistingCapture', () => {
  test('refuses when a capture of that commit is already there', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-capture-traces-'))
    const captureDir = join(root, 'traces', 'app', 'abc123')
    mkdirSync(captureDir, { recursive: true })

    expect(() => refuseExistingCapture(captureDir, 'abc123')).toThrow(
      'There is already a capture of abc123'
    )
  })

  test('allows a commit that has not been captured', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-capture-traces-'))

    expect(() =>
      refuseExistingCapture(join(root, 'traces', 'app', 'abc123'), 'abc123')
    ).not.toThrow()
  })
})

describe('writeCaptureFile', () => {
  test('writes the content as formatted JSON and returns where it went', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-capture-traces-'))
    const captureDir = join(root, 'capture')

    const path = writeCaptureFile({
      captureDir,
      name: 'manifest.json',
      content: { app: 'animals-frontend' }
    })

    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      app: 'animals-frontend'
    })
  })
})
