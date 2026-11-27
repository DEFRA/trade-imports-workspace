import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import { createMavenCentralClient } from './maven-central-client.js'

const CENTRAL = 'https://repo1.maven.org'
const METADATA_PATH =
  '/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/maven-metadata.xml'
const COORDINATE = 'org.springdoc:springdoc-openapi-starter-webmvc-ui'
const metadata = readFileSync(
  new URL(
    '../test-support/fixtures/maven-central/springdoc-webmvc-ui.xml',
    import.meta.url
  ),
  'utf8'
)

let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

describe('#publishedVersions', () => {
  test('Should give every version the maven-metadata.xml lists, in its order', async () => {
    mockPool(CENTRAL).get(METADATA_PATH).reply(200, metadata)

    const versions =
      await createMavenCentralClient().publishedVersions(COORDINATE)

    expect(versions).toEqual(['2.8.13', '2.8.14', '3.0.0-RC1', '3.0.0'])
  })

  test('Should ask the repository MAVEN_CENTRAL_URL names when no repository is given', async () => {
    const mirror = 'https://maven.mirror.example'
    const before = process.env.MAVEN_CENTRAL_URL
    process.env.MAVEN_CENTRAL_URL = `${mirror}/releases/`
    mockPool(mirror)
      .get(
        '/releases/org/springdoc/springdoc-openapi-starter-webmvc-ui/maven-metadata.xml'
      )
      .reply(200, metadata)

    try {
      const versions =
        await createMavenCentralClient().publishedVersions(COORDINATE)

      expect(versions.at(-1)).toBe('3.0.0')
    } finally {
      if (before === undefined) delete process.env.MAVEN_CENTRAL_URL
      else process.env.MAVEN_CENTRAL_URL = before
    }
  })

  test('Should refuse metadata that lists no versions as PARSE', async () => {
    mockPool(CENTRAL).get(METADATA_PATH).reply(200, '<metadata></metadata>')

    await expect(
      createMavenCentralClient().publishedVersions(COORDINATE)
    ).rejects.toMatchObject({
      code: 'PARSE',
      message: `publishedVersions(${COORDINATE}): the maven-metadata.xml lists no versions.`
    })
  })

  test.each([
    [401, 'AUTH'],
    [403, 'AUTH'],
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMIT'],
    [500, 'NETWORK']
  ])('Should map a %i from Maven Central to %s', async (status, code) => {
    mockPool(CENTRAL).get(METADATA_PATH).reply(status, '')

    await expect(
      createMavenCentralClient().publishedVersions(COORDINATE)
    ).rejects.toMatchObject({ code })
  })

  test('Should refuse a connection that fails as NETWORK', async () => {
    mockPool(CENTRAL).get(METADATA_PATH).replyWithError('connect ECONNREFUSED')

    await expect(
      createMavenCentralClient().publishedVersions(COORDINATE)
    ).rejects.toMatchObject({
      code: 'NETWORK',
      message: expect.stringContaining(`publishedVersions(${COORDINATE}):`)
    })
  })
})
