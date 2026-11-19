import { describe, test, expect, afterEach } from 'vitest'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { holdPackage, liftHold, localDateOf } from './holds.js'
import { loadDependencySets } from './dependency-sets.js'
import {
  AXE_HOLD,
  createDepsWorkspace,
  fixtureDependencySetsHolding,
  fixtureDependencySetsText
} from '../test-support/deps-workspace.js'

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const { since, ...AXE_REQUEST } = AXE_HOLD

const fileText = () =>
  readFileSync(join(root, 'config', 'dependency-sets.json'), 'utf8')

describe('#holdPackage', () => {
  test('Should record a new hold dated today and list its repos to regenerate', () => {
    root = createDepsWorkspace()

    const result = holdPackage({
      workspaceRoot: root,
      request: AXE_REQUEST,
      today: '2026-11-20'
    })

    expect({ result, holds: loadDependencySets(root).holds }).toEqual({
      result: {
        hold: { ...AXE_HOLD, since: '2026-11-20' },
        replaced: null,
        regenerate: ['trade-imports-animals-frontend']
      },
      holds: [{ ...AXE_HOLD, since: '2026-11-20' }]
    })
  })

  test("Should replace a package's hold in place and list the repos of both to regenerate", () => {
    const lodashHold = { ...AXE_HOLD, package: 'lodash' }
    const oldAxeHold = { ...AXE_HOLD, repos: ['tim'], versions: '4.13.x' }
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([oldAxeHold, lodashHold])
    })

    const result = holdPackage({
      workspaceRoot: root,
      request: AXE_REQUEST,
      today: '2026-11-20'
    })

    expect({
      replaced: result.replaced,
      regenerate: result.regenerate,
      holds: loadDependencySets(root).holds
    }).toEqual({
      replaced: oldAxeHold,
      regenerate: ['tim', 'trade-imports-animals-frontend'],
      holds: [{ ...AXE_HOLD, since: '2026-11-20' }, lodashHold]
    })
  })

  test('Should sort the repos and drop repeats', () => {
    root = createDepsWorkspace()

    const { hold } = holdPackage({
      workspaceRoot: root,
      request: {
        ...AXE_REQUEST,
        repos: ['trade-imports-animals-frontend', 'tim', 'tim']
      },
      today: '2026-11-20'
    })

    expect(hold.repos).toEqual(['tim', 'trade-imports-animals-frontend'])
  })

  test('Should leave out clashesWith and link when they are not given', () => {
    root = createDepsWorkspace()
    const { clashesWith, link, ...plainRequest } = AXE_REQUEST

    const { hold } = holdPackage({
      workspaceRoot: root,
      request: plainRequest,
      today: '2026-11-20'
    })

    expect(Object.keys(hold)).toEqual([
      'package',
      'versions',
      'repos',
      'reason',
      'failingTest',
      'since'
    ])
  })

  test('Should refuse a repo out of scope as a usage error and leave the file as it was', () => {
    root = createDepsWorkspace()
    const original = fileText()

    expect(() =>
      holdPackage({
        workspaceRoot: root,
        request: { ...AXE_REQUEST, repos: ['trade-imports-animals-backend'] },
        today: '2026-11-20'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message:
          'trade-imports-animals-backend is not in scope for the dependency sets. Repos in scope: tim, trade-imports-animals-frontend.'
      })
    )
    expect(fileText()).toBe(original)
  })

  test('Should refuse a malformed hold as a usage error naming the field', () => {
    root = createDepsWorkspace()

    expect(() =>
      holdPackage({
        workspaceRoot: root,
        request: { ...AXE_REQUEST, link: 'pr 492' },
        today: '2026-11-20'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: "The hold's link must be a URL."
      })
    )
  })
})

describe('#liftHold', () => {
  test('Should remove the hold and list its repos to regenerate', () => {
    const lodashHold = { ...AXE_HOLD, package: 'lodash' }
    root = createDepsWorkspace({
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD, lodashHold])
    })

    const result = liftHold({
      workspaceRoot: root,
      packageName: '@axe-core/playwright'
    })

    expect({ result, holds: loadDependencySets(root).holds }).toEqual({
      result: {
        lifted: AXE_HOLD,
        regenerate: ['trade-imports-animals-frontend']
      },
      holds: [lodashHold]
    })
  })

  test('Should refuse a package that is not held as not found', () => {
    root = createDepsWorkspace()

    expect(() =>
      liftHold({ workspaceRoot: root, packageName: '@axe-core/playwright' })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message:
          '@axe-core/playwright is not held. Run tim deps holds to see the held packages.'
      })
    )
  })

  test('Should give back the committed fixture text byte for byte after a hold and its lift', () => {
    root = createDepsWorkspace({
      dependencySetsText: fixtureDependencySetsText()
    })
    holdPackage({ workspaceRoot: root, request: AXE_REQUEST, today: since })

    liftHold({ workspaceRoot: root, packageName: AXE_HOLD.package })

    expect(fileText()).toBe(fixtureDependencySetsText())
  })
})

describe('#localDateOf', () => {
  test('Should give the local calendar date with zero-padded month and day', () => {
    expect(localDateOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
