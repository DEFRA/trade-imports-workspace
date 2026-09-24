import { describe, test, expect } from 'vitest'
import { validateWithOpenspecCli } from './openspec-cli.js'

const fakeRun = (stdout) => {
  const calls = []
  return {
    calls,
    run: async (command, args, opts) => {
      calls.push({ command, args, cwd: opts.cwd })
      return { stdout, stderr: '', exitCode: 0 }
    }
  }
}

describe('validateWithOpenspecCli', () => {
  test('runs npx against --specs in the spec root, with --strict --json', async () => {
    const { calls, run } = fakeRun(JSON.stringify({ items: [] }))

    await validateWithOpenspecCli({ specRoot: '/ws', run })

    expect(calls).toEqual([
      {
        command: 'npx',
        args: [
          '--yes',
          '@fission-ai/openspec@latest',
          'validate',
          '--specs',
          '--strict',
          '--json'
        ],
        cwd: '/ws'
      }
    ])
  })

  test('scopes to one capability when given, instead of --specs', async () => {
    const { calls, run } = fakeRun(JSON.stringify({ items: [] }))

    await validateWithOpenspecCli({
      specRoot: '/ws',
      capability: 'live-animals/addresses',
      run
    })

    expect(calls[0].args).toEqual([
      '--yes',
      '@fission-ai/openspec@latest',
      'validate',
      'live-animals/addresses',
      '--strict',
      '--json'
    ])
  })

  test('reports nothing for items that validated clean', async () => {
    const { run } = fakeRun(
      JSON.stringify({ items: [{ id: 'widgets', valid: true, issues: [] }] })
    )

    await expect(
      validateWithOpenspecCli({ specRoot: '/ws', run })
    ).resolves.toEqual([])
  })

  test('turns every issue on an invalid item into a finding', async () => {
    const { run } = fakeRun(
      JSON.stringify({
        items: [
          {
            id: 'widgets',
            valid: false,
            issues: [
              {
                level: 'ERROR',
                path: 'file',
                message: 'Spec must have a Purpose section.'
              }
            ]
          }
        ]
      })
    )

    await expect(
      validateWithOpenspecCli({ specRoot: '/ws', run })
    ).resolves.toEqual([
      {
        check: 'openspec-validate',
        capability: 'widgets',
        message: '[ERROR] file: Spec must have a Purpose section.'
      }
    ])
  })

  test('does not turn an INFO issue on an otherwise-valid item into a finding', async () => {
    const { run } = fakeRun(
      JSON.stringify({
        items: [
          {
            id: 'widgets',
            valid: true,
            issues: [
              {
                level: 'INFO',
                path: 'requirements[0]',
                message: 'Long requirement text.'
              }
            ]
          }
        ]
      })
    )

    await expect(
      validateWithOpenspecCli({ specRoot: '/ws', run })
    ).resolves.toEqual([])
  })

  test('raises PARSE when the CLI output is not JSON', async () => {
    const { run } = fakeRun('not json')

    await expect(
      validateWithOpenspecCli({ specRoot: '/ws', run })
    ).rejects.toMatchObject({
      code: 'PARSE'
    })
  })

  test('raises PARSE when the JSON has no items array', async () => {
    const { run } = fakeRun(
      JSON.stringify({
        status: [{ severity: 'error', message: 'Unknown item widgets' }]
      })
    )

    await expect(
      validateWithOpenspecCli({ specRoot: '/ws', run })
    ).rejects.toMatchObject({
      code: 'PARSE',
      message: expect.stringContaining('Unknown item widgets')
    })
  })

  test('raises PARSE rather than throwing a TypeError when the JSON is not an object', async () => {
    const { run } = fakeRun('null')

    await expect(
      validateWithOpenspecCli({ specRoot: '/ws', run })
    ).rejects.toMatchObject({
      code: 'PARSE',
      message: expect.stringContaining('did not return an items array')
    })
  })

  test('treats a missing issues array as no issues rather than throwing', async () => {
    const { run } = fakeRun(
      JSON.stringify({ items: [{ id: 'widgets', valid: false }] })
    )

    await expect(
      validateWithOpenspecCli({ specRoot: '/ws', run })
    ).resolves.toEqual([])
  })
})
