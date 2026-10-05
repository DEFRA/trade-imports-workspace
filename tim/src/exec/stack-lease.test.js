import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  chmodSync,
  rmSync,
  utimesSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { stackFilesFingerprint } from './stack-fingerprints.js'
import {
  acquireStack,
  releaseStack,
  readLease,
  defaultLeasePath,
  describeLease,
  recordLeaseContainers,
  recordLeaseFingerprints
} from './stack-lease.js'

const HOLDER = 'ibl-20261001T090000Z inc-003 consistency'
// Above the highest pid macOS and Linux hand out by default.
const DEAD_PID = 4_194_305
const OTHER = 'ibl-20261001T080000Z inc-001 ladder'

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-stack-lease-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeExecutable = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

const statePath = () => join(root, 'stack-state')
const callsPath = () => join(root, 'stack-calls')
const leasePath = () => join(root, 'state', 'stack-lease.json')
const logPath = () => join(root, 'logs', 'lease.log')

// Stack scripts and a `docker` that share one state file: run-stack.sh marks
// the stack up, stop-stack.sh marks it down, and `docker ps` lists a
// container while it is up. Every stack script call is recorded.
const fakeStack = ({ upFails = false, downFails = false } = {}) => {
  writeExecutable(
    join(root, 'scripts', 'stack', 'run-stack.sh'),
    `echo "run-stack.sh $*" >> '${callsPath()}'\n${upFails ? 'exit 9' : `echo c1 > '${statePath()}'`}`
  )
  writeExecutable(
    join(root, 'scripts', 'stack', 'stop-stack.sh'),
    `echo "stop-stack.sh $*" >> '${callsPath()}'\n${downFails ? 'exit 5' : `rm -f '${statePath()}'`}`
  )
  writeExecutable(
    join(root, 'fake-bin', 'docker'),
    `if [ "$1" = ps ] && [ -f '${statePath()}' ]; then cat '${statePath()}'; fi`
  )
  return { PATH: `${join(root, 'fake-bin')}:${process.env.PATH}` }
}

const stackIsUp = () => existsSync(statePath())
const markUp = (containers = 'c1') =>
  writeFileSync(statePath(), `${containers}\n`)
const calls = () =>
  existsSync(callsPath())
    ? readFileSync(callsPath(), 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.trim())
    : []

const writeLease = (lease) => {
  mkdirSync(dirname(leasePath()), { recursive: true })
  writeFileSync(
    leasePath(),
    JSON.stringify({
      mode: 'dev',
      acquiredAt: '2026-10-01T08:00:00.000Z',
      branches: {},
      state: 'up',
      pid: null,
      containers: ['c1'],
      ...lease
    })
  )
}

const acquire = (env, options = {}) =>
  acquireStack({
    workspaceRoot: root,
    holder: HOLDER,
    leasePath: leasePath(),
    logPath: logPath(),
    env,
    ...options
  })

const release = (env, options = {}) =>
  releaseStack({
    workspaceRoot: root,
    holder: HOLDER,
    leasePath: leasePath(),
    logPath: logPath(),
    env,
    ...options
  })

