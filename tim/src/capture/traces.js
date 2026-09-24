import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, join, sep } from 'node:path'
import { TimError } from '../errors.js'

const TRACE_FILE = 'trace.zip'

export const MANIFEST_FILE = 'manifest.json'
export const COVERAGE_FILE = 'coverage.json'

/**
 * Every trace Playwright wrote under its output folder, paired with the test
 * that produced it. Playwright names the folder holding a trace after the
 * spec file and the test title, so that folder name is the test's name here
 * — with a `-retry1` suffix where a test was retried.
 *
 * @param {string} outputDir
 * @returns {Array<{test: string, source: string}>}
 */
export const findTraces = (outputDir) => {
  if (!existsSync(outputDir)) return []
  return readdirSync(outputDir, { recursive: true })
    .map(String)
    .filter((entry) => basename(entry) === TRACE_FILE)
    .map((entry) => ({
      test: dirname(entry).split(sep).join('--'),
      source: join(outputDir, entry)
    }))
    .sort((left, right) => left.test.localeCompare(right.test))
}

/**
 * Refuse a capture that already exists. One folder per commit keeps a capture
 * immutable: to capture the same commit again, delete the folder first.
 *
 * @param {string} captureDir
 * @param {string} sha
 * @throws {TimError} USAGE
 */
export const refuseExistingCapture = (captureDir, sha) => {
  if (existsSync(captureDir)) {
    throw new TimError(
      'USAGE',
      `There is already a capture of ${sha} in ${captureDir}. Commit your changes and capture again, or delete that folder.`
    )
  }
}

/**
 * Copy each trace into the capture folder under a name that says which test
 * produced it.
 *
 * @param {{traces: Array<{test: string, source: string}>, captureDir: string}} args
 * @returns {Array<{file: string, test: string}>}
 */
export const copyTraces = ({ traces, captureDir }) => {
  mkdirSync(captureDir, { recursive: true })
  return traces.map(({ test, source }) => {
    const file = `${test}.zip`
    copyFileSync(source, join(captureDir, file))
    return { file, test }
  })
}

/**
 * Write one of the capture's JSON files.
 *
 * @param {{captureDir: string, name: string, content: object}} args
 * @returns {string} The path written
 */
export const writeCaptureFile = ({ captureDir, name, content }) => {
  mkdirSync(captureDir, { recursive: true })
  const path = join(captureDir, name)
  writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`)
  return path
}
