import { describe, test, expect, afterEach } from 'vitest'
import { rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { loadDependencySets, reposInScope } from './dependency-sets.js'
import {
  CHECKOUT_WORKSPACE_ROOT,
  createDepsWorkspace,
  fixtureDependencySets
} from '../test-support/deps-workspace.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const setsWith = (change) => change(fixtureDependencySets())

describe('#loadDependencySets', () => {
  test("Should accept the workspace's own config/dependency-sets.json", () => {
    const { sets } = loadDependencySets(CHECKOUT_WORKSPACE_ROOT)

    expect(sets.length).toBeGreaterThan(0)
  })

  test('Should read each set with its name, scope and policy', () => {
    root = createDepsWorkspace()

    const { sets } = loadDependencySets(root)

    expect(
      sets.map(({ name, scope, policy }) => ({ name, scope, policy }))
    ).toEqual([
      { name: 'eslint', scope: 'repo', policy: 'ci-is-enough' },
      { name: 'vitest', scope: 'repo', policy: 'ci-is-enough' },
      { name: 'playwright', scope: 'cross-repo', policy: 'ci-is-enough' },
      {
        name: 'govuk-frontend',
        scope: 'cross-repo',
        policy: 'changelog-driven'
      },
      { name: 'node', scope: 'cross-repo', policy: 'changelog-driven' }
    ])
  })

  test('Should refuse a set whose scope is neither repo nor cross-repo, naming where', () => {
    root = createDepsWorkspace({
      dependencySets: setsWith((config) => ({
        ...config,
        sets: [{ ...config.sets[0], scope: 'workspace' }]
      }))
    })

    expect(() => loadDependencySets(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringMatching(
          /^config\/dependency-sets\.json: sets\.0\.scope /
        )
      })
    )
  })

  test('Should refuse a member that is not an npm package name', () => {
    root = createDepsWorkspace({
      dependencySets: setsWith((config) => ({
        ...config,
        sets: [{ ...config.sets[0], members: ["eslint'"] }]
      }))
    })

    expect(() => loadDependencySets(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message:
          'config/dependency-sets.json: sets.0.members.0 must be an npm package name, with * as a wildcard'
      })
    )
  })

  test('Should refuse two sets with the same name', () => {
    root = createDepsWorkspace({
      dependencySets: setsWith((config) => ({
        ...config,
        sets: [config.sets[0], config.sets[0]]
      }))
    })

    expect(() => loadDependencySets(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message:
          'config/dependency-sets.json: two sets are called "eslint". Give each set its own name.'
      })
    )
  })

  test('Should report a missing file as not found', () => {
    root = createDepsWorkspace()
    unlinkSync(join(root, 'config', 'dependency-sets.json'))

    expect(() => loadDependencySets(root)).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Can't find config/dependency-sets.json at ${join(root, 'config', 'dependency-sets.json')}.`
      })
    )
  })
})

describe('#reposInScope', () => {
  test('Should take the flagged repos, add the included ones and drop the excluded ones, sorted', () => {
    root = createDepsWorkspace({
      dependencySets: setsWith((config) => ({
        ...config,
        defaults: {
          ...config.defaults,
          repos: {
            fromReposJson: 'npmUpgradeDefault',
            include: ['tim', 'trade-imports-plants-prototype'],
            exclude: ['trade-imports-plants-prototype']
          }
        }
      }))
    })

    const inScope = reposInScope(root, loadDependencySets(root))

    expect(inScope).toEqual(['tim', 'trade-imports-animals-frontend'])
  })
})