describe('acquireStack', () => {
  test('starts a stack that is down from local source and leases it to the holder', async () => {
    const env = fakeStack()

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      started: outcome.started,
      calls: calls(),
      up: stackIsUp(),
      lease: readLease(leasePath())
    }).toEqual({
      acquired: true,
      started: true,
      calls: ['run-stack.sh -d'],
      up: true,
      lease: expect.objectContaining({
        holder: HOLDER,
        mode: 'dev',
        state: 'up',
        workspace: root
      })
    })
  })

  test('starts the published images in up mode', async () => {
    const env = fakeStack()

    await acquire(env, { mode: 'up' })

    expect(calls()).toEqual(['run-stack.sh'])
  })

  test('starts the published images with --perf in perf mode', async () => {
    const env = fakeStack()

    await acquire(env, { mode: 'perf' })

    expect(calls()).toEqual(['run-stack.sh --perf'])
  })

  test('records the stub profile a perf lease started with, sla by default', async () => {
    const env = fakeStack()

    await acquire(env, { mode: 'perf' })

    expect(readLease(leasePath())).toEqual(
      expect.objectContaining({ mode: 'perf', stubProfile: 'sla' })
    )
  })

  test('records STUB_PROFILE as the perf lease’s stub profile, and the script sees it', async () => {
    const env = fakeStack()
    writeExecutable(
      join(root, 'scripts', 'stack', 'run-stack.sh'),
      `echo "run-stack.sh $* STUB_PROFILE=$STUB_PROFILE" >> '${callsPath()}'\necho c1 > '${statePath()}'`
    )

    await acquire({ ...env, STUB_PROFILE: 'zero-delay' }, { mode: 'perf' })

    expect({
      stubProfile: readLease(leasePath()).stubProfile,
      calls: calls()
    }).toEqual({
      stubProfile: 'zero-delay',
      calls: ['run-stack.sh --perf STUB_PROFILE=zero-delay']
    })
  })

  test('records no fingerprints or branches in perf mode, which builds nothing', async () => {
    const env = fakeStack()

    await acquire(env, { mode: 'perf' })

    expect(readLease(leasePath())).toEqual(
      expect.objectContaining({ fingerprints: {}, branches: {} })
    )
  })

  test('gives a lease in any other mode no stub profile', async () => {
    const env = fakeStack()

    await acquire(env)

    expect(readLease(leasePath())).not.toHaveProperty('stubProfile')
  })

  test('records the branch each repo under repos/ is on', async () => {
    const env = fakeStack()
    const repo = join(root, 'repos', 'trade-imports-ins-frontend')
    await execa('git', ['init', '--quiet', '-b', 'feat/EUDPA-7-x', repo])

    const outcome = await acquire(env)

    expect(outcome.lease.branches).toEqual({
      'trade-imports-ins-frontend': 'feat/EUDPA-7-x'
    })
  })

  test('records the build and source fingerprints of each service the dev overlay builds', async () => {
    const env = fakeStack()
    const repo = join(root, 'repos', 'web')
    mkdirSync(join(repo, 'src'), { recursive: true })
    writeFileSync(join(repo, 'src', 'index.js'), 'export {}\n')
    await execa('git', ['init', '--quiet', repo])
    mkdirSync(join(root, 'docker', 'stack'), { recursive: true })
    writeFileSync(
      join(root, 'docker', 'stack', 'dev.compose.yml'),
      'services:\n  web:\n    build:\n      context: ../../repos/web\n    volumes:\n      - ../../repos/web/src:/app/src\n'
    )

    const outcome = await acquire(env)

    const fingerprints = {
      web: {
        build: expect.stringMatching(/^[0-9a-f]{64}$/),
        source: expect.stringMatching(/^[0-9a-f]{64}$/)
      }
    }
    expect({
      onDisk: readLease(leasePath()).fingerprints,
      returned: outcome.lease.fingerprints
    }).toEqual({ onDisk: fingerprints, returned: fingerprints })
  })

  test.each(['dev', 'up'])(
    'records the fingerprint of the workspace’s stack files in %s mode',
    async (mode) => {
      const env = fakeStack()
      await execa('git', ['init', '--quiet', root])

      const outcome = await acquire(env, { mode })

      const current = await stackFilesFingerprint(root)
      expect({
        current,
        onDisk: readLease(leasePath()).stackFiles,
        returned: outcome.lease.stackFiles
      }).toEqual({
        current: expect.stringMatching(/^[0-9a-f]{64}$/),
        onDisk: current,
        returned: current
      })
    }
  )

  test('records no stack files fingerprint for a workspace that is not a git checkout', async () => {
    const env = fakeStack()

    await acquire(env)

    expect(readLease(leasePath()).stackFiles).toBeNull()
  })

  test('records no fingerprints in up mode, which builds nothing', async () => {
    const env = fakeStack()

    await acquire(env, { mode: 'up' })

    expect(readLease(leasePath()).fingerprints).toEqual({})
  })

  test('reuses a stack the same holder already leases, without touching it', async () => {
    const env = fakeStack()
    markUp()
    writeLease({ holder: HOLDER })

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      reused: outcome.reused,
      calls: calls()
    }).toEqual({ acquired: true, reused: true, calls: [] })
  })

  test('refuses a stack leased to another holder, naming who holds it, and leaves it alone', async () => {
    const env = fakeStack()
    markUp()
    writeLease({ holder: OTHER })

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      refused: outcome.refused,
      holder: outcome.holder,
      reason: outcome.reason,
      calls: calls(),
      up: stackIsUp(),
      leaseHolder: readLease(leasePath()).holder
    }).toEqual({
      acquired: false,
      refused: true,
      holder: OTHER,
      reason: `The workspace stack is leased to "${OTHER}" (dev mode, since 2026-10-01T08:00:00.000Z). Leave it alone: it is theirs to release.`,
      calls: [],
      up: true,
      leaseHolder: OTHER
    })
  })

  test('refuses a stack that is up with no lease, as one somebody started by hand', async () => {
    const env = fakeStack()
    markUp()

    const outcome = await acquire(env)

    expect({
      refused: outcome.refused,
      holder: outcome.holder,
      reason: outcome.reason,
      calls: calls(),
      lease: readLease(leasePath())
    }).toEqual({
      refused: true,
      holder: null,
      reason:
        'The workspace stack is up and nobody holds a lease on it, so somebody started it by hand (tim docker dev, say), outside any build. Leave it alone: ask whoever started it to take it down.',
      calls: [],
      lease: null
    })
  })

  test('replaces a lease whose stack has gone and starts the stack again', async () => {
    const env = fakeStack()
    writeLease({ holder: OTHER })

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      replaced: outcome.replaced,
      holder: readLease(leasePath()).holder,
      calls: calls()
    }).toEqual({
      acquired: true,
      replaced: OTHER,
      holder: HOLDER,
      calls: ['run-stack.sh -d']
    })
  })

  test('refuses a stack another holder is still starting', async () => {
    const env = fakeStack()
    writeLease({ holder: OTHER, state: 'starting', pid: process.pid })

    const outcome = await acquire(env)

    expect({
      refused: outcome.refused,
      reason: outcome.reason,
      calls: calls()
    }).toEqual({
      refused: true,
      reason: expect.stringContaining('still starting'),
      calls: []
    })
  })

  test('records the containers it started in the lease', async () => {
    const env = fakeStack()

    const outcome = await acquire(env)

    expect(outcome.lease.containers).toEqual(['c1'])
  })

  test('takes down and restarts a stack its own start left half-done', async () => {
    const env = fakeStack()
    markUp()
    writeLease({
      holder: HOLDER,
      state: 'starting',
      pid: DEAD_PID,
      containers: []
    })

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      started: outcome.started,
      calls: calls(),
      state: readLease(leasePath()).state
    }).toEqual({
      acquired: true,
      started: true,
      calls: ['stop-stack.sh', 'run-stack.sh -d'],
      state: 'up'
    })
  })

  test('refuses while its own start is still running', async () => {
    const env = fakeStack()
    markUp()
    writeLease({ holder: HOLDER, state: 'starting', pid: process.pid })

    const outcome = await acquire(env)

    expect({
      refused: outcome.refused,
      reason: outcome.reason,
      calls: calls()
    }).toEqual({
      refused: true,
      reason: expect.stringContaining('that start is still running'),
      calls: []
    })
  })

  test('refuses its own lease when the stack was restarted by hand under it, and leaves the stack alone', async () => {
    const env = fakeStack()
    markUp('c2')
    writeLease({ holder: HOLDER })

    const outcome = await acquire(env)

    expect({
      refused: outcome.refused,
      reason: outcome.reason,
      calls: calls(),
      up: stackIsUp()
    }).toEqual({
      refused: true,
      reason: expect.stringContaining(
        'its containers are not the ones that lease started: somebody restarted it by hand since'
      ),
      calls: [],
      up: true
    })
  })

  test('does not take over a stale lease while another takeover holds the lock', async () => {
    const env = fakeStack()
    writeLease({ holder: OTHER })
    mkdirSync(`${leasePath()}.lock`)

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      calls: calls(),
      holder: readLease(leasePath()).holder
    }).toEqual({ acquired: false, calls: [], holder: OTHER })
  })

  test('breaks a takeover lock left by a process that died a minute ago', async () => {
    const env = fakeStack()
    writeLease({ holder: OTHER })
    mkdirSync(`${leasePath()}.lock`)
    const longAgo = new Date(Date.now() - 120_000)
    utimesSync(`${leasePath()}.lock`, longAgo, longAgo)

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      holder: readLease(leasePath()).holder
    }).toEqual({ acquired: true, holder: HOLDER })
  })

  test('takes the stack down and clears the lease when it does not come up', async () => {
    const env = fakeStack({ upFails: true })

    const outcome = await acquire(env)

    expect({
      acquired: outcome.acquired,
      refused: outcome.refused,
      reason: outcome.reason,
      calls: calls(),
      lease: readLease(leasePath())
    }).toEqual({
      acquired: false,
      refused: false,
      reason: expect.stringMatching(
        /^The workspace stack did not come up \(run-stack.sh exited 9\)\. Read .*lease\.log\. It was taken down again and the lease cleared\.$/
      ),
      calls: ['run-stack.sh -d', 'stop-stack.sh'],
      lease: null
    })
  })
})

