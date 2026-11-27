import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { afterEach, describe, expect, test } from 'vitest'
import { z } from 'zod'
import { envelopeOf, runTim } from '../../test-support/tim-cli.js'
import { renderVersionsText } from './versions.js'

const METADATA_PATH =
  '/maven2/org/springdoc/springdoc-openapi-starter-webmvc-ui/maven-metadata.xml'
const springdocMetadata = readFileSync(
  new URL(
    '../../test-support/fixtures/maven-central/springdoc-webmvc-ui.xml',
    import.meta.url
  ),
  'utf8'
)

const envelopeSchema = z.object({
  ok: z.literal(true),
  schema_version: z.literal(1),
  result: z
    .object({
      package: z.string(),
      ecosystem: z.enum(['npm', 'maven']),
      versions: z.array(z.string())
    })
    .strict()
})

let registry

afterEach(async () => {
  await registry?.close()
  registry = undefined
})

const startRegistry = async () => {
  const answers = {
    [METADATA_PATH]: { type: 'application/xml', body: springdocMetadata },
    '/govuk-frontend': {
      type: 'application/json',
      body: JSON.stringify({ versions: { '6.5.0': {}, '6.6.0': {} } })
    }
  }
  const server = createServer((request, response) => {
    const answer = answers[request.url]
    response.writeHead(answer ? 200 : 404, {
      'content-type': answer?.type ?? 'text/plain'
    })
    response.end(answer?.body ?? '')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  return {
    env: {
      MAVEN_CENTRAL_URL: `${origin}/maven2`,
      npm_config_registry: `${origin}/`
    },
    close: () => new Promise((resolve) => server.close(resolve))
  }
}

describe('tim deps versions', () => {
  test('Should list the Maven Central versions of a groupId:artifactId as JSON', async () => {
    registry = await startRegistry()

    const run = await runTim(
      [
        'deps',
        'versions',
        'org.springdoc:springdoc-openapi-starter-webmvc-ui',
        '--json'
      ],
      { env: registry.env }
    )

    expect({
      exitCode: run.exitCode,
      result: envelopeSchema.parse(envelopeOf(run)).result
    }).toEqual({
      exitCode: 0,
      result: {
        package: 'org.springdoc:springdoc-openapi-starter-webmvc-ui',
        ecosystem: 'maven',
        versions: ['2.8.13', '2.8.14', '3.0.0-RC1', '3.0.0']
      }
    })
  })

  test('Should print the npm versions of an npm package one a line', async () => {
    registry = await startRegistry()

    const run = await runTim(['deps', 'versions', 'govuk-frontend'], {
      env: registry.env
    })

    expect({ exitCode: run.exitCode, stdout: run.stdout }).toEqual({
      exitCode: 0,
      stdout: '6.5.0\n6.6.0'
    })
  })

  test('Should refuse a coordinate Maven Central does not have, saying so', async () => {
    registry = await startRegistry()

    const run = await runTim(
      ['deps', 'versions', 'org.example:no-such-artifact', '--json'],
      { env: registry.env }
    )

    expect(envelopeOf(run)).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'NOT_FOUND',
          message:
            'publishedVersions(org.example:no-such-artifact): Maven Central has no such groupId:artifactId.'
        }
      ]
    })
  })
})

describe('#renderVersionsText', () => {
  test('Should print one version a line', () => {
    expect(renderVersionsText({ versions: ['2.8.14', '3.0.0'] })).toBe(
      '2.8.14\n3.0.0'
    )
  })
})
