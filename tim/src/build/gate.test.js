import { describe, test, expect, afterEach } from 'vitest'
import { createServer } from 'node:net'
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
import { GATES_PATH } from './gates.js'
import { runGate, cannotRunBecause, defaultLogsDir } from './gate.js'

const WORKAREA = 'shared/programme'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeExecutable = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

const stackStatePath = () => join(root, 'stack-state')
const stackCallsPath = () => join(root, 'stack-calls')

// A workspace with its own gates.json, a backlog building `repos`, and stack
// scripts and a `docker` that share one state file: run-stack.sh marks the
// stack up, stop-stack.sh marks it down, and `docker ps` lists a container
// while it is up. Every stack script call is recorded.
const workspaceWith = ({ gates, repos }) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-gate-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(dirname(join(root, GATES_PATH)), { recursive: true })
  writeFileSync(join(root, GATES_PATH), JSON.stringify({ repos: gates }))
  for (const [folder, scripts] of Object.entries(repos)) {
    const dir = join(root, 'repos', folder)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: folder, version: '0.0.0', scripts })
    )
  }
  const workarea = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(workarea, { recursive: true })
  writeFileSync(
    join(workarea, 'backlog.json'),
    JSON.stringify({
      repos: Object.fromEntries(
        Object.keys(repos).map((folder) => [
          folder,
          { path: `repos/${folder}` }
        ])
      )
    })
  )
  const state = stackStatePath()
  const calls = stackCallsPath()
  writeExecutable(
    join(root, 'scripts', 'stack', 'run-stack.sh'),
    `echo "run-stack.sh $*" >> '${calls}'\nif [ -f '${root}/up-fails' ]; then echo boom; exit 9; fi\necho up > '${state}'`
  )
  writeExecutable(
    join(root, 'scripts', 'stack', 'stop-stack.sh'),
    `echo "stop-stack.sh $*" >> '${calls}'\nrm -f '${state}'`
  )
  writeExecutable(
    join(root, 'fake-bin', 'docker'),
    `if [ "$1" = ps ] && [ -f '${state}' ]; then echo trade-imports-frontend-1; fi`
  )
  return { PATH: `${join(root, 'fake-bin')}:${process.env.PATH}` }
}

const leasePath = () => join(root, 'state', 'stack-lease.json')

const GATE_HOLDER = 'ibl-20261001T090000Z inc-001 ladder'

const gate = (env, options = {}) =>
  runGate({
    workspaceRoot: root,
    workarea: WORKAREA,
    env,
    holder: GATE_HOLDER,
    leasePath: leasePath(),
    ...options
  })

const writeLease = (lease) => {
  mkdirSync(dirname(leasePath()), { recursive: true })
  writeFileSync(
    leasePath(),
    JSON.stringify({
      mode: 'dev',
      acquiredAt: '2026-10-01T09:00:00.000Z',
      branches: { 'trade-imports-ins-frontend': 'feat/EUDPA-1-x' },
      state: 'up',
      pid: null,
      containers: ['trade-imports-frontend-1'],
      ...lease
    })
  )
}

const leaseOnDisk = () =>
  existsSync(leasePath()) ? JSON.parse(readFileSync(leasePath(), 'utf8')) : null

const stackCalls = () =>
  existsSync(stackCallsPath())
    ? readFileSync(stackCallsPath(), 'utf8').trim().split('\n')
    : []

const stackIsUp = () => existsSync(stackStatePath())

const outcomeOf = (rungs) =>
  rungs.map(({ repo, name, ok }) => `${repo}:${name}:${ok ? 'pass' : 'FAIL'}`)

const unitOnly = () => ({
  gates: {
    frontend: {
      rungs: [
        { name: 'format', phase: 'unit', run: 'format:check' },
        { name: 'unit', phase: 'unit', run: 'test' }
      ]
    }
  },
  repos: {
    frontend: { 'format:check': 'echo formatted', test: 'echo tested' }
  }
})

