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

const gate = (env, options = {}) =>
  runGate({ workspaceRoot: root, workarea: WORKAREA, env, ...options })

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
        reason: expect.stringContaining(
          `Port ${port} is in use by node (pid ${process.pid}).`
        )
      })
    ])
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

  test('rebuilds a stack that was already up from local source and leaves it up', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(stackStatePath(), 'up\n')

    const outcome = await gate(env, { phase: 'e2e' })

    expect({
      calls: stackCalls(),
      up: stackIsUp(),
      stack: outcome.stack
    }).toEqual({
      calls: ['run-stack.sh -d'],
      up: true,
      stack: expect.objectContaining({
        wasUp: true,
        startedForE2e: false,
        stoppedAfter: false,
        servedFrom: 'local-source'
      })
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

  test('fails the e2e rungs when the stack does not come up, and still stops it', async () => {
    const env = workspaceWith(withE2e({ 'test:docker-compose': 'echo e2e' }))
    writeFileSync(join(root, 'up-fails'), '')

    const outcome = await gate(env, { phase: 'e2e' })

    expect({ rungs: outcome.rungs, calls: stackCalls() }).toEqual({
      rungs: [
        expect.objectContaining({
          ok: false,
          reason: expect.stringContaining(
            'The workspace stack did not come up (run-stack.sh exited 9).'
          )
        })
      ],
      calls: ['run-stack.sh -d', 'stop-stack.sh']
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
