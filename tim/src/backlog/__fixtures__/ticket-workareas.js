import { cpSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BACKLOG_SCHEMA_PATH, INTAKE_SCHEMA_PATH } from '../backlog-schema.js'
import { DISTIL_SCHEMA_DIR, DISTIL_SCHEMA_FILES } from '../../distil/files.js'
import { createCliWorkspace } from '../../test-support/tim-cli.js'

const workspaceRepoRoot = fileURLToPath(
  new URL('../../../../', import.meta.url)
)

export const ticketBacklogRepos = {
  workspace: { path: '.', github: 'DEFRA/trade-imports-workspace' }
}

const copyFromWorkspaceRepo = (root, path) => {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(join(workspaceRepoRoot, path), target)
}

const copyDistilSchemas = (root) =>
  Object.values(DISTIL_SCHEMA_FILES).forEach((file) =>
    copyFromWorkspaceRepo(root, join(DISTIL_SCHEMA_DIR, file))
  )

const copyBacklogSchemas = (root) =>
  [BACKLOG_SCHEMA_PATH, INTAKE_SCHEMA_PATH].forEach((path) =>
    copyFromWorkspaceRepo(root, path)
  )

const writeJsonBesideBacklog = ({ root, workarea, fileName, value }) => {
  const path = join(root, 'workareas', workarea, fileName)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
}

/**
 * A throwaway workspace with the given folders and files under
 * `workareas/shared/`, the given backlogs at `workareas/<workarea>/backlog.json`
 * and the given intake records at `workareas/<workarea>/intake.json`. Its root
 * is the real path of the temporary folder.
 *
 * @param {object} [contents]
 * @param {string[]} [contents.folders] - Folder names under `workareas/shared/`
 * @param {Record<string, string>} [contents.files] - File text by path under `workareas/shared/`
 * @param {Record<string, object>} [contents.backlogs] - A backlog by workarea, such as `shared/eudpa-29-old-slug`
 * @param {Record<string, object>} [contents.intakeRecords] - An intake record by workarea, written beside that workarea's backlog
 * @param {boolean} [contents.distilSchemas] - Also hold the DISTIL schemas, so `tim distil status` can run
 * @param {boolean} [contents.backlogSchemas] - Also hold the backlog schema and the intake schema, so `tim backlog check` can run
 * @returns {{root: string, remove: () => void}}
 */
export const makeTicketWorkspace = ({
  folders = [],
  files = {},
  backlogs = {},
  intakeRecords = {},
  distilSchemas = false,
  backlogSchemas = false
} = {}) => {
  const root = realpathSync(createCliWorkspace('tim-from-ticket-'))
  if (distilSchemas) copyDistilSchemas(root)
  if (backlogSchemas) copyBacklogSchemas(root)
  const sharedDir = join(root, 'workareas', 'shared')
  mkdirSync(sharedDir, { recursive: true })
  folders.forEach((folder) =>
    mkdirSync(join(sharedDir, folder), { recursive: true })
  )
  Object.entries(files).forEach(([path, text]) => {
    mkdirSync(dirname(join(sharedDir, path)), { recursive: true })
    writeFileSync(join(sharedDir, path), text)
  })
  Object.entries(backlogs).forEach(([workarea, value]) =>
    writeJsonBesideBacklog({ root, workarea, fileName: 'backlog.json', value })
  )
  Object.entries(intakeRecords).forEach(([workarea, value]) =>
    writeJsonBesideBacklog({ root, workarea, fileName: 'intake.json', value })
  )
  return { root, remove: () => rmSync(root, { recursive: true, force: true }) }
}