describe('releaseStack', () => {
  test('takes down the stack its holder leases and clears the lease', async () => {
    const env = fakeStack()
    markUp()
    writeLease({ holder: HOLDER })

    const outcome = await release(env)

    expect({
      released: outcome.released,
      stoppedStack: outcome.stoppedStack,
      calls: calls(),
      up: stackIsUp(),
      lease: readLease(leasePath())
    }).toEqual({
      released: true,
      stoppedStack: true,
      calls: ['stop-stack.sh'],
      up: false,
      lease: null
    })
  })

  test('refuses to release a lease another holder has, and leaves the stack up', async () => {
    const env = fakeStack()
    markUp()
    writeLease({ holder: OTHER })

    const outcome = await release(env)

    expect({
      released: outcome.released,
      refused: outcome.refused,
      holder: outcome.holder,
      calls: calls(),
      up: stackIsUp(),
      leaseHolder: readLease(leasePath()).holder
    }).toEqual({
      released: false,
      refused: true,
      holder: OTHER,
      calls: [],
      up: true,
      leaseHolder: OTHER
    })
  })

  test('never takes down a stack nobody leases', async () => {
    const env = fakeStack()
    markUp()

    const outcome = await release(env)

    expect({
      released: outcome.released,
      reason: outcome.reason,
      calls: calls(),
      up: stackIsUp()
    }).toEqual({
      released: false,
      reason:
        'Nobody holds a lease on the workspace stack, so there is nothing to release. The stack was left as it is.',
      calls: [],
      up: true
    })
  })

  test('clears its own lease without a script when the stack has already gone', async () => {
    const env = fakeStack()
    writeLease({ holder: HOLDER })

    const outcome = await release(env)

    expect({
      released: outcome.released,
      calls: calls(),
      lease: readLease(leasePath())
    }).toEqual({ released: true, calls: [], lease: null })
  })

  test('never takes down a stack restarted by hand under its lease, and clears the lease', async () => {
    const env = fakeStack()
    markUp('c2')
    writeLease({ holder: HOLDER })

    const outcome = await release(env)

    expect({
      released: outcome.released,
      foreign: outcome.foreign,
      calls: calls(),
      up: stackIsUp(),
      lease: readLease(leasePath())
    }).toEqual({
      released: false,
      foreign: true,
      calls: [],
      up: true,
      lease: null
    })
  })

  test('keeps the lease when the stack does not come down', async () => {
    const env = fakeStack({ downFails: true })
    markUp()
    writeLease({ holder: HOLDER })

    const outcome = await release(env)

    expect({
      released: outcome.released,
      reason: outcome.reason,
      leaseHolder: readLease(leasePath()).holder
    }).toEqual({
      released: false,
      reason: expect.stringContaining(
        'The workspace stack did not come down (stop-stack.sh exited 5).'
      ),
      leaseHolder: HOLDER
    })
  })
})

