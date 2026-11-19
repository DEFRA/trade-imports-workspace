import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  AXE_HOLD,
  createDepsWorkspace,
  fixtureDependencySets,
  fixtureDependencySetsHolding
} from '../../test-support/deps-workspace.js'
import { writeJsonAtomic } from '../../review/store.js'
import { packagesPath, runFolder } from '../state.js'
import {
  heldPackageLines,
  packagePolicyOf,
  recordedPolicyOf,
  recordPackagePolicies,
  removeHeldPackages,
  renderPoliciesText
} from './policy.js'

const RUN_ID = 'EUDPA-802-npm'
const REPO = 'trade-imports-animals-frontend'

const workspaces = []

afterEach(() => {
  workspaces
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
})

const row = (name, current, target, fields = {}) => ({
  package: name,
  current,
  target,
  classification: null,
  ...fields
})

const workspaceWithPackages = (packages) => {
  const root = createDepsWorkspace()
  workspaces.push(root)
  const path = packagesPath(runFolder(root, RUN_ID), REPO)
  writeJsonAtomic(path, { ticket: RUN_ID, repo: REPO, packages })
  return { root, path }
}

describe('#packagePolicyOf', () => {
  test.each([
    ['eslint', '9.39.0', '9.40.0', 'ci-is-enough', 'eslint', 'repo'],
    ['eslint', '9.39.0', '10.0.0', 'changelog-driven', 'eslint', 'repo'],
    [
      '@playwright/test',
      '1.55.0',
      '1.56.0',
      'ci-is-enough',
      'playwright',
      'cross-repo'
    ],
    [
      'govuk-frontend',
      '5.13.0',
      '5.13.1',
      'changelog-driven',
      'govuk-frontend',
      'cross-repo'
    ],
    ['lodash', '4.17.20', '4.17.21', 'ci-is-enough', null, null],
    ['lodash', '4.17.21', '5.0.0', 'changelog-driven', null, null],
    ['neostandard', '0.13.0', '0.14.0', 'changelog-driven', 'eslint', 'repo'],
    ['vitest', '4.0.0', '4.1.0-beta.1', 'changelog-driven', 'vitest', 'repo']
  ])(
    'Should give %s from %s to %s the %s policy',
    (name, current, target, policy, set, scope) => {
      const fields = packagePolicyOf(
        fixtureDependencySets(),
        row(name, current, target)
      )

      expect(fields).toEqual({
        policy,
        set,
        set_scope: scope,
        policy_reason: expect.stringMatching(/\.$/)
      })
    }
  )

  test('Should make a package whose versions tim cannot read changelog-driven, keeping its set', () => {
    const fields = packagePolicyOf(
      fixtureDependencySets(),
      row('vitest', '4.x', '5.x')
    )

    expect(fields).toEqual({
      policy: 'changelog-driven',
      set: 'vitest',
      set_scope: 'repo',
      policy_reason:
        'tim cannot compare 4.x with 5.x, so read the changelog before you merge it.'
    })
  })
})

describe('#packagePolicyOf with a hold', () => {
  test('Should make a target a hold on the repo covers held, naming the hold', () => {
    const fields = packagePolicyOf(
      fixtureDependencySetsHolding([AXE_HOLD]),
      row(AXE_HOLD.package, '4.13.0', '4.14.0'),
      REPO
    )

    expect(fields).toEqual({
      policy: 'held',
      set: null,
      set_scope: null,
      policy_reason: `@axe-core/playwright 4.14.0 is in the range 4.14.x held since 2026-11-19. ${AXE_HOLD.reason} Run tim deps holds to see the hold.`
    })
  })

  test('Should leave a repo the hold does not cover to its usual policy', () => {
    const { policy } = packagePolicyOf(
      fixtureDependencySetsHolding([AXE_HOLD]),
      row(AXE_HOLD.package, '4.13.0', '4.14.0'),
      'tim'
    )

    expect(policy).toBe('ci-is-enough')
  })
})

