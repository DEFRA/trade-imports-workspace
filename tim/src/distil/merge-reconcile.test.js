import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { mergeReconcile } from './merge-reconcile.js'
import { writeAreaWorkingSets } from './areas.js'
import { distilCoverage } from './coverage.js'
import {
  DEMO_WORKAREA,
  makeDistilWorkspace
} from '../test-support/distil-workspace.js'
import { reconciledFor, writeDemoAreas } from '../test-support/distil-areas.js'

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

const reconciledPath = (areaId) =>
  join(workspace.layout.areasDir, areaId, 'reconciled.json')

const NEW_REQUIREMENT = {
  id: 'req-suite-001',
  statement: 'The smoke test names the tier it belongs to.',
  why: 'So a failure says which tier broke.',
  claims: ['tests-002', 'dr5-018'],
  status: 'adopted',
  delta: 'new',
  deltaNote: '',
  conflicts: ['c-suite-001']
}

const NEW_CONFLICT = {
  id: 'c-suite-001',
  about: 'Whether the smoke test is tier 1.',
  positions: [
    {
      source: 'repo:tests',
      says: 'The smoke test is untiered.',
      claim: 'tests-002'
    },
    {
      source: 'confluence:6608160092',
      says: 'The smoke test is tier 1.',
      claim: 'dr5-018'
    }
  ],
  resolution: 'precedence',
  outcome: 'Tier 1, as the policy page says.'
}

/** The demo's areas, each area's working set, and each area's reconciled file. */
const reconciledDemo = ({ suite = {}, tiers = {} } = {}) => {
  workspace = makeDistilWorkspace()
  writeDemoAreas(workspace)
  writeAreaWorkingSets(context())
  workspace.writeJson(reconciledPath('suite'), {
    ...reconciledFor(workspace, 'suite'),
    ...suite
  })
  workspace.writeJson(reconciledPath('tiers'), {
    ...reconciledFor(workspace, 'tiers'),
    ...tiers
  })
}

const problemsOf = (run) => {
  try {
    run()
  } catch (error) {
    return error.message.split('\n').slice(1)
  }
  throw new Error('Expected the merge to refuse, and it passed.')
}

describe('mergeReconcile', () => {
  test('joins the areas, keeping every existing id', () => {
    reconciledDemo()

    const result = mergeReconcile(context())

    expect({
      requirements: workspace
        .readJson(workspace.layout.requirements)
        .requirements.map((requirement) => requirement.id),
      result: {
        requirements: result.requirements,
        renumbered: result.renumbered
      }
    }).toEqual({
      requirements: [
        'req-001',
        'req-002',
        'req-003',
        'req-004',
        'req-005',
        'req-006'
      ],
      result: { requirements: 6, renumbered: 0 }
    })
  })

  test('numbers each new requirement and conflict on from the highest, and follows the citations', () => {
    workspace = makeDistilWorkspace()
    const suite = reconciledFor(workspace, 'suite', {
      requirements: [NEW_REQUIREMENT],
      conflicts: [NEW_CONFLICT]
    })
    workspace.remove()
    reconciledDemo({
      suite: { requirements: suite.requirements, conflicts: suite.conflicts }
    })

    mergeReconcile(context())

    const added = workspace
      .readJson(workspace.layout.requirements)
      .requirements.find((requirement) => requirement.id === 'req-007')
    expect({
      conflicts: added.conflicts,
      idMap: workspace.readJson(workspace.layout.areaIdMap).requirements[
        'req-007'
      ]
    }).toEqual({
      conflicts: ['c-003'],
      idMap: { area: 'suite', was: 'req-suite-001' }
    })
  })

  test('leaves files that tim distil coverage passes', () => {
    reconciledDemo()

    mergeReconcile(context())

    expect(distilCoverage(context()).requirements.total).toBe(6)
  })

  test('refuses an area that leaves out an id it owns, or keeps one it does not', () => {
    workspace = makeDistilWorkspace()
    const requirements = workspace.readJson(
      workspace.layout.requirements
    ).requirements
    const taken = requirements.filter((requirement) =>
      ['req-001', 'req-002'].includes(requirement.id)
    )
    workspace.remove()
    reconciledDemo({ suite: { requirements: taken } })

    expect(problemsOf(() => mergeReconcile(context()))).toEqual([
      'distil/areas/suite/reconciled.json has req-002, which distil/areas.json does not give to suite. Keep only the existing requirements this area owns; give a new one the id req-suite-NNN.',
      'distil/areas/suite/reconciled.json leaves out req-003, which distil/areas.json gives this area. Keep every existing requirement: one nothing supports any more becomes out-of-scope, with why saying what changed.',
      "distil/areas/suite/reconciled.json req-002 cites dr5-038, which is not in this area's working set. Cite only claims the area's working set holds."
    ])
  })

  test("refuses a new id with another area's prefix, and a conflict cited from another area", () => {
    workspace = makeDistilWorkspace()
    const suite = reconciledFor(workspace, 'suite', {
      requirements: [
        { ...NEW_REQUIREMENT, id: 'req-tiers-001', conflicts: ['c-tiers-001'] }
      ]
    })
    workspace.remove()
    reconciledDemo({ suite: { requirements: suite.requirements } })

    expect(problemsOf(() => mergeReconcile(context()))).toEqual([
      'distil/areas/suite/reconciled.json has req-tiers-001. A new requirement in this area is req-suite-NNN.',
      'distil/areas/suite/reconciled.json req-tiers-001 cites c-tiers-001, which is neither in this file nor in distil/conflicts.json.'
    ])
  })

  test('holds each item to the requirements schema, ids aside', () => {
    workspace = makeDistilWorkspace()
    const suite = reconciledFor(workspace, 'suite', {
      requirements: [{ ...NEW_REQUIREMENT, status: 'maybe' }]
    })
    workspace.remove()
    reconciledDemo({
      suite: {
        requirements: suite.requirements,
        conflicts: [...suite.conflicts, NEW_CONFLICT]
      }
    })

    expect(problemsOf(() => mergeReconcile(context()))).toEqual([
      'distil/areas/suite/reconciled.json requirements[req-suite-001].status is "maybe". Use one of: adopted, question, out-of-scope.'
    ])
  })

  test('names an area that has no reconciled file yet', () => {
    reconciledDemo()
    rmSync(reconciledPath('tiers'))

    expect(problemsOf(() => mergeReconcile(context()))).toEqual([
      'distil/areas/tiers/reconciled.json does not exist yet: area tiers (Test tiers) has no reconcile.'
    ])
  })

  test('checks one area alone and writes nothing', () => {
    reconciledDemo()
    const before = workspace.readJson(workspace.layout.requirements)

    const result = mergeReconcile({ ...context(), areaId: 'suite' })

    expect({
      result,
      unchanged: workspace.readJson(workspace.layout.requirements)
    }).toEqual({
      result: {
        areas: [
          {
            id: 'suite',
            requirements: 2,
            newRequirements: 0,
            conflicts: 1,
            newConflicts: 0
          }
        ]
      },
      unchanged: before
    })
  })
})
