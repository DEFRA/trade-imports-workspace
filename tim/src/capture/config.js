import { readFileSync } from 'node:fs'
import { join, normalize, sep } from 'node:path'
import { z } from 'zod'
import { TimError } from '../errors.js'

export const CAPTURE_CONFIG_FILE = 'capture.json'

const nonEmpty = z.string().trim().min(1)

const appSchema = z.object({
  repo: nonEmpty,
  fitScript: nonEmpty,
  projects: z.array(nonEmpty).min(1),
  flow: nonEmpty,
  pagePath: nonEmpty.refine(
    (value) => value.endsWith('{slug}'),
    'pagePath must end with {slug}, such as /notifications/{journeyId}/{slug}.'
  )
})

const configSchema = z.object({
  apps: z
    .record(z.string(), appSchema)
    .refine(
      (apps) => Object.keys(apps).length > 0,
      'apps must name at least one app.'
    )
})

/**
 * The folder a workarea lives in. Refuses an absolute path or one that climbs
 * out of workareas/ before anything is read.
 *
 * @param {string} workspaceRoot
 * @param {unknown} workarea
 * @returns {string}
 * @throws {TimError} USAGE
 */
export const workareaPathFor = (workspaceRoot, workarea) => {
  if (typeof workarea !== 'string' || !workarea.trim()) {
    throw new TimError('USAGE', 'Name a workarea, such as shared/my-programme.')
  }
  const trimmed = workarea.trim().replace(/\/+$/, '')
  const normalised = normalize(trimmed).split(sep).join('/')
  if (
    trimmed.startsWith('/') ||
    normalised === '..' ||
    normalised.startsWith('../')
  ) {
    throw new TimError(
      'USAGE',
      `Workarea "${workarea}" must be a path inside workareas/, such as shared/my-programme.`
    )
  }
  return join(workspaceRoot, 'workareas', normalised)
}

export const captureConfigPath = (workspaceRoot, workarea) =>
  join(workareaPathFor(workspaceRoot, workarea), CAPTURE_CONFIG_FILE)

const readJson = (path) => {
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${path}. Write a ${CAPTURE_CONFIG_FILE} naming each app's repo, its FIT script and its flow module.`
    )
  }
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new TimError('PARSE', `${path} is not valid JSON: ${error.message}`)
  }
}

/**
 * The workarea's capture.json, checked against the shape every app entry must
 * have.
 *
 * @param {string} workspaceRoot
 * @param {string} workarea
 * @returns {{apps: Record<string, object>}}
 * @throws {TimError} NOT_FOUND, PARSE or USAGE
 */
export const readCaptureConfig = (workspaceRoot, workarea) => {
  const path = captureConfigPath(workspaceRoot, workarea)
  const result = configSchema.safeParse(readJson(path))
  if (!result.success) {
    const { path: where, message } = result.error.issues[0]
    throw new TimError(
      'USAGE',
      `${path} is not valid: ${where.join('.')} ${message}`
    )
  }
  return result.data
}

/**
 * One app's entry, refused by name when capture.json does not have it.
 *
 * @param {{apps: Record<string, object>}} config
 * @param {string} app
 * @returns {object}
 * @throws {TimError} USAGE
 */
export const appNamed = ({ apps }, app) => {
  const entry = apps[app]
  if (!entry) {
    throw new TimError(
      'USAGE',
      `Can't find an app called "${app}" in ${CAPTURE_CONFIG_FILE}. It has: ${Object.keys(apps).sort().join(', ')}.`
    )
  }
  return { name: app, ...entry }
}

/**
 * Where a capture of one app at one commit lives. One folder per sha, so a
 * capture is never written over.
 *
 * @param {string} workareaPath
 * @param {string} app
 * @param {string} sha
 * @returns {string}
 */
export const captureDirFor = (workareaPath, app, sha) =>
  join(workareaPath, 'traces', app, sha)
