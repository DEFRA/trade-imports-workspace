import { describe, expect, test } from 'vitest'
import { parseStartFlags, START_USAGE } from './flags.js'

const NO_FLAGS = {
  help: false,
  branch: '',
  excluded: [],
  profiles: [],
  domain: '',
  dev: false,
  perf: false,
  extra: []
}

const errorOf = (args, env = {}) => {
  try {
    parseStartFlags(args, { env })
    return null
  } catch (error) {
    return { message: error.message, showUsage: error.showUsage }
  }
}

describe('#parseStartFlags', () => {
  describe('valid flags', () => {
    test.each([
      [[], {}],
      [['-b', 'feat/x'], { branch: 'feat/x' }],
      [['--branch', 'feat/x'], { branch: 'feat/x' }],
      [['--branch=feat/x'], { branch: 'feat/x' }],
      [['--branch='], { branch: '' }],
      [
        ['-e', 'frontend', '--exclude', 'backend', '--exclude=gateway'],
        { excluded: ['frontend', 'backend', 'gateway'] }
      ],
      [
        ['--profile', 'database', '--profile=security'],
        { profiles: ['database', 'security'] }
      ],
      [['--domain', 'plants'], { domain: 'plants' }],
      [['--domain=animals-admin'], { domain: 'animals-admin' }],
      [
        ['--domain', 'ins', '-d', '-e', 'routing-proxy'],
        { domain: 'ins', dev: true, excluded: ['routing-proxy'] }
      ],
      [['-d'], { dev: true }],
      [['--dev', '--perf'], { dev: true, perf: true }],
      [
        ['-d', '--', '--timeout', '5', '--help'],
        { dev: true, extra: ['--timeout', '5', '--help'] }
      ],
      [['-b', '--help'], { branch: '--help' }]
    ])('Should read %j', (args, expected) => {
      expect(parseStartFlags(args, { env: {} })).toEqual({
        ...NO_FLAGS,
        ...expected
      })
    })

    test.each([[['--help']], [['-d', '-h']], [['-b', 'x', '-d', '--help']]])(
      'Should stop at the help flag in %j, and check nothing',
      (args) => {
        expect(parseStartFlags(args, { env: {} }).help).toBe(true)
      }
    )

    test.each(['zero-delay', 'sla', ''])(
      'Should take --perf with STUB_PROFILE "%s"',
      (stubProfile) => {
        expect(
          parseStartFlags(['--perf'], { env: { STUB_PROFILE: stubProfile } })
            .perf
        ).toBe(true)
      }
    )
  })

  describe('invalid flags', () => {
    test.each([
      [['-b'], 'error: --branch requires a value', false],
      [['--exclude'], 'error: --exclude requires a value', false],
      [['--profile'], 'error: --profile requires a value', false],
      [['--bogus'], 'error: unexpected argument: --bogus', true],
      [['--bogus', '--help'], 'error: unexpected argument: --bogus', true],
      [
        ['-b', 'feat/x', '-d'],
        'error: --branch and --dev are mutually exclusive',
        false
      ],
      [
        ['-e', 'nope'],
        "error: unknown --exclude label 'nope'; valid: frontend, backend, admin, ins-frontend, routing-proxy, stub, defra-id-stub, reference-data, address-book, gateway, ins-backend, plants-frontend, plants-backend",
        false
      ],
      [
        ['--profile', 'nope'],
        "error: unknown --profile name 'nope'; valid: database, infrastructure, servicebus, stubs, backend, frontend, security, monitoring",
        false
      ],
      [['--domain'], 'error: --domain requires a value', false],
      [
        ['--domain', 'germinal'],
        "error: unknown --domain name 'germinal'; valid: animals, animals-admin, ins, plants",
        false
      ]
    ])('Should refuse %j with "%s"', (args, message, showUsage) => {
      expect(errorOf(args)).toEqual({ message, showUsage })
    })

    test('Should refuse --perf with an unknown STUB_PROFILE', () => {
      expect(errorOf(['--perf'], { STUB_PROFILE: 'slow' })).toEqual({
        message: "error: STUB_PROFILE must be zero-delay or sla, not 'slow'",
        showUsage: false
      })
    })

    test('Should leave STUB_PROFILE alone without --perf', () => {
      expect(errorOf([], { STUB_PROFILE: 'slow' })).toBeNull()
    })
  })
})

describe('START_USAGE', () => {
  test('Should name every service label and profile the flags take', () => {
    expect([
      START_USAGE.includes(
        'Labels: frontend, backend, admin, ins-frontend, routing-proxy, stub, defra-id-stub, reference-data, address-book, gateway, ins-backend, plants-frontend, plants-backend.'
      ),
      START_USAGE.includes(
        'Profiles: database, infrastructure, servicebus, stubs, backend, frontend, security, monitoring.'
      )
    ]).toEqual([true, true])
  })
})
