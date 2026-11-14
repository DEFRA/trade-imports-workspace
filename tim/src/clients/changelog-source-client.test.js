import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import { createChangelogSourceClient } from './changelog-source-client.js'

const REGISTRY = 'https://registry.npmjs.org'
const RAW = 'https://raw.githubusercontent.com'
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

describe('#packageRecord', () => {
  test('Should give the registry record of a scoped package, asked for with its slash', async () => {
    mockPool(REGISTRY)
      .get('/@hapi/hapi')
      .reply(200, { name: '@hapi/hapi', repository: { url: 'git+x' } })

    const record =
      await createChangelogSourceClient().packageRecord('@hapi/hapi')

    expect(record).toEqual({ name: '@hapi/hapi', repository: { url: 'git+x' } })
  })

  test.each([
    [401, 'AUTH', 'the server refused the request.'],
    [404, 'NOT_FOUND', 'there is no such file.'],
    [429, 'RATE_LIMIT', 'the server is busy.'],
    [503, 'NETWORK', 'the server returned 503.']
  ])('Should refuse a %i answer as %s', async (status, code, reason) => {
    mockPool(REGISTRY).get('/lodash').reply(status, 'no')

    await expect(
      createChangelogSourceClient().packageRecord('lodash')
    ).rejects.toMatchObject({
      code,
      message: `Cannot read lodash from the npm registry: ${reason}`
    })
  })

  test('Should refuse a record that is not JSON as PARSE', async () => {
    mockPool(REGISTRY).get('/lodash').reply(200, '<html>')

    await expect(
      createChangelogSourceClient().packageRecord('lodash')
    ).rejects.toMatchObject({
      code: 'PARSE',
      message: 'Cannot read lodash from the npm registry: it is not JSON.'
    })
  })
})

describe('#downloadText', () => {
  const url = `${RAW}/lodash/lodash/main/CHANGELOG.md`

  test('Should give the file text as served', async () => {
    mockPool(RAW)
      .get('/lodash/lodash/main/CHANGELOG.md')
      .reply(200, '# Log\n\n')

    const text = await createChangelogSourceClient().downloadText(url)

    expect(text).toBe('# Log\n\n')
  })

  test('Should refuse a missing file as NOT_FOUND', async () => {
    mockPool(RAW).get('/lodash/lodash/main/CHANGELOG.md').reply(404)

    await expect(
      createChangelogSourceClient().downloadText(url)
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Cannot download ${url}: there is no such file.`
    })
  })

  test('Should give up as NETWORK when the server is slower than the timeout', async () => {
    mockPool(RAW)
      .get('/lodash/lodash/main/CHANGELOG.md')
      .delay(200)
      .reply(200, 'late')

    await expect(
      createChangelogSourceClient({ timeoutMs: 20 }).downloadText(url)
    ).rejects.toMatchObject({ code: 'NETWORK' })
  })
})