describe('#removeHeldPackages', () => {
  test('Should take the held rows out of the packages file and give them back', () => {
    const root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([
        { ...AXE_HOLD, package: 'lodash', versions: '4.17.x' }
      ])
    })
    workspaces.push(root)
    const path = packagesPath(runFolder(root, RUN_ID), REPO)
    writeJsonAtomic(path, {
      ticket: RUN_ID,
      repo: REPO,
      packages: [
        row('eslint', '9.39.0', '9.40.0'),
        row('lodash', '4.17.20', '4.17.21')
      ]
    })
    recordPackagePolicies({ workspaceRoot: root, runId: RUN_ID, repo: REPO })

    const held = removeHeldPackages({
      workspaceRoot: root,
      runId: RUN_ID,
      repo: REPO
    })

    expect({
      lines: heldPackageLines(held),
      left: JSON.parse(readFileSync(path, 'utf8')).packages.map(
        ({ package: name }) => name
      )
    }).toEqual({
      lines: [
        `Skipping lodash 4.17.21: lodash 4.17.21 is in the range 4.17.x held since 2026-11-19. ${AXE_HOLD.reason} Run tim deps holds to see the hold.`
      ],
      left: ['eslint']
    })
  })

  test('Should leave the packages file as it is when nothing is held', () => {
    const { root, path } = workspaceWithPackages([
      row('lodash', '4.17.20', '4.17.21')
    ])
    recordPackagePolicies({ workspaceRoot: root, runId: RUN_ID, repo: REPO })
    const before = readFileSync(path, 'utf8')

    const held = removeHeldPackages({
      workspaceRoot: root,
      runId: RUN_ID,
      repo: REPO
    })

    expect({ held, text: readFileSync(path, 'utf8') }).toEqual({
      held: [],
      text: before
    })
  })
})

describe('#recordedPolicyOf', () => {
  test('Should give null for a row with no policy recorded', () => {
    expect(recordedPolicyOf(row('lodash', '4.17.20', '4.17.21'))).toBeNull()
  })

  test('Should give null for a row whose policy is not one tim knows', () => {
    const recorded = recordedPolicyOf(
      row('lodash', '4.17.20', '4.17.21', {
        policy: 'merge-anyway',
        set: null,
        set_scope: null,
        policy_reason: 'Because.'
      })
    )

    expect(recorded).toBeNull()
  })
})

describe('#recordPackagePolicies', () => {
  test('Should write each package policy into the packages file and keep its other fields', () => {
    const { root, path } = workspaceWithPackages([
      row('eslint', '9.39.0', '10.0.0', { classification: 'manual' }),
      row('lodash', '4.17.20', '4.17.21')
    ])

    recordPackagePolicies({ workspaceRoot: root, runId: RUN_ID, repo: REPO })

    const written = JSON.parse(readFileSync(path, 'utf8')).packages
    expect(written).toEqual([
      expect.objectContaining({
        package: 'eslint',
        classification: 'manual',
        policy: 'changelog-driven',
        set: 'eslint',
        set_scope: 'repo'
      }),
      expect.objectContaining({
        package: 'lodash',
        classification: null,
        policy: 'ci-is-enough',
        set: null,
        set_scope: null
      })
    ])
  })

  test('Should say each package policy and set as text', () => {
    const { root } = workspaceWithPackages([
      row('eslint', '9.39.0', '10.0.0'),
      row('lodash', '4.17.20', '4.17.21')
    ])

    const text = renderPoliciesText(
      recordPackagePolicies({ workspaceRoot: root, runId: RUN_ID, repo: REPO })
    )

    expect(text).toBe(
      'eslint: changelog-driven (set eslint, repo)\nlodash: ci-is-enough'
    )
  })

  test('Should refuse a workspace with no dependency sets', () => {
    const { root } = workspaceWithPackages([
      row('lodash', '4.17.20', '4.17.21')
    ])
    rmSync(join(root, 'config'), { recursive: true })

    const recording = () =>
      recordPackagePolicies({ workspaceRoot: root, runId: RUN_ID, repo: REPO })

    expect(recording).toThrow(/^Can't find config\/dependency-sets.json at /)
  })
})
