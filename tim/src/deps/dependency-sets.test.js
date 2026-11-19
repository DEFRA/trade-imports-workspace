import { describe, test, expect, afterEach } from 'vitest'
import { readFileSync, rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import {
  loadDependencySets,
  reposInScope,
  writeHolds
} from './dependency-sets.js'
import {
  AXE_HOLD,
  CHECKOUT_WORKSPACE_ROOT,
  createDepsWorkspace,
  fixtureDependencySets,
  fixtureDependencySetsHolding,
  fixtureDependencySetsText
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

  test('Should read each hold with every field it records', () => {
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD])
    })

    const { holds } = loadDependencySets(root)

    expect(holds).toEqual([AXE_HOLD])
  })

  test('Should accept a hold without clashesWith or link', () => {
    const { clashesWith, link, ...plainHold } = AXE_HOLD
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([plainHold])
    })

    const { holds } = loadDependencySets(root)

    expect(holds).toEqual([plainHold])
  })

  test.each([
    [
      'a wildcard package',
      { package: '@axe-core/*' },
      'holds.0.package must be an exact npm package name'
    ],
    [
      'versions with a quote mark',
      { versions: "4.14.x'" },
      'holds.0.versions must be a Dependabot version range, such as 4.14.x, with no quote marks'
    ],
    [
      'versions npm cannot read as a range',
      { versions: 'four point fourteen' },
      'holds.0.versions must be a version range npm understands, such as 4.14.x'
    ],
    ['no repos', { repos: [] }, 'holds.0.repos must name at least one repo'],
    [
      'an empty failing test',
      { failingTest: '' },
      'holds.0.failingTest must name the test or check the new version breaks'
    ],
    [
      'a link that is not a URL',
      { link: 'pr 492' },
      'holds.0.link must be a URL'
    ],
    [
      'a since that is not a date',
      { since: '19 Nov' },
      'holds.0.since must be YYYY-MM-DD'
    ]
  ])('Should refuse a hold with %s, naming where', (_case, change, message) => {
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([{ ...AXE_HOLD, ...change }])
    })

    expect(() => loadDependencySets(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message: `config/dependency-sets.json: ${message}`
      })
    )
  })

  test('Should refuse a file with no holds list', () => {
    const { holds, ...withoutHolds } = fixtureDependencySets()
    root = createDepsWorkspace({ dependencySets: withoutHolds })

    expect(() => loadDependencySets(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringMatching(/^config\/dependency-sets\.json: holds /)
      })
    )
  })

  test('Should refuse two holds on one package', () => {
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD, AXE_HOLD])
    })

    expect(() => loadDependencySets(root)).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message:
          'config/dependency-sets.json: @axe-core/playwright is held twice. Keep one hold per package.'
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

describe('#writeHolds', () => {
  const fileText = () =>
    readFileSync(join(root, 'config', 'dependency-sets.json'), 'utf8')

  test('Should write the holds and leave every other field as it was', () => {
    root = createDepsWorkspace()

    writeHolds(root, [AXE_HOLD])

    expect(JSON.parse(fileText())).toEqual(
      fixtureDependencySetsHolding([AXE_HOLD])
    )
  })

  test('Should give back the committed fixture text byte for byte when the holds are emptied again', () => {
    root = createDepsWorkspace({
      dependencySetsText: fixtureDependencySetsText()
    })

    writeHolds(root, [AXE_HOLD])
    writeHolds(root, [])

    expect(fileText()).toBe(fixtureDependencySetsText())
  })

  test('Should refuse a malformed hold and leave the file as it was', () => {
    root = createDepsWorkspace()
    const original = fileText()

    expect(() => writeHolds(root, [{ ...AXE_HOLD, since: 'today' }])).toThrow(
      expect.objectContaining({
        code: 'PARSE',
        message: 'config/dependency-sets.json: holds.0.since must be YYYY-MM-DD'
      })
    )
    expect(fileText()).toBe(original)
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
