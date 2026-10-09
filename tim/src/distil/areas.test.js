import { describe, test, expect, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  areaClaimIdsOf,
  areaRequirements,
  checkAreas,
  writeAreaWorkingSets
} from './areas.js'
import { mergeExtractParts } from './merge-extract.js'
import { distilStatus } from './checks.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace,
  splitExtractIntoParts
} from '../test-support/distil-workspace.js'
import {
  DEMO_AREAS,
  reconciledFor,
  writeDemoAreas
} from '../test-support/distil-areas.js'
import { mergeReconcile } from './merge-reconcile.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const context = () => ({
  layout: workspace.layout,
  schemas: workspace.schemas,
  workarea: DEMO_WORKAREA
})

const problemsOf = (run) => {
  try {
    run()
  } catch (error) {
    return error.message.split('\n').slice(1)
  }
  throw new Error('Expected the check to refuse, and it passed.')
}

const withArea = (areaId, edit) => ({
  ...DEMO_AREAS,
  areas: DEMO_AREAS.areas.map((area) =>
    area.id === areaId ? edit(area) : area
  )
})

describe('checkAreas', () => {
  test("counts each area's claims, every-area sources included", () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)

    const result = checkAreas(context())

    expect(
      result.areas.map(({ id, claims, sources }) => ({ id, claims, sources }))
    ).toEqual([
      {
        id: 'suite',
        claims: 6,
        sources: [
          { id: 'ruling:sam-2026-09-29c', claims: 1, everyArea: true },
          { id: 'repo:tests', claims: 4, everyArea: false },
          { id: 'confluence:6608160092', claims: 1, everyArea: false }
        ]
      },
      {
        id: 'tiers',
        claims: 7,
        sources: [
          { id: 'ruling:sam-2026-09-29c', claims: 1, everyArea: true },
          { id: 'confluence:6608160092', claims: 6, everyArea: false }
        ]
      }
    ])
  })

  test('refuses claims no area takes, naming them', () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(
      workspace,
      withArea('tiers', (area) => ({
        ...area,
        slices: [
          { source: 'confluence:6608160092', from: 'dr5-038', to: 'dr5-060' }
        ]
      }))
    )

    expect(problemsOf(() => checkAreas(context()))).toEqual([
      'confluence:6608160092 has 3 claims in no area: dr5-001, dr5-004, dr5-001-m1. Give each to the area it speaks to, or name the source in everyArea.'
    ])
  })

  test('refuses an existing requirement in no area, and one in two', () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(
      workspace,
      withArea('suite', (area) => ({
        ...area,
        requirements: ['req-001', 'req-002']
      }))
    )

    expect(problemsOf(() => checkAreas(context()))).toEqual([
      'distil/areas.json gives req-002 to suite and tiers. Each existing requirement belongs to one area.',
      'req-003 is in distil/requirements.json, but distil/areas.json gives it to no area. Give every existing requirement to the one area its claims speak to.'
    ])
  })

  test('refuses a part of a source with no partition, and a range that runs backwards', () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(
      workspace,
      withArea('suite', (area) => ({
        ...area,
        slices: [
          { source: 'repo:tests', parts: [1] },
          { source: 'confluence:6608160092', from: 'dr5-060', to: 'dr5-018' }
        ]
      }))
    )

    expect(problemsOf(() => checkAreas(context()))).toEqual(
      expect.arrayContaining([
        'distil/areas.json suite slices[0] names part 1 of repo:tests, which has no partition: take a claim range or the whole source.',
        'distil/areas.json suite slices[1] runs from dr5-060 back to dr5-018. Name the earlier claim in "from".'
      ])
    )
  })

  test('takes the claims of the extract parts a slice names, missed claims with their parent', () => {
    workspace = makeDistilWorkspace()
    splitExtractIntoParts(workspace)
    mergeExtractParts({ ...context(), sourceId: 'repo:tests' })
    writeDemoAreas(
      workspace,
      withArea('suite', (area) => ({
        ...area,
        slices: [
          { source: 'repo:tests', parts: [1] },
          { source: 'confluence:6608160092', from: 'dr5-018', to: 'dr5-018' }
        ]
      }))
    )
    writeAreaWorkingSets(context())

    expect(distilStatus(context()).counts.verified).toBe(3)
    expect([...areaClaimIdsOf(workspace.layout, 'suite')]).toEqual([
      'sam3-001',
      'tests-001',
      'tests-002',
      'tests-005',
      'tests-001-m1',
      'dr5-018'
    ])
  })
})