describe('readLease', () => {
  test('says what to do when the lease file is not JSON', () => {
    mkdirSync(dirname(leasePath()), { recursive: true })
    writeFileSync(leasePath(), 'not json')

    expect(() => readLease(leasePath())).toThrowError(
      /The stack lease at .* is not valid JSON/
    )
  })
})

describe('defaultLeasePath', () => {
  test('uses TIM_STACK_LEASE when it is set', () => {
    expect(defaultLeasePath({ TIM_STACK_LEASE: '/tmp/lease.json' })).toBe(
      '/tmp/lease.json'
    )
  })

  test('sits under XDG_STATE_HOME, outside every repo', () => {
    expect(defaultLeasePath({ XDG_STATE_HOME: '/state' })).toBe(
      '/state/tim/stack-lease.json'
    )
  })
})

describe('describeLease', () => {
  test('names the holder, mode, start time and branches', () => {
    expect(
      describeLease({
        holder: HOLDER,
        mode: 'dev',
        acquiredAt: '2026-10-01T09:00:00.000Z',
        branches: { 'trade-imports-stub': 'main' },
        state: 'up'
      })
    ).toBe(
      `"${HOLDER}" (dev mode, since 2026-10-01T09:00:00.000Z, repos on trade-imports-stub main)`
    )
  })

  test('describes a perf lease with its stub profile', () => {
    expect(
      describeLease({
        holder: 'perf',
        mode: 'perf',
        stubProfile: 'sla',
        acquiredAt: '2026-10-01T08:00:00.000Z',
        branches: {},
        state: 'up'
      })
    ).toBe('"perf" (perf mode, stubs on sla, since 2026-10-01T08:00:00.000Z)')
  })
})

