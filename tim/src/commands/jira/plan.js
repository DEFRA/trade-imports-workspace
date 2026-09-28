import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { TimError } from '../../errors.js'

export const MAX_DESCRIPTION_LENGTH = 32767

// Leftover template markers a hand-off should catch before it reaches the
// real team — an unanswered prompt, a missing translation, an example
// ticket number, or a plain TODO.
export const PLACEHOLDER_PATTERNS = [
  '[Who is this for?',
  '[Welsh needed]',
  'EUDPA-XXXX',
  'TODO'
]

const sha256Hex = (buffer) => createHash('sha256').update(buffer).digest('hex')

const readTextFile = (dir, relPath, label) => {
  const path = join(dir, relPath)
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new TimError('USAGE', `Can't find the ${label} at ${path}.`)
    }
    throw error
  }
}

/**
 * Read one attachment and its content hash, so the plan id changes if the
 * file's contents change even when its name and manifest entry do not.
 *
 * @param {string} dir
 * @param {string} relPath
 * @returns {{path: string, filename: string, size: number, hash: string}}
 * @throws {TimError} USAGE when the attachment is missing
 */
const readAttachment = (dir, relPath) => {
  const path = join(dir, relPath)
  let buffer
  try {
    buffer = readFileSync(path)
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new TimError('USAGE', `Can't find the attachment at ${path}.`)
    }
    throw error
  }
  return {
    path,
    filename: basename(relPath),
    size: buffer.length,
    hash: sha256Hex(buffer)
  }
}

/**
 * The warnings a hand-off should fix before it goes to the real team: a
 * description past Jira's field limit, or a template placeholder nobody
 * replaced.
 *
 * @param {string} text - Summary and description, concatenated
 * @returns {string[]}
 */
export const findWarnings = (text) => {
  const warnings = []
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    warnings.push(
      `The description is ${text.length} characters. Jira's limit is ${MAX_DESCRIPTION_LENGTH}.`
    )
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (text.includes(pattern)) {
      warnings.push(`Still has the placeholder "${pattern}".`)
    }
  }
  return warnings
}

/**
 * The Jira `fields` payload `createIssue` sends, built from a validated
 * `tim-ticket/1` manifest and its description text (already Jira wiki
 * markup by the time it reaches here).
 *
 * @param {object} manifest
 * @param {string} description
 * @returns {object}
 */
export const buildFields = (manifest, description) => ({
  project: { key: manifest.project },
  summary: manifest.summary,
  description,
  issuetype: { name: manifest.type },
  labels: [...manifest.labels],
  ...(manifest.priority ? { priority: { name: manifest.priority } } : {}),
  ...(manifest.parent ? { parent: { key: manifest.parent } } : {})
})

const canonicalStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * A stable id for the exact ticket a dry run showed: a hash of every field
 * that would change what gets created, plus each attachment's own content
 * hash. Editing the manifest, the description, or swapping an attachment's
 * contents after the check all change the id, which is what lets
 * `--confirm <planId>` catch drift before sending a single request.
 *
 * @param {object} args
 * @param {object} args.manifest
 * @param {string} args.description
 * @param {Array<{filename: string, hash: string}>} args.attachments
 * @returns {string} 64-character hex sha256
 */
export const computePlanId = ({ manifest, description, attachments }) => {
  const payload = canonicalStringify({
    project: manifest.project,
    type: manifest.type,
    summary: manifest.summary,
    description,
    parent: manifest.parent ?? null,
    labels: [...manifest.labels].sort(),
    priority: manifest.priority ?? null,
    relates: [...manifest.relates].sort(),
    attachments: attachments.map((attachment) => attachment.filename)
  })
  const hash = createHash('sha256')
  hash.update(payload)
  for (const attachment of attachments) hash.update(attachment.hash)
  return hash.digest('hex')
}

/**
 * Read a manifest's description and attachments from disk and build the
 * full create plan: the Jira fields, each attachment's name/size/hash, any
 * warnings, and the plan id a `--confirm` must match. Touches only the
 * filesystem — no Jira request.
 *
 * @param {object} args
 * @param {object} args.manifest - A `tim-ticket/1` manifest, already validated
 * @param {string} args.dir - The manifest's own directory; `descriptionFile`
 *   and `attachments` paths are relative to it
 * @returns {{fields: object, attachments: object[], warnings: string[], planId: string}}
 * @throws {TimError} USAGE when the description file or an attachment is missing
 */
export const buildPlan = ({ manifest, dir }) => {
  const description = readTextFile(
    dir,
    manifest.descriptionFile,
    'description file'
  )
  const attachments = manifest.attachments.map((relPath) =>
    readAttachment(dir, relPath)
  )
  const fields = buildFields(manifest, description)
  const warnings = findWarnings(`${manifest.summary}\n${description}`)
  const planId = computePlanId({ manifest, description, attachments })
  return { fields, attachments, warnings, planId }
}
