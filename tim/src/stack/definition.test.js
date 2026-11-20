import { execa } from 'execa'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { composeArgs } from './compose.js'
import {
  ALL_PROFILES,
  CORE_SERVICES,
  DOMAIN_NAMES,
  OPT_IN_PROFILES,
  SERVICES,
  servicesForDomain,
  SIDECARS,
  stackDir
} from './definition.js'

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))

describe('the stack definition matches the compose files', () => {
  test('Should name an image tag variable for each service in its compose file', () => {
    const composeText = readdirSync(stackDir(workspaceRoot))
      .filter((file) => file.endsWith('.yml'))
      .map((file) => readFileSync(join(stackDir(workspaceRoot), file), 'utf8'))
      .join('\n')

    const servicesWithoutTheirImage = SERVICES.filter(
      ({ composeName, tagVariable }) =>
        !composeText.includes(
          `image: defradigital/${composeName}:\${${tagVariable}:-latest}`
        )
    ).map(({ label }) => label)

    expect(servicesWithoutTheirImage).toEqual([])
  })

  const dockerComposeAnswers = async () => {
    try {
      const { exitCode } = await execa('docker', ['compose', 'version'], {
        reject: false
      })
      return exitCode === 0
    } catch {
      return false
    }
  }

  test('Should name only services and sidecars the compose files define', async (context) => {
    if (!(await dockerComposeAnswers())) context.skip()
    const { stdout } = await execa('docker', [
      ...composeArgs({
        workspaceRoot,
        profiles: [...ALL_PROFILES, ...OPT_IN_PROFILES]
      }),
      'config',
      '--services'
    ])
    const defined = stdout.split('\n')

    const unknown = [...SERVICES, ...SIDECARS]
      .map(({ composeName }) => composeName)
      .filter((composeName) => !defined.includes(composeName))

    expect(unknown).toEqual([])
  })

  test('Should name only services the compose files define in every domain', async (context) => {
    if (!(await dockerComposeAnswers())) context.skip()
    const { stdout } = await execa('docker', [
      ...composeArgs({
        workspaceRoot,
        profiles: [...ALL_PROFILES, ...OPT_IN_PROFILES]
      }),
      'config',
      '--services'
    ])
    const defined = stdout.split('\n')

    const unknown = DOMAIN_NAMES.flatMap((domain) =>
      servicesForDomain(domain)
        .filter((service) => !defined.includes(service))
        .map((service) => `${domain}: ${service}`)
    )

    expect(unknown).toEqual([])
  })
})

describe('#servicesForDomain', () => {
  test.each(DOMAIN_NAMES)('Should give %s the core services', (domain) => {
    const missing = CORE_SERVICES.filter(
      (service) => !servicesForDomain(domain).includes(service)
    )

    expect(missing).toEqual([])
  })

  test('Should name the plants services and the core, sorted', () => {
    expect(servicesForDomain('plants')).toEqual([
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
    ])
  })

  test('Should name each service once, in every domain', () => {
    const duplicated = DOMAIN_NAMES.filter((domain) => {
      const services = servicesForDomain(domain)
      return new Set(services).size !== services.length
    })

    expect(duplicated).toEqual([])
  })

  test('Should start fewer services than the whole stack, for every domain', () => {
    const sizes = Object.fromEntries(
      DOMAIN_NAMES.map((domain) => [domain, servicesForDomain(domain).length])
    )

    expect(sizes).toEqual({
      animals: 15,
      'animals-admin': 17,
      ins: 17,
      plants: 10
    })
  })
})
