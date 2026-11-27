import { describe, test, expect } from 'vitest'
import { mergePolicyFor, setOfPackage } from './policy.js'
import {
  AXE_HOLD,
  SPRINGDOC_HOLD,
  fixtureDependencySets,
  fixtureDependencySetsHolding
} from '../test-support/deps-workspace.js'

const policyOf = (packageName, from, to) =>
  mergePolicyFor({
    dependencySets: fixtureDependencySets(),
    packageName,
    from,
    to
  })

describe('#mergePolicyFor', () => {
  test('Should give a minor of a package in a ci-is-enough set that set and policy', () => {
    const { set, scope, policy } = policyOf('vitest', '4.1.0', '4.2.0')

    expect({ set, scope, policy }).toEqual({
      set: 'vitest',
      scope: 'repo',
      policy: 'ci-is-enough'
    })
  })

  test('Should match a scoped wildcard member to its set', () => {
    expect(policyOf('@vitest/coverage-v8', '4.1.0', '4.1.1').set).toBe('vitest')
  })

  test('Should match a prefix wildcard member to its set', () => {
    expect(policyOf('eslint-plugin-n', '17.1.0', '17.2.0').set).toBe('eslint')
  })

  test('Should match no set for a name that only starts with a member', () => {
    expect(policyOf('eslintx', '1.1.0', '1.2.0').set).toBeNull()
  })

  test('Should make a major of a package in a ci-is-enough set changelog-driven', () => {
    const { jump, policy } = policyOf('eslint', '9.30.0', '10.0.0')

    expect({ jump, policy }).toEqual({
      jump: 'major',
      policy: 'changelog-driven'
    })
  })

  test('Should make a major of a package in no set changelog-driven', () => {
    expect(policyOf('chai', '5.2.0', '6.0.0').policy).toBe('changelog-driven')
  })

  test('Should give a major the policy for majors in the sets file', () => {
    const dependencySets = fixtureDependencySets()
    dependencySets.defaults.majorPolicy = 'ci-is-enough'

    const { policy } = mergePolicyFor({
      dependencySets,
      packageName: 'chai',
      from: '5.2.0',
      to: '6.0.0'
    })

    expect(policy).toBe('ci-is-enough')
  })

  test('Should make a patch in a changelog-driven set changelog-driven, with its cross-repo scope', () => {
    const { scope, policy } = policyOf('govuk-frontend', '6.5.0', '6.5.1')

    expect({ scope, policy }).toEqual({
      scope: 'cross-repo',
      policy: 'changelog-driven'
    })
  })

  test('Should make a minor of a package in no set ci-is-enough', () => {
    expect(policyOf('lodash', '4.16.0', '4.17.0')).toEqual({
      package: 'lodash',
      from: '4.16.0',
      to: '4.17.0',
      jump: 'minor',
      set: null,
      scope: null,
      hold: null,
      policy: 'ci-is-enough',
      reason: 'lodash is in no set, and a minor upgrade needs only green CI.'
    })
  })

  test('Should make a patch of a package in no set ci-is-enough', () => {
    const { jump, policy } = policyOf('lodash', '4.17.20', '4.17.21')

    expect({ jump, policy }).toEqual({ jump: 'patch', policy: 'ci-is-enough' })
  })

  test('Should make a 0.x minor changelog-driven even in a ci-is-enough set', () => {
    const { set, policy } = policyOf('neostandard', '0.13.0', '0.14.0')

    expect({ set, policy }).toEqual({
      set: 'eslint',
      policy: 'changelog-driven'
    })
  })

  test('Should make a 0.x patch take its set policy', () => {
    expect(policyOf('neostandard', '0.13.0', '0.13.1').policy).toBe(
      'ci-is-enough'
    )
  })

  test('Should make a prerelease target changelog-driven', () => {
    const { jump, policy } = policyOf('vitest', '4.1.0', '4.2.0-beta.1')

    expect({ jump, policy }).toEqual({
      jump: 'prerelease',
      policy: 'changelog-driven'
    })
  })

  test("Should give a set member the set's reason", () => {
    expect(policyOf('vitest', '4.1.0', '4.2.0').reason).toBe(
      'vitest is in the vitest set. @vitest/coverage-v8 and the other @vitest packages pin the exact vitest version they were released with.'
    )
  })

  describe('with a hold on @axe-core/playwright 4.14.x in the animals frontend', () => {
    const heldPolicyOf = (to, repo) =>
      mergePolicyFor({
        dependencySets: fixtureDependencySetsHolding([AXE_HOLD]),
        packageName: AXE_HOLD.package,
        from: '4.13.0',
        to,
        repo
      })

    test('Should make a target in the held range held, naming the hold', () => {
      const { hold, policy, reason } = heldPolicyOf(
        '4.14.1',
        'trade-imports-animals-frontend'
      )

      expect({ hold, policy, reason }).toEqual({
        hold: AXE_HOLD,
        policy: 'held',
        reason: `@axe-core/playwright 4.14.1 is in the range 4.14.x held since 2026-11-19. ${AXE_HOLD.reason} Run tim deps holds to see the hold.`
      })
    })

    test('Should count the hold when no repo is given', () => {
      expect(heldPolicyOf('4.14.0').policy).toBe('held')
    })

    test('Should leave a target past the held range to its usual policy', () => {
      const { hold, policy } = heldPolicyOf(
        '4.15.0',
        'trade-imports-animals-frontend'
      )

      expect({ hold, policy }).toEqual({ hold: null, policy: 'ci-is-enough' })
    })

    test('Should leave a repo the hold does not cover to its usual policy', () => {
      expect(heldPolicyOf('4.14.0', 'tim').policy).toBe('ci-is-enough')
    })
  })

  describe('with a Maven hold on springdoc-openapi [3.0.0,4.0.0) in the animals backend', () => {
    const heldPolicyOf = (to, repo) =>
      mergePolicyFor({
        dependencySets: fixtureDependencySetsHolding([SPRINGDOC_HOLD]),
        packageName: SPRINGDOC_HOLD.package,
        from: '2.8.9',
        to,
        repo
      })

    test('Should make a target in the held Maven range held, naming the hold', () => {
      const { hold, policy, reason } = heldPolicyOf(
        '3.2.1',
        'trade-imports-animals-backend'
      )

      expect({ hold, policy, reason }).toEqual({
        hold: SPRINGDOC_HOLD,
        policy: 'held',
        reason: `${SPRINGDOC_HOLD.package} 3.2.1 is in the range [3.0.0,4.0.0) held since 2026-11-27. ${SPRINGDOC_HOLD.reason} Run tim deps holds to see the hold.`
      })
    })

    test('Should leave a minor below the held Maven range to its usual policy', () => {
      const { hold, policy } = heldPolicyOf(
        '2.9.0',
        'trade-imports-animals-backend'
      )

      expect({ hold, policy }).toEqual({ hold: null, policy: 'ci-is-enough' })
    })

    test('Should leave a target past the held Maven range to the policy for majors', () => {
      const { hold, policy } = heldPolicyOf(
        '4.0.0',
        'trade-imports-animals-backend'
      )

      expect({ hold, policy }).toEqual({
        hold: null,
        policy: 'changelog-driven'
      })
    })

    test('Should leave a repo the Maven hold does not cover to its usual policy', () => {
      expect(heldPolicyOf('3.2.1', 'trade-imports-stub').policy).toBe(
        'changelog-driven'
      )
    })
  })

  test('Should accept versions with a leading v', () => {
    const { from, to } = policyOf('lodash', 'v4.17.20', 'v4.17.21')

    expect({ from, to }).toEqual({ from: '4.17.20', to: '4.17.21' })
  })

  test('Should refuse a range as a usage error', () => {
    expect(() => policyOf('lodash', '^4.17.20', '4.17.21')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message:
          '--from must be an exact version, such as 4.2.0. You gave "^4.17.20".'
      })
    )
  })

  test('Should refuse a target that is not later as a usage error', () => {
    expect(() => policyOf('lodash', '4.17.21', '4.17.21')).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message:
          '--to must be a later version than --from. You gave 4.17.21 to 4.17.21.'
      })
    )
  })
})

describe('#setOfPackage', () => {
  test('Should match a member with regex characters in it literally', () => {
    const sets = [{ name: 'dotted', members: ['a.b'] }]

    expect(setOfPackage(sets, 'axb')).toBeUndefined()
  })
})
