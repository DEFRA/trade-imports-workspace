import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import { createNpmRegistryClient } from './npm-registry-client.js'

const PUBLIC = 'https://registry.npmjs.org'
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

const packageDocument = {
  name: 'govuk-frontend',
  'dist-tags': { latest: '5.10.0', next: '6.0.0-beta.0' },
  versions: { '5.9.0': {}, '6.0.0-beta.0': {}, '5.10.0': {} }
}

describe('#latestVersion', () => {
  test('Should give the version the latest tag points at', async () => {
    mockPool(PUBLIC).get('/govuk-frontend').reply(200, packageDocument)

    const latest = await createNpmRegistryClient({
      registry: `${PUBLIC}/`
    }).latestVersion('govuk-frontend')

    expect(latest).toBe('5.10.0')
  })

  test('Should ask the registry npm_config_registry names when no registry is given', async () => {
    const mirror = 'https://npm.mirror.example'
    const before = process.env.npm_config_registry
    process.env.npm_config_registry = `${mirror}/`
    mockPool(mirror).get('/govuk-frontend').reply(200, packageDocument)

    try {
      const latest =
        await createNpmRegistryClient().latestVersion('govuk-frontend')

      expect(latest).toBe('5.10.0')
    } finally {
      if (before === undefined) delete process.env.npm_config_registry
      else process.env.npm_config_registry = before
    }
  })

  test('Should refuse a package with no latest tag as NOT_FOUND', async () => {
    mockPool(PUBLIC).get('/govuk-frontend').reply(200, { versions: {} })

    await expect(
      createNpmRegistryClient({ registry: PUBLIC }).latestVersion(
        'govuk-frontend'
      )
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'latestVersion(govuk-frontend): no latest tag.'
    })
  })
})

describe('#publishedVersions', () => {
  test('Should give every published version in the registry order', async () => {
    mockPool(PUBLIC).get('/govuk-frontend').reply(200, packageDocument)

    const versions = await createNpmRegistryClient({
      registry: PUBLIC
    }).publishedVersions('govuk-frontend')

    expect(versions).toEqual(['5.9.0', '6.0.0-beta.0', '5.10.0'])
  })

  test.each([
    [401, 'AUTH'],
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMIT'],
    [500, 'NETWORK']
  ])('Should map a %i from the registry to %s', async (status, code) => {
    mockPool(PUBLIC).get('/govuk-frontend').reply(status, {})

    await expect(
      createNpmRegistryClient({ registry: PUBLIC }).publishedVersions(
        'govuk-frontend'
      )
    ).rejects.toMatchObject({ code })
  })

  test('Should refuse a body that is not JSON as PARSE', async () => {
    mockPool(PUBLIC).get('/govuk-frontend').reply(200, 'not json')

    await expect(
      createNpmRegistryClient({ registry: PUBLIC }).publishedVersions(
        'govuk-frontend'
      )
    ).rejects.toMatchObject({
      code: 'PARSE',
      message: 'publishedVersions(govuk-frontend): invalid JSON response.'
    })
  })
})
