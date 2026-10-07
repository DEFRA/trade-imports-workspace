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

export const PART_STRUCTURES = [
  'package.json, utils/playwright/shared-config.ts and playwright.docker-compose.config.ts, read in full.',
  'fixtures/security.ts and fixtures/ui.ts, read in full.'
]

/**
 * Cut the demo's repo:tests extract into a partition of two parts and their
 * part files, the way a characterise agent and two part agents would write
 * them on a re-extract: each part keeps the old ids its slice holds. The
 * merged extract is removed, so the parts are waiting to be merged.
 *
 * @param {ReturnType<typeof makeDistilWorkspace>} workspace
 * @returns {{whole: object, partition: object, partitionPath: string, partPath: (part: number) => string, extractPath: string}}
 */
export const splitExtractIntoParts = (workspace) => {
  const { extractDir } = workspace.layout
  const extractPath = join(extractDir, 'repo-tests.json')
  const partPath = (part) => join(extractDir, `repo-tests.part${part}.json`)
  const partitionPath = join(extractDir, 'repo-tests.partition.json')
  const whole = workspace.readJson(extractPath)
  const [layout, projects, ports, fixtures] = whole.claims
  const partition = {
    source: 'repo:tests',
    structure: whole.structure,
    parts: [
      {
        part: 1,
        title: 'Suite layout and config',
        scope:
          'How the suite is organised and run: package.json and the Playwright configs.',
        read: [
          'package.json',
          'utils/playwright/shared-config.ts',
          'playwright.docker-compose.config.ts'
        ],
        covers: [
          'every Playwright project and its globs',
          'every base URL',
          'any load or performance tooling'
        ],
        prefix: 'repo-tests-p1',
        keeps: ['tests-001', 'tests-002', 'tests-005']
      },
      {
        part: 2,
        title: 'Fixtures',
        scope: 'The Playwright fixtures under fixtures/.',
        read: ['fixtures/'],
        covers: ['every fixture and the specs that use it'],
        prefix: 'repo-tests-p2',
        keeps: ['tests-010']
      }
    ]
  }
  workspace.writeJson(partitionPath, partition)
  workspace.writeJson(partPath(1), {
    source: 'repo:tests',
    structure: PART_STRUCTURES[0],
    claims: [layout, projects, ports]
  })
  workspace.writeJson(partPath(2), {
    source: 'repo:tests',
    structure: PART_STRUCTURES[1],
    claims: [fixtures]
  })
  rmSync(extractPath)
  return { whole, partition, partitionPath, partPath, extractPath }
}
