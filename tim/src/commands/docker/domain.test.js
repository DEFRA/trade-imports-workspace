import { execa } from 'execa'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const runTim = (args) =>
  execa('node', [cliPath, ...args], { reject: false, all: true })

describe('tim docker domain list', () => {
  test('Should name every domain and how many services it starts', async () => {
    const run = await runTim(['docker', 'domain', 'list'])

    expect(
      run.stdout.split('\n').filter((line) => !line.startsWith(' '))
    ).toEqual(['animals (12)', 'animals-admin (12)', 'ins (11)', 'plants (10)'])
  })

  test('Should give each domain its services in --json', async () => {
    const run = await runTim(['docker', 'domain', 'list', '--json'])
    const envelope = JSON.parse(run.stdout.split('\n').at(-1))

    expect({
      ok: envelope.ok,
      plants: envelope.result.find(({ domain }) => domain === 'plants').services
    }).toEqual({
      ok: true,
      plants: [
        'floci',
        'floci-init',
        'mongodb',
        'redis',
        'trade-imports-address-book',
        'trade-imports-defra-id-stub',
        'trade-imports-plants-backend',
        'trade-imports-plants-frontend',
        'trade-imports-reference-data',
        'trade-imports-stub'
      ]
    })
  })
})

describe('tim docker domain verify', () => {
  test('Should refuse a domain it does not know, and name the ones it does', async () => {
    const run = await runTim(['docker', 'domain', 'verify', 'germinal'])

    expect({
      exitCode: run.exitCode,
      mentionsDomains: run.all.includes('plants')
    }).toEqual({
      exitCode: 1,
      mentionsDomains: true
    })
  })

  test('Should say in --help that it takes the stack up and down itself', async () => {
    const run = await runTim(['docker', 'domain', 'verify', '--help'])

    expect(run.stdout).toContain('no lease may be held')
  })
})