describe('writeAreaWorkingSets', () => {
  test("writes each area's working set, with the ids it owns", () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)

    writeAreaWorkingSets(context())

    const written = workspace.readJson(
      join(workspace.layout.areasDir, 'tiers', 'working-set.json')
    )
    expect({
      area: written.area.id,
      owns: written.owns,
      total: written.total
    }).toEqual({
      area: 'tiers',
      owns: {
        requirements: ['req-002', 'req-004', 'req-005', 'req-006'],
        conflicts: ['c-002']
      },
      total: 7
    })
  })

  test('removes what an earlier reconcile left, so nothing stale is merged or enforced', () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)
    const reconciled = join(
      workspace.layout.areasDir,
      'suite',
      'reconciled.json'
    )
    const verdict = join(workspace.layout.challengeDir, 'c-002.json')
    const gone = join(workspace.layout.areasDir, 'retired', 'reconciled.json')
    workspace.writeJson(reconciled, {})
    workspace.writeJson(verdict, {})
    workspace.writeJson(gone, {})

    const result = writeAreaWorkingSets(context())

    expect({
      removed: result.removed.sort(),
      left: [reconciled, verdict, gone].filter((path) => existsSync(path))
    }).toEqual({
      removed: [
        join(workspace.layout.areasDir, 'retired'),
        reconciled,
        workspace.layout.challengeDir
      ].sort(),
      left: []
    })
  })
})

describe('areaRequirements', () => {
  test('lists the requirements each area reconciled, and those still to build', () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)
    writeAreaWorkingSets(context())
    workspace.writeJson(
      join(workspace.layout.areasDir, 'suite', 'reconciled.json'),
      reconciledFor(workspace, 'suite')
    )
    workspace.writeJson(
      join(workspace.layout.areasDir, 'tiers', 'reconciled.json'),
      reconciledFor(workspace, 'tiers')
    )
    mergeReconcile(context())

    const result = areaRequirements({ ...context(), areaId: 'suite' })

    expect(result.areas[0]).toMatchObject({
      id: 'suite',
      reconciled: ['req-001', 'req-003'],
      toBuild: ['req-001'],
      splitOff: []
    })
  })

  test('leaves out of toBuild a requirement a theme split off early holds, naming the theme', () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)
    writeAreaWorkingSets(context())
    workspace.writeJson(
      join(workspace.layout.areasDir, 'suite', 'reconciled.json'),
      reconciledFor(workspace, 'suite')
    )
    workspace.writeJson(
      join(workspace.layout.areasDir, 'tiers', 'reconciled.json'),
      reconciledFor(workspace, 'tiers')
    )
    mergeReconcile(context())
    workspace.editJson(workspace.layout.backlog, (backlog) => ({
      ...backlog,
      splitOff: [{ theme: 'smoke', requirements: ['req-001'] }]
    }))

    const result = areaRequirements({ ...context(), areaId: 'suite' })

    expect(result.areas[0]).toMatchObject({
      toBuild: [],
      splitOff: [{ id: 'req-001', theme: 'smoke' }]
    })
  })

  test('names an area that is not planned', () => {
    workspace = makeDistilWorkspace()
    writeDemoAreas(workspace)

    expect(() =>
      areaRequirements({ ...context(), areaId: 'dashboard' })
    ).toThrow(
      `Can't find the area dashboard in ${workspace.layout.areas}. Its areas are suite, tiers.`
    )
  })
})
