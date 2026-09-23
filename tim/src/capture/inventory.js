import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { TimError } from '../errors.js'

const sectionsSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      pages: z.array(z.object({ id: z.string().min(1), slug: z.string() }))
    })
  )
  .min(1)

/**
 * The one place tim runs a repo's own source. The flow module is a list of
 * sections holding page objects, so importing it is how the inventory stays
 * the app's own answer rather than a copy that drifts. Nothing else in
 * `capture/` imports repo code — everything downstream works on the plain
 * rows this returns.
 *
 * @param {string} flowFile - Absolute path to the flow module
 * @returns {Promise<{sections: unknown}>}
 * @throws {TimError} PARSE
 */
const importFlow = async (flowFile) => {
  try {
    return await import(pathToFileURL(flowFile).href)
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Can't read the flow module at ${flowFile}: ${error.message}`,
      error
    )
  }
}

/**
 * Every page the journey has, in flow order: its section, its id, its slug and
 * its place in the order.
 *
 * @param {object} args
 * @param {string} args.repoPath - Absolute path to the repo
 * @param {string} args.flow - Path to the flow module, relative to the repo
 * @returns {Promise<Array<{section: string, id: string, slug: string, order: number}>>}
 * @throws {TimError} NOT_FOUND or PARSE
 */
export const readInventory = async ({ repoPath, flow }) => {
  const flowFile = join(repoPath, flow)
  if (!existsSync(flowFile)) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find the flow module at ${flowFile}. Check the "flow" path in capture.json.`
    )
  }
  const { sections } = await importFlow(flowFile)
  const result = sectionsSchema.safeParse(sections)
  if (!result.success) {
    throw new TimError(
      'PARSE',
      `${flowFile} does not export "sections" as a list of {id, pages: [{id, slug}]}.`
    )
  }
  return result.data
    .flatMap((section) =>
      section.pages.map((page) => ({
        section: section.id,
        id: page.id,
        slug: page.slug
      }))
    )
    .map((page, index) => ({ ...page, order: index + 1 }))
}
