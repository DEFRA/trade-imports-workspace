import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  chmodSync,
  rmSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { refreshLeasedStack } from './stack-refresh.js'
import {
  DEV_OVERLAY_PATH,
  serviceFingerprints,
  stackFilesFingerprint
} from './stack-fingerprints.js'

const HOLDER = 'ibl-20261001T090000Z inc-003 ladder'

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-stack-refresh-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeFile = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, body)
}

const writeExecutable = (path, body) => {
  writeFile(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

const git = (path, ...args) =>
  execa('git', [
    '-C',
    path,
    '-c',
    'user.name=tim',
    '-c',
    'user.email=tim@example.com',
    '-c',
    'commit.gpgsign=false',
    ...args
  ])

const statePath = () => join(root, 'stack-state')
const callsPath = () => join(root, 'stack-calls')
const leasePath = () => join(root, 'state', 'stack-lease.json')
const logPaths = () => ({
  rebuild: join(root, 'logs', 'rebuild.log'),
  restart: join(root, 'logs', 'restart.log')
})

const SERVICES = ['web', 'api']

const committedRepo = async (folder) => {
  const path = join(root, 'repos', folder)
  writeFile(join(path, 'Dockerfile'), 'FROM node\n')
  writeFile(join(path, 'package.json'), `{"name":"${folder}"}\n`)
  writeFile(join(path, 'src', 'index.js'), 'export const one = 1\n')
  await git(path, 'init', '-q')
  await git(path, 'add', '.')
  await git(path, 'commit', '-q', '-m', 'first')
}

const overlay = () =>
  [
    'services:',
    ...SERVICES.flatMap((service) => [
      `  ${service}:`,
      '    build:',
      `      context: ../../repos/${service}`,
      '    volumes:',
      `      - ../../repos/${service}/src:/app/src`
    ]),
    ''
  ].join('\n')

// A workspace whose dev overlay builds two repos, a running stack whose
// containers live in one state file, and a dev-service.sh that records each
// call: a rebuild recreates every container (new ids); a restart keeps them;
// FAIL_REBUILD makes a rebuild fail.
const workspace = async ({ rebuildFails = false } = {}) => {
  for (const service of SERVICES) await committedRepo(service)
  writeFile(join(root, DEV_OVERLAY_PATH), overlay())
  writeFileSync(statePath(), 'c1\nc2\n')
  writeExecutable(
    join(root, 'scripts', 'stack', 'dev-service.sh'),
    [
      `echo "dev-service.sh $*" >> '${callsPath()}'`,
      `if [ "$1" = rebuild ]; then printf 'c3\\nc4\\n' > '${statePath()}'; ${rebuildFails ? 'exit 7;' : ''} fi`
    ].join('\n')
  )
  writeExecutable(
    join(root, 'fake-bin', 'docker'),
    `if [ "$1" = ps ]; then cat '${statePath()}'; fi`
  )
  return { PATH: `${join(root, 'fake-bin')}:${process.env.PATH}` }
}

const writeLease = (lease) => {
  writeFile(
    leasePath(),
    JSON.stringify({
      holder: HOLDER,
      mode: 'dev',
      acquiredAt: '2026-10-01T09:00:00.000Z',
      branches: {},
      state: 'up',
      pid: null,
      containers: ['c1', 'c2'],
      ...lease
    })
  )
  return JSON.parse(readFileSync(leasePath(), 'utf8'))
}

const leaseWithCurrentFingerprints = async () =>
  writeLease({ fingerprints: await serviceFingerprints(root) })

const leaseOnDisk = () => JSON.parse(readFileSync(leasePath(), 'utf8'))

const calls = () =>
  existsSync(callsPath())
    ? readFileSync(callsPath(), 'utf8').trim().split('\n')
    : []

const refresh = (env, lease) =>
  refreshLeasedStack({
    workspaceRoot: root,
    holder: HOLDER,
    leasePath: leasePath(),
    lease,
    logPaths: logPaths(),
    env
  })

const summaryOf = ({ ok, rebuilt, restarted, left, reason }) => ({
  ok,
  rebuilt,
  restarted,
  left,
  reason
})

describe('refreshLeasedStack', () => {
  test('leaves every service alone when nothing changed since the lease recorded it', async () => {
    const env = await workspace()
    const lease = await leaseWithCurrentFingerprints()

    const outcome = await refresh(env, lease)

    expect({ outcome: summaryOf(outcome), calls: calls() }).toEqual({
      outcome: {
        ok: true,
        rebuilt: [],
        restarted: [],
        left: ['web', 'api'],
        reason: null
      },
      calls: []
    })
  })

  test('restarts only the service whose source changed, keeping its containers', async () => {
    const env = await workspace()
    const lease = await leaseWithCurrentFingerprints()
    writeFileSync(join(root, 'repos', 'web', 'src', 'index.js'), 'export {}\n')

    const outcome = await refresh(env, lease)

    expect({
      outcome: summaryOf(outcome),
      calls: calls(),
      containers: leaseOnDisk().containers,
      restartLog: outcome.restartLog
    }).toEqual({
      outcome: {
        ok: true,
        rebuilt: [],
        restarted: ['web'],
        left: ['api'],
        reason: null
      },
      calls: ['dev-service.sh restart web'],
      containers: ['c1', 'c2'],
      restartLog: logPaths().restart
    })
  })

  test('rebuilds only the service whose build inputs changed, and records its new containers', async () => {
    const env = await workspace()
    const lease = await leaseWithCurrentFingerprints()
    writeFileSync(join(root, 'repos', 'api', 'package.json'), '{"x":1}\n')

    const outcome = await refresh(env, lease)

    expect({
      outcome: summaryOf(outcome),
      calls: calls(),
      containers: leaseOnDisk().containers,
      rebuildLog: outcome.rebuildLog
    }).toEqual({
      outcome: {
        ok: true,
        rebuilt: ['api'],
        restarted: [],
        left: ['web'],
        reason: null
      },
      calls: ['dev-service.sh rebuild api'],
      containers: ['c3', 'c4'],
      rebuildLog: logPaths().rebuild
    })
  })

  test('records what it refreshed, so the next refresh leaves everything alone', async () => {
    const env = await workspace()
    const lease = await leaseWithCurrentFingerprints()
    writeFileSync(join(root, 'repos', 'web', 'src', 'index.js'), 'export {}\n')
    writeFileSync(join(root, 'repos', 'api', 'Dockerfile'), 'FROM node:24\n')
    await refresh(env, lease)

    const again = await refresh(env, leaseOnDisk())

    expect(summaryOf(again)).toEqual({
      ok: true,
      rebuilt: [],
      restarted: [],
      left: ['web', 'api'],
      reason: null
    })
  })

  test('rebuilds every service under a lease written before fingerprints were kept', async () => {
    const env = await workspace()
    const lease = writeLease({})

    const outcome = await refresh(env, lease)

    expect({
      rebuilt: outcome.rebuilt,
      calls: calls(),
      fingerprints: Object.keys(leaseOnDisk().fingerprints)
    }).toEqual({
      rebuilt: ['web', 'api'],
      calls: ['dev-service.sh rebuild web api'],
      fingerprints: ['web', 'api']
    })
  })

  test('fails with the reason when a rebuild fails, still records the containers, and rebuilds the service again next time', async () => {
    const env = await workspace({ rebuildFails: true })
    const lease = await leaseWithCurrentFingerprints()
    writeFileSync(join(root, 'repos', 'api', 'package.json'), '{"x":1}\n')

    const outcome = await refresh(env, lease)

    expect({
      outcome: summaryOf(outcome),
      containers: leaseOnDisk().containers,
      fingerprints: Object.keys(leaseOnDisk().fingerprints)
    }).toEqual({
      outcome: {
        ok: false,
        rebuilt: ['api'],
        restarted: [],
        left: ['web'],
        reason: `Rebuilding api failed (dev-service.sh exited 7). Read ${logPaths().rebuild}.`
      },
      containers: ['c3', 'c4'],
      fingerprints: ['web']
    })
  })
})

// The workspace as a git checkout of its own stack files, with a
// run-stack.sh that records each call and starts new containers;
// FAIL_RESTACK makes it fail.
const stackWorkspace = async ({ restackFails = false } = {}) => {
  const env = await workspace()
  writeExecutable(
    join(root, 'scripts', 'stack', 'run-stack.sh'),
    [
      `echo "run-stack.sh $*" >> '${callsPath()}'`,
      `printf 'c5\\nc6\\n' > '${statePath()}'`,
      restackFails ? 'exit 3' : ''
    ].join('\n')
  )
  writeFile(
    join(root, '.gitignore'),
    'repos/\nfake-bin/\nstate/\nlogs/\nstack-*\n'
  )
  await git(root, 'init', '-q')
  await git(root, 'add', '.')
  await git(root, 'commit', '-q', '-m', 'first')
  return env
}

const leaseWithCurrentStack = async (lease = {}) =>
  writeLease({
    fingerprints: await serviceFingerprints(root),
    stackFiles: await stackFilesFingerprint(root),
    ...lease
  })

const editStackFile = () =>
  writeFileSync(join(root, DEV_OVERLAY_PATH), `${overlay()}# changed\n`)

const restackLog = () => join(root, 'logs', 'restack.log')

const refreshWithRestack = (env, lease) =>
  refreshLeasedStack({
    workspaceRoot: root,
    holder: HOLDER,
    leasePath: leasePath(),
    lease,
    logPaths: { ...logPaths(), restack: restackLog() },
    env
  })

describe('refreshLeasedStack — the workspace’s stack files', () => {
  test('starts the whole stack again when a stack file changed, and records what it started', async () => {
    const env = await stackWorkspace()
    const lease = await leaseWithCurrentStack()
    editStackFile()

    const outcome = await refreshWithRestack(env, lease)

    expect({
      ok: outcome.ok,
      restacked: outcome.restacked,
      restackLog: outcome.restackLog,
      calls: calls(),
      containers: leaseOnDisk().containers,
      stackFiles: leaseOnDisk().stackFiles,
      fingerprints: leaseOnDisk().fingerprints
    }).toEqual({
      ok: true,
      restacked: true,
      restackLog: restackLog(),
      calls: ['run-stack.sh -d'],
      containers: ['c5', 'c6'],
      stackFiles: await stackFilesFingerprint(root),
      fingerprints: await serviceFingerprints(root)
    })
  })

  test('leaves the stack alone next time, once it has started it again', async () => {
    const env = await stackWorkspace()
    await refreshWithRestack(env, await leaseWithCurrentStack())
    editStackFile()
    await refreshWithRestack(env, leaseOnDisk())

    const again = await refreshWithRestack(env, leaseOnDisk())

    expect({
      restacked: again.restacked,
      left: again.left,
      calls: calls()
    }).toEqual({
      restacked: false,
      left: ['web', 'api'],
      calls: ['run-stack.sh -d']
    })
  })

  test('starts the stack again once under a lease written before the stack files were kept', async () => {
    const env = await stackWorkspace()
    const lease = writeLease({ fingerprints: await serviceFingerprints(root) })

    const outcome = await refreshWithRestack(env, lease)

    expect({ restacked: outcome.restacked, calls: calls() }).toEqual({
      restacked: true,
      calls: ['run-stack.sh -d']
    })
  })

  test('starts a stack of published images again the way it was started, recording no service fingerprints', async () => {
    const env = await stackWorkspace()
    const lease = await leaseWithCurrentStack({ mode: 'up', fingerprints: {} })
    editStackFile()

    const outcome = await refreshWithRestack(env, lease)

    expect({
      restacked: outcome.restacked,
      calls: calls(),
      fingerprints: leaseOnDisk().fingerprints
    }).toEqual({
      restacked: true,
      calls: ['run-stack.sh'],
      fingerprints: {}
    })
  })

  test('fails with the reason when starting the stack again fails, and tries again next time', async () => {
    const env = await stackWorkspace({ restackFails: true })
    const lease = await leaseWithCurrentStack()
    editStackFile()

    const outcome = await refreshWithRestack(env, lease)

    expect({
      ok: outcome.ok,
      reason: outcome.reason,
      containers: leaseOnDisk().containers,
      stackFilesKept: leaseOnDisk().stackFiles === lease.stackFiles
    }).toEqual({
      ok: false,
      reason: `The workspace's stack files changed since the stack was started, and starting it again failed (run-stack.sh exited 3). Read ${restackLog()}.`,
      containers: ['c5', 'c6'],
      stackFilesKept: true
    })
  })
})

describe('refreshLeasedStack — whether it can read the stack files', () => {
  test('says it cannot tell when the workspace is not a git checkout, and never starts the stack again', async () => {
    const env = await workspace()
    const lease = await leaseWithCurrentFingerprints()

    const outcome = await refresh(env, lease)

    expect({
      stackFilesKnown: outcome.stackFilesKnown,
      restacked: outcome.restacked
    }).toEqual({ stackFilesKnown: false, restacked: false })
  })

  test('says it can tell in a git checkout', async () => {
    const env = await stackWorkspace()
    const lease = await leaseWithCurrentStack()

    const outcome = await refreshWithRestack(env, lease)

    expect(outcome.stackFilesKnown).toBe(true)
  })
})
