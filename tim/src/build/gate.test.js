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
import { execa } from 'execa'
import { GATES_PATH } from './gates.js'
import { serviceFingerprints } from '../exec/stack-fingerprints.js'
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

  test('reuses a stack its own holder already leases without starting it again, and leaves it up', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(stackStatePath(), 'up\n')
    writeLease({ holder: GATE_HOLDER })

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      calls: stackCalls(),
      up: stackIsUp(),
      lease: leaseOnDisk()?.holder,
      green: outcome.green,
      stack: outcome.stack
    }).toEqual({
      calls: [],
      up: true,
      lease: GATE_HOLDER,
      green: true,
      stack: expect.objectContaining({
        wasUp: true,
        startedForE2e: false,
        stoppedAfter: false,
        servedFrom: 'local-source',
        refresh: expect.objectContaining({
          ok: true,
          rebuilt: [],
          restarted: [],
          left: []
        })
      })
    })
  })

  // Builds repos/frontend as a dev service: a dev overlay that names it, a
  // git checkout of it, and a dev-service.sh that records each call and
  // fails when `dev-service-fails` exists.
  const withDevService = async () => {
    mkdirSync(join(root, 'docker', 'stack'), { recursive: true })
    writeFileSync(
      join(root, 'docker', 'stack', 'dev.compose.yml'),
      'services:\n  frontend:\n    build:\n      context: ../../repos/frontend\n    volumes:\n      - ../../repos/frontend/src:/home/node/src\n'
    )
    const repo = join(root, 'repos', 'frontend')
    mkdirSync(join(repo, 'src'), { recursive: true })
    writeFileSync(join(repo, 'src', 'index.js'), 'export {}\n')
    await execa('git', ['init', '--quiet', repo])
    writeExecutable(
      join(root, 'scripts', 'stack', 'dev-service.sh'),
      `echo "dev-service.sh $*" >> '${stackCallsPath()}'\nif [ -f '${root}/dev-service-fails' ]; then exit 4; fi`
    )
    writeFileSync(stackStatePath(), 'up\n')
    writeLease({
      holder: GATE_HOLDER,
      fingerprints: await serviceFingerprints(root)
    })
  }

  test('rebuilds only the service whose build inputs changed under its own lease, and reports it', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    await withDevService()
    writeFileSync(
      join(root, 'repos', 'frontend', 'package.json'),
      JSON.stringify({ name: 'frontend', scripts: { test: 'echo changed' } })
    )

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      green: outcome.green,
      calls: stackCalls(),
      refresh: outcome.stack.refresh
    }).toEqual({
      green: true,
      calls: ['dev-service.sh rebuild frontend'],
      refresh: {
        ok: true,
        rebuilt: ['frontend'],
        restarted: [],
        left: [],
        rebuildLog: join(
          defaultLogsDir(root, WORKAREA),
          'gate-stack-rebuild.log'
        ),
        restartLog: null,
        reason: null
      }
    })
  })

  test('restarts only the service whose source changed under its own lease', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    await withDevService()
    writeFileSync(join(root, 'repos', 'frontend', 'src', 'index.js'), '1\n')

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      calls: stackCalls(),
      restarted: outcome.stack.refresh.restarted
    }).toEqual({
      calls: ['dev-service.sh restart frontend'],
      restarted: ['frontend']
    })
  })

  test('fails the e2e rungs without running them when a service will not refresh, and leaves the stack up', async () => {
    const env = workspaceWith(
      withE2e({ 'test:docker-compose': `touch '${join(root, 'e2e-ran')}'` })
    )
    await withDevService()
    writeFileSync(join(root, 'repos', 'frontend', 'src', 'index.js'), '1\n')
    writeFileSync(join(root, 'dev-service-fails'), '')

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      green: outcome.green,
      e2eRan: existsSync(join(root, 'e2e-ran')),
      up: stackIsUp(),
      reason: outcome.rungs[0].reason
    }).toEqual({
      green: false,
      e2eRan: false,
      up: true,
      reason: `Restarting frontend failed (dev-service.sh exited 4). Read ${join(defaultLogsDir(root, WORKAREA), 'gate-stack-restart.log')}.`
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

// Every rung runs in repos/<folder>, so ../../ is the workspace root.
const atRoot = (file) => `../../${file}`

// A script that marks its own start, then waits up to five seconds for
// another script's mark: it passes only when the two run at the same time.
const meetsWith = (mine, theirs) =>
  `touch ${atRoot(mine)}; tries=0; while [ ! -f ${atRoot(theirs)} ]; do tries=$((tries+1)); [ $tries -gt 100 ] && exit 1; sleep 0.05; done`

const appendTo = (file, line) => `echo ${line} >> ${atRoot(file)}`

const linesOf = (file) =>
  readFileSync(join(root, file), 'utf8').trim().split('\n')

const twoRepos = (scripts) => ({
  gates: {
    alpha: {
      rungs: [
        { name: 'format', phase: 'unit', run: 'format:check' },
        { name: 'unit', phase: 'unit', run: 'test' }
      ]
    },
    beta: { rungs: [{ name: 'unit', phase: 'unit', run: 'test' }] }
  },
  repos: scripts
})

const CONCURRENCY_TIMEOUT_MS = 20_000

describe('runGate — running repos at the same time', () => {
  test(
    'runs rungs from different repos at the same time',
    async () => {
      const env = workspaceWith(
        twoRepos({
          alpha: { 'format:check': 'true', test: meetsWith('alpha', 'beta') },
          beta: { test: meetsWith('beta', 'alpha') }
        })
      )

      const outcome = await gate(env, { phase: 'unit' })

      expect(outcomeOf(outcome.rungs)).toEqual([
        'alpha:format:pass',
        'alpha:unit:pass',
        'beta:unit:pass'
      ])
    },
    CONCURRENCY_TIMEOUT_MS
  )

  test(
    "keeps one repo's rungs in their listed order",
    async () => {
      const env = workspaceWith(
        twoRepos({
          alpha: {
            'format:check': `sleep 0.3; ${appendTo('alpha-order', 'format')}`,
            test: appendTo('alpha-order', 'unit')
          },
          beta: { test: 'true' }
        })
      )

      await gate(env, { phase: 'unit' })

      expect(linesOf('alpha-order')).toEqual(['format', 'unit'])
    },
    CONCURRENCY_TIMEOUT_MS
  )

  test(
    'reports rungs in plan order, whichever finished first',
    async () => {
      const env = workspaceWith({
        gates: {
          slow: { rungs: [{ name: 'unit', phase: 'unit', run: 'test' }] },
          fast: {
            rungs: [
              { name: 'unit', phase: 'unit', run: 'test' },
              { name: 'fit', phase: 'fit', run: 'test:fit:ci', ports: [1] }
            ]
          }
        },
        repos: {
          slow: { test: 'sleep 0.5' },
          fast: { test: 'true', 'test:fit:ci': 'true' }
        }
      })

      const outcome = await gate(env, { phase: 'all' })

      expect(outcomeOf(outcome.rungs)).toEqual([
        'slow:unit:pass',
        'fast:unit:pass',
        'fast:fit:pass'
      ])
    },
    CONCURRENCY_TIMEOUT_MS
  )

  test(
    'starts the stack while the unit rungs run',
    async () => {
      const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
      writeFileSync(
        join(root, 'repos', 'frontend', 'package.json'),
        JSON.stringify({ scripts: { test: meetsWith('unit', 'stack-state') } })
      )

      const outcome = await gate(env)

      expect({
        rungs: outcomeOf(outcome.rungs),
        calls: stackCalls()
      }).toEqual({
        rungs: ['frontend:unit:pass', 'tests:e2e-plants:pass'],
        calls: ['run-stack.sh -d', 'stop-stack.sh']
      })
    },
    CONCURRENCY_TIMEOUT_MS
  )

  test(
    'starts no e2e rung until every unit rung has finished, and still runs them when a unit rung failed',
    async () => {
      const env = workspaceWith(
        withE2e({
          'test:docker-compose': `${appendTo('order', 'e2e-start')} #`
        })
      )
      writeFileSync(
        join(root, 'repos', 'frontend', 'package.json'),
        JSON.stringify({
          scripts: {
            test: `sleep 0.5; ${appendTo('order', 'unit-end')}; exit 1`
          }
        })
      )

      const outcome = await gate(env)

      expect({
        order: linesOf('order'),
        rungs: outcomeOf(outcome.rungs)
      }).toEqual({
        order: ['unit-end', 'e2e-start'],
        rungs: ['frontend:unit:FAIL', 'tests:e2e-plants:pass']
      })
    },
    CONCURRENCY_TIMEOUT_MS
  )

  test(
    'runs one rung at a time, unit then e2e, when asked to run serially',
    async () => {
      const env = workspaceWith(
        withE2e({
          'test:docker-compose': `${appendTo('order', 'e2e')} #`
        })
      )
      writeFileSync(
        join(root, 'repos', 'frontend', 'package.json'),
        JSON.stringify({
          scripts: { test: `sleep 0.3; ${appendTo('order', 'unit')}` }
        })
      )

      const outcome = await gate(env, { serial: true })

      expect({
        order: linesOf('order'),
        serial: outcome.serial,
        green: outcome.green
      }).toEqual({ order: ['unit', 'e2e'], serial: true, green: true })
    },
    CONCURRENCY_TIMEOUT_MS
  )

  const bracketed = (name) =>
    `${appendTo('order', `${name}-start`)}; sleep 0.2; ${appendTo('order', `${name}-end`)}`

  const withExclusiveRung = () =>
    workspaceWith({
      gates: {
        alpha: { rungs: [{ name: 'unit', phase: 'unit', run: 'test' }] },
        beta: { rungs: [{ name: 'unit', phase: 'unit', run: 'test' }] },
        tests: {
          rungs: [
            {
              name: 'e2e',
              phase: 'e2e',
              run: 'test:docker-compose',
              forRepos: ['alpha']
            }
          ]
        },
        perf: {
          rungs: [
            {
              name: 'e2e-k6',
              phase: 'e2e',
              run: 'test:docker-compose',
              forRepos: ['alpha'],
              exclusive: true
            }
          ]
        }
      },
      repos: {
        alpha: { test: bracketed('alpha') },
        beta: { test: bracketed('beta') },
        tests: { 'test:docker-compose': bracketed('tests') },
        perf: { 'test:docker-compose': bracketed('perf') }
      }
    })

  test(
    'runs an exclusive rung alone, after the unit rungs and before the other e2e rungs',
    async () => {
      const env = withExclusiveRung()

      await gate(env)

      const order = linesOf('order')
      expect({
        local: order.slice(0, 4).every((line) => /^(alpha|beta)-/.test(line)),
        after: order.slice(4)
      }).toEqual({
        local: true,
        after: ['perf-start', 'perf-end', 'tests-start', 'tests-end']
      })
    },
    CONCURRENCY_TIMEOUT_MS
  )

  test(
    'reports an exclusive rung in plan order and times it as its own layer',
    async () => {
      const env = withExclusiveRung()

      const outcome = await gate(env)

      expect({
        rungs: outcomeOf(outcome.rungs),
        layers: Object.keys(outcome.layers),
        performanceAtLeastItsSleep: outcome.layers.performance.durationMs >= 200
      }).toEqual({
        rungs: [
          'alpha:unit:pass',
          'beta:unit:pass',
          'tests:e2e:pass',
          'perf:e2e-k6:pass'
        ],
        layers: ['local', 'performance', 'e2e'],
        performanceAtLeastItsSleep: true
      })
    },
    CONCURRENCY_TIMEOUT_MS
  )

  test('records how long the gate and each phase took', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(
      join(root, 'repos', 'frontend', 'package.json'),
      JSON.stringify({ scripts: { test: 'sleep 0.3' } })
    )

    const outcome = await gate(env)

    expect({
      phases: Object.keys(outcome.phases),
      unitAtLeastItsSleep: outcome.phases.unit.durationMs >= 300,
      gateAtLeastEachPhase:
        outcome.durationMs >= outcome.phases.unit.durationMs &&
        outcome.durationMs >= outcome.phases.e2e.durationMs,
      serial: outcome.serial
    }).toEqual({
      phases: ['unit', 'e2e'],
      unitAtLeastItsSleep: true,
      gateAtLeastEachPhase: true,
      serial: false
    })
  })

  test(
    'counts only the time after layer one in the e2e phase and layer when the stack was ready first',
    async () => {
      const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
      writeFileSync(
        join(root, 'repos', 'frontend', 'package.json'),
        JSON.stringify({ scripts: { test: 'sleep 1.5' } })
      )

      const outcome = await gate(env)

      expect({
        layers: Object.keys(outcome.layers),
        localAtLeastItsSleep: outcome.layers.local.durationMs >= 1500,
        e2eShorterThanLayerOne: outcome.phases.e2e.durationMs < 1500,
        e2eLayerMatchesPhase:
          outcome.layers.e2e.durationMs === outcome.phases.e2e.durationMs
      }).toEqual({
        layers: ['local', 'performance', 'e2e'],
        localAtLeastItsSleep: true,
        e2eShorterThanLayerOne: true,
        e2eLayerMatchesPhase: true
      })
    },
    CONCURRENCY_TIMEOUT_MS
  )
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
