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
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const HOLDER = 'ibl-20261001T090000Z inc-003 ladder'

let workspace

const writeExecutable = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

const statePath = () => join(workspace, 'stack-state')
const leasePath = () => join(workspace, 'state', 'stack-lease.json')
const callsPath = () => join(workspace, 'stack-calls')

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-docker-lease-'))
  writeFileSync(join(workspace, 'Makefile'), 'all:\n')
  mkdirSync(join(workspace, 'repos'))
  writeExecutable(
    join(workspace, 'scripts', 'stack', 'run-stack.sh'),
    `echo "run-stack.sh $* STUB_PROFILE=$STUB_PROFILE" >> '${callsPath()}'\necho up > '${statePath()}'`
  )
  writeExecutable(
    join(workspace, 'scripts', 'stack', 'stop-stack.sh'),
    `rm -f '${statePath()}'`
  )
  writeExecutable(
    join(workspace, 'fake-bin', 'docker'),
    `if [ "$1" = ps ] && [ -f '${statePath()}' ]; then echo trade-imports-frontend-1; fi`
  )
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const runDocker = (args, env = {}) =>
  execa('node', [cliPath, 'docker', ...args, '--workspace', workspace], {
    reject: false,
    env: {
      TIM_NO_AUTO_PULL: '1',
      TIM_STACK_LEASE: leasePath(),
      STUB_PROFILE: '',
      PATH: `${join(workspace, 'fake-bin')}:${process.env.PATH}`,
      ...env
    }
  })

const runTim = (args) => runDocker(['lease', ...args])

const envelopeOf = (run) => JSON.parse(run.stdout.trim())

const leaseOnDisk = () => JSON.parse(readFileSync(leasePath(), 'utf8'))

const stackCalls = () =>
  existsSync(callsPath())
    ? readFileSync(callsPath(), 'utf8').trim().split('\n')
    : []

const writeLease = (holder, fields = {}) => {
  mkdirSync(dirname(leasePath()), { recursive: true })
  writeFileSync(
    leasePath(),
    JSON.stringify({
      holder,
      mode: 'dev',
      acquiredAt: '2026-10-01T08:00:00.000Z',
      branches: {},
      state: 'up',
      pid: null,
      containers: ['trade-imports-frontend-1'],
      ...fields
    })
  )
}

describe('tim docker lease acquire', () => {
  test('starts a stack that is down and leases it to the holder', async () => {
    const run = await runTim(['acquire', '--holder', HOLDER, '--json'])

    expect({
      exitCode: run.exitCode,
      result: envelopeOf(run).result,
      up: existsSync(statePath()),
      lease: JSON.parse(readFileSync(leasePath(), 'utf8')).holder
    }).toEqual({
      exitCode: 0,
      result: expect.objectContaining({ acquired: true, started: true }),
      up: true,
      lease: HOLDER
    })
  })

  test('exits 1 with STACK_HELD and the holder when another holder has the stack', async () => {
    writeFileSync(statePath(), 'up\n')
    writeLease('ibl-20261001T080000Z inc-001 consistency')

    const run = await runTim(['acquire', '--holder', HOLDER, '--json'])

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code,
      holder: envelopeOf(run).result.holder
    }).toEqual({
      exitCode: 1,
      code: 'STACK_HELD',
      holder: 'ibl-20261001T080000Z inc-001 consistency'
    })
  })

  test('refuses to run without a holder', async () => {
    const run = await runTim(['acquire'])

    expect({ exitCode: run.exitCode, stderr: run.stderr.trim() }).toEqual({
      exitCode: 2,
      stderr:
        'Name the holder with --holder, such as the build run’s id, "ibl-20261001T090000Z".'
    })
  })
})

