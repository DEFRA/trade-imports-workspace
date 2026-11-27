import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import { createMavenCentralClient } from '../clients/maven-central-client.js'
import { createNpmRegistryClient } from '../clients/npm-registry-client.js'
import { publishedVersionsOf } from './versions.js'

const fixture = (path) =>
  readFileSync(
    new URL(`../test-support/fixtures/${path}`, import.meta.url),
    'utf8'
  )

const registries = () => ({
  npm: createNpmRegistryClient({ registry: 'https://registry.npmjs.org' }),
  maven: createMavenCentralClient({
    repository: 'https://repo1.maven.org/maven2'
  })
})

let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

describe('#publishedVersionsOf', () => {
  test('Should read a groupId:artifactId from Maven Central', async () => {
    mockPool('https://repo1.maven.org')
      .get(
        '/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/maven-metadata.xml'
      )
      .reply(200, fixture('maven-central/springdoc-webmvc-ui.xml'))

    const result = await publishedVersionsOf(
      'org.springdoc:springdoc-openapi-starter-webmvc-ui',
      registries()
    )

    expect(result).toEqual({
      package: 'org.springdoc:springdoc-openapi-starter-webmvc-ui',
      ecosystem: 'maven',
      versions: ['2.8.13', '2.8.14', '3.0.0-RC1', '3.0.0']
    })
  })

  test('Should refuse a name that is neither an npm package nor a groupId:artifactId as USAGE, asking no registry', async () => {
    await expect(
      publishedVersionsOf('@axe-core/*', registries())
    ).rejects.toMatchObject({
      code: 'USAGE',
      message:
        'Give an npm package name, such as govuk-frontend, or a Maven groupId:artifactId, such as org.springdoc:springdoc-openapi-starter-webmvc-ui. "@axe-core/*" is neither.'
    })
  })

  test('Should read an npm package from the npm registry', async () => {
    const document = JSON.parse(fixture('npm-registry/govuk-frontend.json'))
    mockPool('https://registry.npmjs.org')
      .get('/govuk-frontend')
      .reply(200, document)

    const result = await publishedVersionsOf('govuk-frontend', registries())

    expect(result).toEqual({
      package: 'govuk-frontend',
      ecosystem: 'npm',
      versions: Object.keys(document.versions)
    })
  })
})
