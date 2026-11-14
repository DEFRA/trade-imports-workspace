import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test } from 'vitest'
import {
  fakeToolsEnv,
  installFakeStackTools
} from '../test-support/fake-docker.js'
import { composeArgs, composeInvocation, devBuildPlatform } from './compose.js'
import { ALL_PROFILES, OPT_IN_PROFILES } from './definition.js'

const goldenFolder = fileURLToPath(
  new URL('../test-support/fixtures/stack/', import.meta.url)
)

const golden = (script) =>
  JSON.parse(readFileSync(join(goldenFolder, `${script}.json`), 'utf8'))

const recordedScenario = (script, name) =>
  golden(script).find((scenario) => scenario.name === name)

const argsBefore = (args, subcommand) => args.slice(0, args.indexOf(subcommand))

const recordedComposePrefix = (script, name, subcommand) =>
  argsBefore(
    recordedScenario(script, name).sequence.find(({ args }) =>
      args.includes(subcommand)
    ).args,
    subcommand
  )

describe('#composeArgs', () => {
  test.each([
    ['no flags', { dev: false, perf: false }],
    ['dev', { dev: true, perf: false }],
    ['perf', { dev: false, perf: true }],
    ['dev and perf', { dev: true, perf: true }]
  ])(
    'Should give the compose files and profiles run-stack.sh gave for "%s"',
    (name, overlays) => {
      const args = composeArgs({
        workspaceRoot: '<WORKSPACE>',
        profiles: ALL_PROFILES,
        ...overlays
      })

      expect(args).toEqual(recordedComposePrefix('run-stack', name, 'config'))
    }
  )

  test('Should give the compose files and every profile stop-stack.sh gave', () => {
    const args = composeArgs({
      workspaceRoot: '<WORKSPACE>',
      profiles: [...ALL_PROFILES, ...OPT_IN_PROFILES]
    })

    expect(args).toEqual(recordedComposePrefix('stop-stack', 'no args', 'down'))
  })

  test('Should give the dev compose files and default profiles bounce-backend.sh and dev-service.sh gave', () => {
    const args = composeArgs({
      workspaceRoot: '<WORKSPACE>',
      dev: true,
      profiles: ALL_PROFILES
    })

    expect([args, args]).toEqual([
      recordedComposePrefix('bounce-backend', 'no args', 'up'),
      recordedComposePrefix('dev-service', 'rebuild two services', 'up')
    ])
  })
})

let fake

afterEach(() => fake?.remove())

const platformWith = ({ serverArch, env = {}, machineArch = 'x86_64' }) => {
  fake = installFakeStackTools({ serverArch })
  return devBuildPlatform({
    env: fakeToolsEnv(fake.binDir, env),
    machineArch: () => machineArch
  })
}

describe('#devBuildPlatform', () => {
  test('Should use DEV_BUILD_PLATFORM as it is when set, without asking Docker', async () => {
    const platform = await platformWith({
      serverArch: 'arm64',
      env: { DEV_BUILD_PLATFORM: 'linux/riscv64' }
    })

    expect({ platform, calls: fake.calls() }).toEqual({
      platform: 'linux/riscv64',
      calls: []
    })
  })

  test.each([
    ['arm64', 'linux/arm64'],
    ['aarch64', 'linux/arm64'],
    ['x86_64', 'linux/amd64'],
    ['amd64', 'linux/amd64'],
    ['s390x', 'linux/s390x']
  ])(
    'Should build for the Docker daemon answering %s as %s',
    async (serverArch, expected) => {
      const platform = await platformWith({
        serverArch,
        machineArch: 'unused'
      })

      expect(platform).toBe(expected)
    }
  )

  test('Should fall back to this machine when the Docker daemon does not answer', async () => {
    const platform = await platformWith({
      serverArch: null,
      machineArch: 'aarch64'
    })

    expect(platform).toBe('linux/arm64')
  })

  test('Should fall back to this machine when Docker is not installed', async () => {
    const emptyPath = mkdtempSync(join(tmpdir(), 'tim-no-docker-'))
    try {
      const platform = await devBuildPlatform({
        env: { PATH: emptyPath },
        machineArch: () => 'x86_64'
      })

      expect(platform).toBe('linux/amd64')
    } finally {
      rmSync(emptyPath, { recursive: true, force: true })
    }
  })
})

describe('#composeInvocation', () => {
  test('Should pass DEV_BUILD_PLATFORM to a dev stack call and nothing extra to any other', async () => {
    fake = installFakeStackTools({ serverArch: 'x86_64' })
    const env = fakeToolsEnv(fake.binDir)

    const [dev, plain] = await Promise.all([
      composeInvocation({ workspaceRoot: '/w', dev: true, env }),
      composeInvocation({ workspaceRoot: '/w', env })
    ])

    expect({ dev: dev.env, plain: plain.env }).toEqual({
      dev: { DEV_BUILD_PLATFORM: 'linux/amd64' },
      plain: {}
    })
  })
})
