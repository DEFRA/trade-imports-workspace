import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DISTIL_SCHEMA_DIR, DISTIL_SCHEMA_FILES } from '../../distil/files.js'
import { createCliWorkspace } from '../../test-support/tim-cli.js'

const workspaceRepoRoot = fileURLToPath(
  new URL('../../../../', import.meta.url)
)

const copyDistilSchemas = (root) => {
  for (const file of Object.values(DISTIL_SCHEMA_FILES)) {
    const target = join(root, DISTIL_SCHEMA_DIR, file)
    mkdirSync(dirname(target), { recursive: true })
    cpSync(join(workspaceRepoRoot, DISTIL_SCHEMA_DIR, file), target)
  }
}

/**
 * A throwaway workspace with the given folders and files under
 * `workareas/shared/`, and the given backlogs at `workareas/<workarea>/backlog.json`.
 *
 * @param {object} [contents]
 * @param {string[]} [contents.folders] - Folder names under `workareas/shared/`
 * @param {Record<string, string>} [contents.files] - File text by path under `workareas/shared/`
 * @param {Record<string, object>} [contents.backlogs] - A backlog by workarea, such as `shared/eudpa-29-old-slug`
 * @param {boolean} [contents.distilSchemas] - Also hold the DISTIL schemas, so `tim distil status` can run
 * @returns {{root: string, remove: () => void}}
 */
export const makeTicketWorkspace = ({
  folders = [],
  files = {},
  backlogs = {},
  distilSchemas = false
} = {}) => {
  const root = createCliWorkspace('tim-from-ticket-')
  if (distilSchemas) copyDistilSchemas(root)
  const sharedDir = join(root, 'workareas', 'shared')
  mkdirSync(sharedDir, { recursive: true })
  folders.forEach((folder) =>
    mkdirSync(join(sharedDir, folder), { recursive: true })
  )
  Object.entries(files).forEach(([path, text]) => {
    mkdirSync(dirname(join(sharedDir, path)), { recursive: true })
    writeFileSync(join(sharedDir, path), text)
  })
  Object.entries(backlogs).forEach(([workarea, backlog]) => {
    const backlogPath = join(root, 'workareas', workarea, 'backlog.json')
    mkdirSync(dirname(backlogPath), { recursive: true })
    writeFileSync(backlogPath, JSON.stringify(backlog))
  })
  return { root, remove: () => rmSync(root, { recursive: true, force: true }) }
}
