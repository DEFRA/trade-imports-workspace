import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  readFileSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { serviceLabels } from './logs.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

let workspace

const writeExecutable = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

const dockerCallPath = () => join(workspace, 'docker-call')

const writeFakeDocker = (exitCode = 0) =>
  writeExecutable(
    join(workspace, 'fake-bin', 'docker'),
    `printf '%s' "$*" > '${dockerCallPath()}'\nexit ${exitCode}`
  )

const dockerCall = () =>
  existsSync(dockerCallPath()) ? readFileSync(dockerCallPath(), 'utf8') : null

const runLogs = (args) =>
  execa(
    'node',
    [cliPath, 'docker', 'logs', ...args, '--workspace', workspace],
    {
      reject: false,
      env: {
        TIM_NO_AUTO_PULL: '1',
        TIM_STACK_LEASE: join(workspace, 'stack-lease.json'),
        PATH: `${join(workspace, 'fake-bin')}:${process.env.PATH}`
      }
    }
  )

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-docker-logs-'))
  mkdirSync(join(workspace, 'repos'))
  mkdirSync(join(workspace, '.git'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

describe('#serviceLabels', () => {
  test('Should map each repo-backed service label to its compose service, leaving out sidecars', () => {
    const labels = serviceLabels()

    expect(Object.fromEntries(labels)).toEqual({
      frontend: 'trade-imports-animals-frontend',
      backend: 'trade-imports-animals-backend',
      admin: 'trade-imports-animals-admin',
      'ins-frontend': 'trade-imports-ins-frontend',
      'routing-proxy': 'trade-imports-routing-proxy',
      stub: 'trade-imports-stub',
      'defra-id-stub': 'trade-imports-defra-id-stub',
      'reference-data': 'trade-imports-reference-data',
      'address-book': 'trade-imports-address-book',
      gateway: 'trade-imports-dynamics-gateway',
      'ins-backend': 'trade-imports-ins-backend',
      'plants-frontend': 'trade-imports-plants-frontend',
      'plants-backend': 'trade-imports-plants-backend'
    })
  })
})

describe('tim docker logs', () => {
  test('Should follow the animals frontend, admin and backend when given no services', async () => {
    writeFakeDocker()

    const { exitCode } = await runLogs([])

    expect({ exitCode, call: dockerCall() }).toEqual({
      exitCode: 0,
      call: 'compose -p trade-imports logs -f trade-imports-animals-frontend trade-imports-animals-admin trade-imports-animals-backend'
    })
  })

  test('Should map short labels to compose names and pass compose names through', async () => {
    writeFakeDocker()

    await runLogs(['backend', 'gateway', 'trade-imports-stub'])

    expect(dockerCall()).toBe(
      'compose -p trade-imports logs -f trade-imports-animals-backend trade-imports-dynamics-gateway trade-imports-stub'
    )
  })

  test('Should print the last lines and stop with --no-follow and --tail', async () => {
    writeFakeDocker()

    await runLogs(['frontend', '--no-follow', '--tail', '100'])

    expect(dockerCall()).toBe(
      'compose -p trade-imports logs --tail 100 trade-imports-animals-frontend'
    )
  })

  test('Should refuse a --tail that is not a number of lines, without running docker', async () => {
    writeFakeDocker()

    const { stdout, exitCode } = await runLogs(['--tail', 'lots', '--json'])

    expect({
      exitCode,
      error: JSON.parse(stdout.trim()).errors[0],
      call: dockerCall()
    }).toEqual({
      exitCode: 2,
      error: {
        code: 'USAGE',
        message: '--tail must be a whole number of lines, or "all".'
      },
      call: null
    })
  })

  test('Should run while a build holds the stack lease', async () => {
    writeFakeDocker()
    writeFileSync(
      join(workspace, 'stack-lease.json'),
      JSON.stringify({
        holder: 'ibl-20261001T090000Z',
        mode: 'dev',
        acquiredAt: '2026-10-01T09:00:00.000Z',
        branches: {},
        state: 'up',
        containers: ['c1']
      })
    )

    const { exitCode } = await runLogs(['--no-follow'])

    expect({ exitCode, ran: dockerCall() !== null }).toEqual({
      exitCode: 0,
      ran: true
    })
  })

  test('Should exit 1 and report the docker exit code when docker compose fails', async () => {
    writeFakeDocker(3)

    const { stdout, exitCode } = await runLogs(['--json'])

    expect({ exitCode, envelope: JSON.parse(stdout.trim()) }).toEqual({
      exitCode: 1,
      envelope: expect.objectContaining({
        ok: false,
        errors: [{ code: 'ERROR', message: 'docker compose logs exited 3' }]
      })
    })
  })

  test('Should explain itself in --help', async () => {
    const { stdout } = await runLogs(['--help'])

    expect(stdout).toContain(
      'Follow the logs of services in the workspace stack. Press Ctrl-C to stop.'
    )
  })
})
