import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  DISTIL_SCHEMA_DIR,
  DISTIL_SCHEMA_FILES,
  distilLayout,
  loadDistilSchemas
} from '../distil/files.js'

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRepoRoot = join(here, '..', '..', '..')
const demoFixture = join(here, '..', 'distil', '__fixtures__', 'demo')

export const DEMO_WORKAREA = 'shared/demo'

/**
 * A throwaway workspace holding the real DISTIL schemas and a copy of the
 * demo workarea (a trimmed copy of a real programme's distil files), for
 * tests that read and write through the real filesystem.
 *
 * @returns {{root: string, workareaDir: string, layout: object, schemas: object, readJson: (path: string) => any, writeJson: (path: string, value: any) => void, editJson: (path: string, edit: (value: any) => any) => void, remove: () => void}}
 */
export const makeDistilWorkspace = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'tim-distil-')))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'))
  for (const file of Object.values(DISTIL_SCHEMA_FILES)) {
    const target = join(root, DISTIL_SCHEMA_DIR, file)
    mkdirSync(dirname(target), { recursive: true })
    cpSync(join(workspaceRepoRoot, DISTIL_SCHEMA_DIR, file), target)
  }
  const workareaDir = join(root, 'workareas', DEMO_WORKAREA)
  cpSync(demoFixture, workareaDir, { recursive: true })
  const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
  const writeJson = (path, value) => {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(value, null, 2))
  }
  return {
    root,
    workareaDir,
    layout: distilLayout(workareaDir),
    schemas: loadDistilSchemas(root),
    readJson,
    writeJson,
    editJson: (path, edit) => writeJson(path, edit(readJson(path))),
    remove: () => rmSync(root, { recursive: true, force: true })
  }
}
