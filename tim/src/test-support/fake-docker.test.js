import { execa } from 'execa'
import { afterEach, describe, expect, test } from 'vitest'
import { fakeToolsEnv, installFakeStackTools, traceOf } from './fake-docker.js'

let fake

afterEach(() => fake?.remove())

const runFake = (command, args, env = {}) =>
  execa(command, args, {
    env: fakeToolsEnv(fake.binDir, env),
    extendEnv: false,
    reject: false
  })

describe('#installFakeStackTools', () => {
  test('Should list the services of the profiles a compose config call names', async () => {
    fake = installFakeStackTools({
      servicesByProfile: { database: ['mongodb'], stubs: ['stub'] }
    })

    const { stdout, exitCode } = await runFake('docker', [
      'compose',
      '-f',
      'a.yml',
      '--profile',
      'database',
      '--profile',
      'stubs',
      'config',
      '--services'
    ])

    expect({ stdout, exitCode }).toEqual({
      stdout: 'mongodb\nstub',
      exitCode: 0
    })
  })

  test('Should answer a manifest call by call, and fail for a tag it does not hold', async () => {
    fake = installFakeStackTools({
      manifests: { 'defradigital/web:feat-x': [null, 'one'] }
    })

    const answers = []
    for (const reference of [
      'defradigital/web:feat-x',
      'defradigital/web:feat-x',
      'defradigital/api:feat-x'
    ]) {
      const { stdout, exitCode } = await runFake('docker', [
        'manifest',
        'inspect',
        reference
      ])
      answers.push({ stdout, exitCode })
    }

    expect(answers).toEqual([
      { stdout: '', exitCode: 1 },
      { stdout: '{"digest":"one"}', exitCode: 0 },
      { stdout: '', exitCode: 1 }
    ])
  })

  test('Should fail a compose subcommand its first given times, then succeed', async () => {
    fake = installFakeStackTools({
      composeFailures: [{ command: 'up mongodb', times: 1, exitCode: 3 }]
    })

    const exitCodes = []
    for (let attempt = 0; attempt < 2; attempt++) {
      const { exitCode } = await runFake('docker', [
        'compose',
        '-f',
        'a.yml',
        'up',
        'mongodb'
      ])
      exitCodes.push(exitCode)
    }

    expect(exitCodes).toEqual([3, 0])
  })

  test('Should answer ls-remote with exit 2 for a repo without the branch, and refuse a clone', async () => {
    fake = installFakeStackTools({ branchesAbsent: ['gone'] })

    const results = await Promise.all(
      [
        ['ls-remote', '--heads', 'https://github.com/DEFRA/gone.git', 'x'],
        ['ls-remote', '--heads', 'https://github.com/DEFRA/here.git', 'x'],
        ['clone', 'https://github.com/DEFRA/here.git']
      ].map(async (args) => (await runFake('git', args)).exitCode)
    )

    expect(results).toEqual([2, 0, 128])
  })

  test('Should record each call with the image-tag variables it ran with', async () => {
    fake = installFakeStackTools()

    await runFake('docker', ['compose', 'up', 'web'], {
      TRADE_IMPORTS_STUB: 'feat-x',
      UNRELATED: 'y'
    })

    expect(fake.calls()).toEqual([
      {
        tool: 'docker',
        args: ['compose', 'up', 'web'],
        env: { TRADE_IMPORTS_STUB: 'feat-x' }
      }
    ])
  })
})

describe('#traceOf', () => {
  test('Should keep ordered calls in order, sort probes and pulls, and hide the workspace path', () => {
    const calls = [
      {
        tool: 'docker',
        args: ['compose', '-f', '/w/a.yml', 'config'],
        env: {}
      },
      { tool: 'docker', args: ['manifest', 'inspect', 'b'], env: {} },
      { tool: 'docker', args: ['manifest', 'inspect', 'a'], env: {} },
      { tool: 'docker', args: ['compose', 'pull', 'x'], env: {} },
      { tool: 'docker', args: ['compose', 'up'], env: {} }
    ]

    expect(traceOf(calls, '/w')).toEqual({
      sequence: [
        {
          tool: 'docker',
          args: ['compose', '-f', '<WORKSPACE>/a.yml', 'config'],
          env: {}
        },
        { tool: 'docker', args: ['compose', 'up'], env: {} }
      ],
      concurrent: [
        { tool: 'docker', args: ['compose', 'pull', 'x'], env: {} },
        { tool: 'docker', args: ['manifest', 'inspect', 'a'], env: {} },
        { tool: 'docker', args: ['manifest', 'inspect', 'b'], env: {} }
      ]
    })
  })
})
