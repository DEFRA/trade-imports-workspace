import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import { createGovukChangelogClient } from './govuk-changelog-client.js'

const RAW = 'https://raw.githubusercontent.com'
const CHANGELOG_PATH = '/alphagov/govuk-frontend/main/CHANGELOG.md'
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
})

describe('#fetchChangelog', () => {
  test('Should give the raw CHANGELOG.md from govuk-frontend main', async () => {
    mockPool(RAW).get(CHANGELOG_PATH).reply(200, '# Changelog\n\n## v5.10.0\n')

    const changelog = await createGovukChangelogClient().fetchChangelog()

    expect(changelog).toBe('# Changelog\n\n## v5.10.0\n')
  })

  test('Should refuse an error status as NETWORK, naming the file', async () => {
    mockPool(RAW).get(CHANGELOG_PATH).reply(404, 'Not Found')

    await expect(
      createGovukChangelogClient().fetchChangelog()
    ).rejects.toMatchObject({
      code: 'NETWORK',
      message: `Cannot download CHANGELOG.md from ${RAW}${CHANGELOG_PATH}: it returned 404`
    })
  })
})