const withE2e = (testsScripts) => ({
  gates: {
    frontend: { rungs: [{ name: 'unit', phase: 'unit', run: 'test' }] },
    tests: {
      rungs: [
        {
          name: 'e2e-plants',
          phase: 'e2e',
          run: 'test:docker-compose',
          scope: ['--project=plants'],
          forRepos: ['frontend']
        }
      ]
    }
  },
  repos: {
    frontend: { test: 'echo tested' },
    tests: testsScripts
  }
})

describe('runGate — unit and FIT rungs', () => {
  test('runs every rung and passes when each one does', async () => {
    const env = workspaceWith(unitOnly())

    const outcome = await gate(env, { phase: 'unit' })

    expect({ green: outcome.green, rungs: outcomeOf(outcome.rungs) }).toEqual({
      green: true,
      rungs: ['frontend:format:pass', 'frontend:unit:pass']
    })
  })

  test("writes each rung's output to its own log beside the backlog", async () => {
    const env = workspaceWith(unitOnly())

    const outcome = await gate(env, { phase: 'unit' })

    const log = join(defaultLogsDir(root, WORKAREA), 'gate-frontend-unit.log')
    expect({
      log: outcome.rungs[1].log,
      body: readFileSync(log, 'utf8')
    }).toEqual({ log, body: expect.stringContaining('tested') })
  })

  test('writes the logs to the folder it is given', async () => {
    const env = workspaceWith(unitOnly())
    const logs = join(root, 'elsewhere')

    const outcome = await gate(env, { phase: 'unit', logsDir: logs })

    expect(outcome.rungs.map(({ log }) => log)).toEqual([
      join(logs, 'gate-frontend-format.log'),
      join(logs, 'gate-frontend-unit.log')
    ])
  })

  test('fails on a failing rung and still runs the rungs after it', async () => {
    const env = workspaceWith({
      ...unitOnly(),
      repos: { frontend: { 'format:check': 'exit 3', test: 'echo tested' } }
    })

    const outcome = await gate(env, { phase: 'unit' })

    expect({
      green: outcome.green,
      first: outcome.rungs[0],
      rungs: outcomeOf(outcome.rungs)
    }).toEqual({
      green: false,
      first: expect.objectContaining({
        exitCode: 3,
        reason: expect.stringContaining('npm exited 3.')
      }),
      rungs: ['frontend:format:FAIL', 'frontend:unit:pass']
    })
  })

  test('fails a rung whose script the repo does not have, with the reason', async () => {
    const env = workspaceWith({
      ...unitOnly(),
      repos: { frontend: { test: 'echo tested' } }
    })

    const outcome = await gate(env, { phase: 'unit' })

    expect(outcome.rungs[0]).toEqual(
      expect.objectContaining({
        ok: false,
        exitCode: null,
        reason: `frontend's package.json has no "format:check" script.`
      })
    )
  })

  test('fails a repo that gates.json has no rungs for', async () => {
    const env = workspaceWith({
      ...unitOnly(),
      repos: { ...unitOnly().repos, backend: { test: 'echo tested' } }
    })

    const outcome = await gate(env, { phase: 'unit' })

    expect(outcomeOf(outcome.rungs)).toEqual([
      'backend:rungs:FAIL',
      'frontend:format:pass',
      'frontend:unit:pass'
    ])
  })

  test('fails a FIT rung whose port is held, naming the holder, without running it', async () => {
    const server = createServer()
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    const env = workspaceWith({
      gates: {
        frontend: {
          rungs: [
            { name: 'fit', phase: 'fit', run: 'test:fit:ci', ports: [port] }
          ]
        }
      },
      repos: { frontend: { 'test:fit:ci': 'echo fit' } }
    })

    const outcome = await gate(env, { phase: 'fit' })

    await new Promise((resolve) => server.close(resolve))
    expect(outcome.rungs).toEqual([
      expect.objectContaining({
        ok: false,
        log: null,
        reason: expect.stringMatching(
          new RegExp(
            `^Port ${port} is in use by \\S+ \\(pid ${process.pid}\\)\\.`
          )
        )
      })
    ])
  })

  const fitHeldByTheStack = async (lease) => {
    const server = createServer()
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    const env = workspaceWith({
      gates: {
        frontend: {
          rungs: [
            { name: 'fit', phase: 'fit', run: 'test:fit:ci', ports: [port] }
          ]
        }
      },
      repos: { frontend: { 'test:fit:ci': 'echo fit' } }
    })
    writeExecutable(
      join(root, 'fake-bin', 'docker'),
      `if [ "$1" = ps ]; then printf 'trade-imports-animals-frontend-1\\ttrade-imports\\n'; fi`
    )
    if (lease) writeLease(lease)

    const outcome = await gate(env, { phase: 'fit' })

    await new Promise((resolve) => server.close(resolve))
    return { port, outcome }
  }

  test('says nobody leases the workspace stack when its container holds a FIT port and no lease exists', async () => {
    const { port, outcome } = await fitHeldByTheStack(null)

    expect(outcome.rungs.map(({ ok, reason }) => ({ ok, reason }))).toEqual([
      {
        ok: false,
        reason: `Port ${port} is in use by the workspace stack's trade-imports-animals-frontend-1 container. The rung needs it free. Nobody holds a lease on the workspace stack, so somebody started it by hand, outside any build.`
      }
    ])
  })

  test('names the lease holder when a leased workspace stack holds a FIT port', async () => {
    const { port, outcome } = await fitHeldByTheStack({
      holder: 'ibl-20261001T090000Z inc-001 consistency'
    })

    expect(outcome.rungs[0].reason).toBe(
      `Port ${port} is in use by the workspace stack's trade-imports-animals-frontend-1 container. The rung needs it free. The workspace stack is leased to "ibl-20261001T090000Z inc-001 consistency" (dev mode, since 2026-10-01T09:00:00.000Z, repos on trade-imports-ins-frontend feat/EUDPA-1-x).`
    )
  })

  test('reports the held stack and its lease holder in the result', async () => {
    const { outcome } = await fitHeldByTheStack({
      holder: 'ibl-20261001T090000Z inc-001 consistency'
    })

    expect(outcome.stack.held).toEqual({
      holder: 'ibl-20261001T090000Z inc-001 consistency',
      detail: expect.stringContaining('The workspace stack is leased to')
    })
  })

  test('leaves the workspace stack alone for unit and FIT rungs', async () => {
    const env = workspaceWith(unitOnly())
    writeFileSync(stackStatePath(), 'up\n')

    const outcome = await gate(env, { phase: 'all' })

    expect({
      calls: stackCalls(),
      up: stackIsUp(),
      stack: outcome.stack
    }).toEqual({
      calls: [],
      up: true,
      stack: expect.objectContaining({ wasUp: null, startedForE2e: false })
    })
  })
})

