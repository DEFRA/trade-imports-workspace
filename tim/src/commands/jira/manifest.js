import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'
import { TimError } from '../../errors.js'

export const MANIFEST_SCHEMA = 'tim-ticket/1'
const MAX_SUMMARY_LENGTH = 255

/**
 * The `tim-ticket/1` manifest a hand-off writes: everything `tim jira
 * create` needs to raise a story, with the description and attachments
 * held as files next to the manifest rather than inlined.
 */
export const manifestSchema = z.object({
  schema: z.literal(MANIFEST_SCHEMA, {
    message: `schema must be "${MANIFEST_SCHEMA}".`
  }),
  project: z.string().trim().min(1, 'Give a project key.'),
  type: z.enum(['Story', 'Task', 'Bug'], {
    message: 'type must be one of Story, Task, Bug.'
  }),
  summary: z
    .string()
    .trim()
    .min(1, 'Give a summary.')
    .max(
      MAX_SUMMARY_LENGTH,
      `summary must be ${MAX_SUMMARY_LENGTH} characters or fewer.`
    ),
  descriptionFile: z.string().trim().min(1, 'Give descriptionFile.'),
  parent: z.string().trim().min(1).optional(),
  labels: z.array(z.string()).default([]),
  priority: z.string().trim().min(1).optional(),
  attachments: z.array(z.string()).default([]),
  relates: z.array(z.string()).default([])
})

/**
 * Read and validate a `tim-ticket/1` manifest from disk. `descriptionFile`
 * and every path in `attachments` are read later, relative to the
 * manifest's own directory — the caller gets that directory back so it
 * never has to re-derive it.
 *
 * @param {string} manifestPath - Absolute path to the manifest JSON file
 * @returns {{manifest: object, dir: string}}
 * @throws {TimError} USAGE — missing file, invalid JSON, or fails the schema
 */
export const loadManifest = (manifestPath) => {
  let text
  try {
    text = readFileSync(manifestPath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new TimError('USAGE', `Can't find the manifest at ${manifestPath}.`)
    }
    throw error
  }

  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    throw new TimError('USAGE', `${manifestPath} is not valid JSON.`)
  }

  const result = manifestSchema.safeParse(raw)
  if (!result.success) {
    throw new TimError(
      'USAGE',
      `${manifestPath}: ${result.error.issues[0].message}`
    )
  }
  return { manifest: result.data, dir: dirname(manifestPath) }
}