describe('recordLeaseContainers', () => {
  test('records the containers a rebuild under the holder’s own lease created', async () => {
    const env = fakeStack()
    markUp('c9')
    writeLease({ holder: HOLDER, containers: ['c1'] })

    const updated = await recordLeaseContainers({
      holder: HOLDER,
      leasePath: leasePath(),
      env
    })

    expect({ updated, containers: readLease(leasePath()).containers }).toEqual({
      updated: true,
      containers: ['c9']
    })
  })

  test('leaves a lease somebody else holds alone', async () => {
    const env = fakeStack()
    markUp('c9')
    writeLease({ holder: OTHER, containers: ['c1'] })

    const updated = await recordLeaseContainers({
      holder: HOLDER,
      leasePath: leasePath(),
      env
    })

    expect({ updated, containers: readLease(leasePath()).containers }).toEqual({
      updated: false,
      containers: ['c1']
    })
  })
})

describe('recordLeaseFingerprints', () => {
  const fingerprints = { web: { build: 'b2', source: 's2' } }

  test('records what each service now serves on the holder’s own lease', () => {
    writeLease({ holder: HOLDER, fingerprints: {} })

    const updated = recordLeaseFingerprints({
      holder: HOLDER,
      leasePath: leasePath(),
      fingerprints
    })

    expect({
      updated,
      lease: readLease(leasePath())
    }).toEqual({
      updated: true,
      lease: expect.objectContaining({ holder: HOLDER, fingerprints })
    })
  })

  test('records the stack files the stack was started from when given them, and keeps them otherwise', () => {
    writeLease({ holder: HOLDER, fingerprints: {}, stackFiles: 'old' })

    recordLeaseFingerprints({
      holder: HOLDER,
      leasePath: leasePath(),
      fingerprints
    })
    const kept = readLease(leasePath()).stackFiles
    recordLeaseFingerprints({
      holder: HOLDER,
      leasePath: leasePath(),
      fingerprints,
      stackFiles: 'new'
    })

    expect({ kept, recorded: readLease(leasePath()).stackFiles }).toEqual({
      kept: 'old',
      recorded: 'new'
    })
  })

  test('leaves a lease somebody else holds alone', () => {
    writeLease({ holder: OTHER })

    const updated = recordLeaseFingerprints({
      holder: HOLDER,
      leasePath: leasePath(),
      fingerprints
    })

    expect({
      updated,
      fingerprints: readLease(leasePath()).fingerprints
    }).toEqual({ updated: false, fingerprints: undefined })
  })
})