describe('tim docker lease release', () => {
  test('takes down the stack the holder started and clears the lease', async () => {
    writeFileSync(statePath(), 'up\n')
    writeLease(HOLDER)

    const run = await runTim(['release', '--holder', HOLDER])

    expect({
      exitCode: run.exitCode,
      stdout: run.stdout.trim(),
      up: existsSync(statePath()),
      lease: existsSync(leasePath())
    }).toEqual({
      exitCode: 0,
      stdout: `Took the workspace stack down and cleared the lease "${HOLDER}" held.`,
      up: false,
      lease: false
    })
  })

  test('exits 1 with NOT_HOLDER for a lease somebody else holds', async () => {
    writeFileSync(statePath(), 'up\n')
    writeLease('ibl-20261001T080000Z inc-001 consistency')

    const run = await runTim(['release', '--holder', HOLDER, '--json'])

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code,
      up: existsSync(statePath())
    }).toEqual({ exitCode: 1, code: 'NOT_HOLDER', up: true })
  })
})

describe('tim docker lease status', () => {
  test('says the stack is up with nobody holding it', async () => {
    writeFileSync(statePath(), 'up\n')

    const run = await runTim(['status'])

    expect(run.stdout.trim()).toBe(
      'The workspace stack is up (1 container). Nobody holds a lease on it, so somebody started it by hand.'
    )
  })

  test('says the stack is in perf mode and which profile its stubs run', async () => {
    writeFileSync(statePath(), 'up\n')
    writeLease('perf', { mode: 'perf', stubProfile: 'sla' })

    const run = await runTim(['status'])

    expect(run.stdout.trim()).toBe(
      'The workspace stack is up (1 container). It is leased to "perf" (perf mode, stubs on sla, since 2026-10-01T08:00:00.000Z).'
    )
  })
})

describe('tim docker lease acquire --mode perf', () => {
  test('is accepted', async () => {
    const run = await runTim([
      'acquire',
      '--holder',
      HOLDER,
      '--mode',
      'perf',
      '--json'
    ])

    expect({ exitCode: run.exitCode, mode: leaseOnDisk().mode }).toEqual({
      exitCode: 0,
      mode: 'perf'
    })
  })
})

describe('tim docker perf', () => {
  test('starts the stack with --perf and leases it to "perf" in perf mode', async () => {
    const run = await runDocker(['perf'])

    expect({
      exitCode: run.exitCode,
      stdout: run.stdout.trim(),
      calls: stackCalls(),
      lease: leaseOnDisk()
    }).toEqual({
      exitCode: 0,
      stdout:
        'Started the workspace stack in perf mode, with both stubs on the sla latency profile, and leased it to "perf". Release it with tim docker lease release --holder "perf".',
      calls: ['run-stack.sh --perf STUB_PROFILE='],
      lease: expect.objectContaining({
        holder: 'perf',
        mode: 'perf',
        stubProfile: 'sla'
      })
    })
  })

  test('takes the holder from --holder', async () => {
    await runDocker(['perf', '--holder', HOLDER])

    expect(leaseOnDisk().holder).toBe(HOLDER)
  })

  test('passes STUB_PROFILE to the stack and records it', async () => {
    await runDocker(['perf'], { STUB_PROFILE: 'zero-delay' })

    expect({
      calls: stackCalls(),
      stubProfile: leaseOnDisk().stubProfile
    }).toEqual({
      calls: ['run-stack.sh --perf STUB_PROFILE=zero-delay'],
      stubProfile: 'zero-delay'
    })
  })

  test('refuses an unknown STUB_PROFILE before starting anything', async () => {
    const run = await runDocker(['perf'], { STUB_PROFILE: 'fast' })

    expect({
      exitCode: run.exitCode,
      stderr: run.stderr.trim(),
      up: existsSync(statePath()),
      lease: existsSync(leasePath())
    }).toEqual({
      exitCode: 2,
      stderr: 'STUB_PROFILE must be zero-delay or sla, not "fast".',
      up: false,
      lease: false
    })
  })

  test('exits 1 with STACK_HELD when a build holds the stack', async () => {
    writeFileSync(statePath(), 'up\n')
    writeLease('ibl-20261001T080000Z inc-001 consistency')

    const run = await runDocker(['perf', '--json'])

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code,
      holder: envelopeOf(run).result.holder,
      calls: stackCalls()
    }).toEqual({
      exitCode: 1,
      code: 'STACK_HELD',
      holder: 'ibl-20261001T080000Z inc-001 consistency',
      calls: []
    })
  })
})
