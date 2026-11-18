import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  realpathSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')
const OTHER_CLONE = '/clones/trade-imports-workspace-a'

let workspace

const workingDirsPath = () => join(workspace, 'stack-working-dirs')
const leasePath = () => join(workspace, 'state', 'stack-lease.json')

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(join(tmpdir(), 'tim-docker-owner-')))
  markWorkspaceRoot(workspace)
  mkdirSync(join(workspace, 'repos'))
  const docker = join(workspace, 'fake-bin', 'docker')
  mkdirSync(dirname(docker), { recursive: true })
  writeFileSync(
    docker,
    `#!/usr/bin/env bash\nif [ "$1" = ps ] && [ -f '${workingDirsPath()}' ]; then cat '${workingDirsPath()}'; fi\n`
  )
  chmodSync(docker, 0o755)
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const stackStartedFrom = (clone) =>
  writeFileSync(workingDirsPath(), `${join(clone, 'docker', 'stack')}\n`)

const writeLease = (lease) => {
  mkdirSync(dirname(leasePath()), { recursive: true })
  writeFileSync(leasePath(), JSON.stringify(lease))
}

const runOwner = (args = []) =>
  execa(
    'node',
    [cliPath, 'docker', 'owner', '--workspace', workspace, ...args],
    {
      reject: false,
      env: {
        PATH: `${join(workspace, 'fake-bin')}:${process.env.PATH}`,
        TIM_STACK_LEASE: leasePath()
      }
    }
  )

describe('tim docker owner', () => {
  test('prints the clone that started the running stack', async () => {
    stackStartedFrom(OTHER_CLONE)

    const { stdout, exitCode } = await runOwner()

    expect({ stdout, exitCode }).toEqual({ stdout: OTHER_CLONE, exitCode: 0 })
  })

  test('gives the owner, its source and whether it is this clone with --json', async () => {
    stackStartedFrom(workspace)

    const { stdout, exitCode } = await runOwner(['--json'])

    const payload = JSON.parse(stdout)
    expect({ exitCode, ok: payload.ok, result: payload.result }).toEqual({
      exitCode: 0,
      ok: true,
      result: {
        workspace,
        source: 'containers',
        thisClone: workspace,
        ownedHere: true
      }
    })
  })

  test('names the clone still starting the stack under its lease', async () => {
    writeLease({
      holder: 'ibl-20261001T090000Z',
      workspace: OTHER_CLONE,
      state: 'starting',
      pid: process.pid
    })

    const { stdout, exitCode } = await runOwner(['--json'])

    expect({ exitCode, result: JSON.parse(stdout).result }).toEqual({
      exitCode: 0,
      result: {
        workspace: OTHER_CLONE,
        source: 'lease',
        thisClone: workspace,
        ownedHere: false
      }
    })
  })

  test('prints nothing on stdout and says so on stderr when the stack is down', async () => {
    const { stdout, stderr, exitCode } = await runOwner()

    expect({ stdout, stderr, exitCode }).toEqual({
      stdout: '',
      stderr: 'Nobody owns the workspace stack: it is down.',
      exitCode: 0
    })
  })

  test('fails with PARSE when the lease is not valid JSON', async () => {
    mkdirSync(dirname(leasePath()), { recursive: true })
    writeFileSync(leasePath(), '{not json')

    const { stdout, exitCode } = await runOwner(['--json'])

    const payload = JSON.parse(stdout)
    expect({ exitCode, ok: payload.ok, code: payload.errors[0].code }).toEqual({
      exitCode: 1,
      ok: false,
      code: 'PARSE'
    })
  })
})