describe('runGate — e2e rungs', () => {
  test('starts the stack from local source, runs the scoped e2e rung, and stops it', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      green: outcome.green,
      calls: stackCalls(),
      up: stackIsUp(),
      stack: outcome.stack
    }).toEqual({
      green: true,
      calls: ['run-stack.sh -d', 'stop-stack.sh'],
      up: false,
      stack: expect.objectContaining({
        wasUp: false,
        startedForE2e: true,
        stoppedAfter: true,
        servedFrom: 'local-source'
      })
    })
  })

  test('passes the rung scope to the e2e script', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))

    const outcome = await gate(env, { phase: 'e2e' })

    expect(readFileSync(outcome.rungs[0].log, 'utf8')).toContain(
      'e2e --project=plants'
    )
  })

  test('holds the lease as its own holder while the e2e rungs run, and clears it after', async () => {
    const env = workspaceWith(
      withE2e({
        'test:docker-compose':
          'cp ../../state/stack-lease.json ../../lease-during-e2e.json #'
      })
    )

    await gate(env, { phase: 'e2e' })

    expect({
      during: JSON.parse(
        readFileSync(join(root, 'lease-during-e2e.json'), 'utf8')
      ).holder,
      after: leaseOnDisk()
    }).toEqual({ during: GATE_HOLDER, after: null })
  })

  test('rebuilds a stack its own holder already leases from local source and leaves it up', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(stackStatePath(), 'up\n')
    writeLease({ holder: GATE_HOLDER })

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      calls: stackCalls(),
      up: stackIsUp(),
      lease: leaseOnDisk()?.holder,
      stack: outcome.stack
    }).toEqual({
      calls: ['run-stack.sh -d'],
      up: true,
      lease: GATE_HOLDER,
      stack: expect.objectContaining({
        wasUp: true,
        startedForE2e: false,
        stoppedAfter: false,
        servedFrom: 'local-source'
      })
    })
  })

  test('refuses a stack that is up with no lease, and leaves it alone', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(stackStatePath(), 'up\n')

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      calls: stackCalls(),
      up: stackIsUp(),
      rungs: outcome.rungs.map(({ ok, reason }) => ({ ok, reason })),
      held: outcome.stack.held
    }).toEqual({
      calls: [],
      up: true,
      rungs: [
        {
          ok: false,
          reason:
            'The workspace stack is up and nobody holds a lease on it, so somebody started it by hand (tim docker dev, say), outside any build. Leave it alone: ask whoever started it to take it down.'
        }
      ],
      held: { holder: null, detail: expect.stringContaining('nobody holds') }
    })
  })

  test('refuses a stack leased to another holder, naming the holder, and leaves it alone', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(stackStatePath(), 'up\n')
    writeLease({ holder: 'ibl-20261001T080000Z inc-007 consistency' })

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      calls: stackCalls(),
      up: stackIsUp(),
      green: outcome.green,
      held: outcome.stack.held
    }).toEqual({
      calls: [],
      up: true,
      green: false,
      held: {
        holder: 'ibl-20261001T080000Z inc-007 consistency',
        detail:
          'The workspace stack is leased to "ibl-20261001T080000Z inc-007 consistency" (dev mode, since 2026-10-01T09:00:00.000Z, repos on trade-imports-ins-frontend feat/EUDPA-1-x). Leave it alone: it is theirs to release.'
      }
    })
  })

  test('stops the stack it started when an e2e rung fails', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'exit 1' }))

    const outcome = await gate(env, { phase: 'e2e' })

    expect({ green: outcome.green, up: stackIsUp() }).toEqual({
      green: false,
      up: false
    })
  })

  test('fails the e2e rungs when the stack does not come up, still stops it, and clears the lease', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(join(root, 'up-fails'), '')

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      rungs: outcome.rungs,
      calls: stackCalls(),
      lease: leaseOnDisk(),
      held: outcome.stack.held
    }).toEqual({
      rungs: [
        expect.objectContaining({
          ok: false,
          reason: expect.stringContaining(
            'The workspace stack did not come up (run-stack.sh exited 9).'
          )
        })
      ],
      calls: ['run-stack.sh -d', 'stop-stack.sh'],
      lease: null,
      held: null
    })
  })

  test('runs unit rungs, then e2e, in one gate', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))

    const outcome = await gate(env)

    expect(outcomeOf(outcome.rungs)).toEqual([
      'frontend:unit:pass',
      'tests:e2e-plants:pass'
    ])
  })

  test('does not touch the stack when no e2e rung can run', async () => {
    const env = workspaceWith(withE2e({ lint: 'echo lint' }))

    const outcome = await gate(env, { phase: 'e2e' })

    expect({ rungs: outcome.rungs, calls: stackCalls() }).toEqual({
      rungs: [
        expect.objectContaining({
          ok: false,
          reason: `tests's package.json has no "test:docker-compose" script.`
        })
      ],
      calls: []
    })
  })
})

describe('cannotRunBecause', () => {
  test('refuses mvn verify in a repo with no pom.xml', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-build-gate-'))

    expect(
      cannotRunBecause({ repo: 'backend', path: root, run: 'mvn verify' })
    ).toBe('backend has no pom.xml, so "mvn verify" cannot run.')
  })

  test('refuses a repo that is not cloned', () => {
    root = mkdtempSync(join(tmpdir(), 'tim-build-gate-'))
    const missing = join(root, 'repos', 'backend')

    expect(
      cannotRunBecause({ repo: 'backend', path: missing, run: 'test' })
    ).toBe(`backend is not cloned at ${missing}.`)
  })
})
