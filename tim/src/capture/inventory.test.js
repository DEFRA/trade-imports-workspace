import { describe, test, expect, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readInventory } from './inventory.js'

const FLOW = 'src/flow/flow.js'

const FLOW_MODULE = `
export const sections = [
  { id: 'start', pages: [{ id: 'dashboard', slug: '' }] },
  {
    id: 'commodities',
    pages: [
      { id: 'commodities', slug: 'commodities' },
      { id: 'animalIdentification', slug: 'commodities/identification' }
    ]
  }
]
`

let repoPath

afterEach(() => {
  if (repoPath) rmSync(repoPath, { recursive: true, force: true })
})

const seedRepo = (flowSource) => {
  repoPath = mkdtempSync(join(tmpdir(), 'tim-capture-inventory-'))
  writeFileSync(join(repoPath, 'package.json'), '{"type":"module"}')
  mkdirSync(join(repoPath, 'src', 'flow'), { recursive: true })
  if (flowSource !== null) {
    writeFileSync(join(repoPath, FLOW), flowSource)
  }
  return repoPath
}

describe('readInventory', () => {
  test('lists every page in flow order with its section and slug', async () => {
    seedRepo(FLOW_MODULE)

    await expect(readInventory({ repoPath, flow: FLOW })).resolves.toEqual([
      { section: 'start', id: 'dashboard', slug: '', order: 1 },
      {
        section: 'commodities',
        id: 'commodities',
        slug: 'commodities',
        order: 2
      },
      {
        section: 'commodities',
        id: 'animalIdentification',
        slug: 'commodities/identification',
        order: 3
      }
    ])
  })

  test('says where it looked when the flow module is missing', async () => {
    seedRepo(null)

    await expect(readInventory({ repoPath, flow: FLOW })).rejects.toThrow(
      /Can't find the flow module at .*flow\.js/
    )
  })

  test('says what it expected when sections is not the shape it needs', async () => {
    seedRepo('export const sections = [{ id: "start" }]')

    await expect(readInventory({ repoPath, flow: FLOW })).rejects.toThrow(
      'does not export "sections" as a list of {id, pages: [{id, slug}]}'
    )
  })

  test('reports the reason when the flow module cannot be loaded', async () => {
    seedRepo('import { missing } from "./nowhere.js"')

    await expect(readInventory({ repoPath, flow: FLOW })).rejects.toThrow(
      /Can't read the flow module at/
    )
  })
})
