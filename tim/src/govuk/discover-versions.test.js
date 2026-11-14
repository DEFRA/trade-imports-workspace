import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createGovukChangelogClient } from '../clients/govuk-changelog-client.js'
import { createNpmRegistryClient } from '../clients/npm-registry-client.js'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import {
  ADMIN,
  changelogText,
  FRONTEND,
  registryDocument,
  stageStartWorkspace
} from './__fixtures__/govuk-start.js'
import { discoverVersions } from './discover-versions.js'

const REGISTRY = 'https://registry.npmjs.org'
const RAW = 'https://raw.githubusercontent.com'
const CHANGELOG_PATH = '/alphagov/govuk-frontend/main/CHANGELOG.md'

let staged
let mockPool

beforeEach(() => {
  ;({ mockPool } = installHttpMocks())
})

afterEach(() => {
  closeHttpMocks()
  staged?.remove()
  staged = undefined
})

const discover = (repo, extra = {}) =>
  discoverVersions({
    workspaceRoot: staged.root,
    runId: 'EUDPA-500',
    repo,
    registry: createNpmRegistryClient({ registry: REGISTRY }),
    changelogs: createGovukChangelogClient(),
    ...extra
  })

const runFile = (repo, name) =>
  readFileSync(
    join(staged.root, 'workareas/govuk-upgrades/EUDPA-500', repo, name),
    'utf8'
  )

describe('#discoverVersions', () => {
  test('Should seed every stable version after the current one up to the target, in version order', async () => {
    staged = stageStartWorkspace()
    mockPool(REGISTRY).get('/govuk-frontend').reply(200, registryDocument())
    mockPool(RAW).get(CHANGELOG_PATH).reply(200, changelogText())

    const discovered = await discover(FRONTEND, { target: '5.10.0' })

    expect(discovered).toEqual({
      repo: FRONTEND,
      status: 'discovered',
      current: '5.9.0',
      target: '5.10.0',
      versions: ['5.9.1', '5.10.0']
    })
  })

  test('Should write a section up to the next release heading, without its trailing blank lines', async () => {
    staged = stageStartWorkspace()
    mockPool(REGISTRY).get('/govuk-frontend').reply(200, registryDocument())
    mockPool(RAW).get(CHANGELOG_PATH).reply(200, changelogText())

    await discover(FRONTEND, { target: '5.10.0' })

    expect(runFile(FRONTEND, 'version__5.9.1.changelog.md')).toBe(
      "## govuk-frontend v5.9.1 — Changelog\n\n\n### Fixes\n\n- [#5805: Fix the Header's crown height](https://github.com/alphagov/govuk-frontend/pull/5805)\n"
    )
  })

  test('Should name a missing best-practices file by its full path in the bundle', async () => {
    staged = stageStartWorkspace()
    mockPool(REGISTRY).get('/govuk-frontend').reply(200, registryDocument())
    mockPool(RAW).get(CHANGELOG_PATH).reply(200, changelogText())

    await discover(FRONTEND, { target: '5.10.0' })

    expect(runFile(FRONTEND, 'best-practices.md')).toContain(
      `## Source: \`docs/best-practices/gds/styles.md\`\n\n_(missing — file not found at \`${join(staged.root, 'docs/best-practices/gds/styles.md')}\`)_\n`
    )
  })

  test('Should refuse when npm cannot give the latest version, naming the cause', async () => {
    staged = stageStartWorkspace()
    mockPool(REGISTRY).get('/govuk-frontend').reply(503, {})

    await expect(discover(ADMIN)).rejects.toMatchObject({
      code: 'NETWORK',
      message:
        'Error: Failed to fetch latest version from npm: latestVersion(govuk-frontend): the npm registry returned 503.'
    })
  })

  test('Should refuse when the changelog cannot be downloaded', async () => {
    staged = stageStartWorkspace()
    mockPool(REGISTRY).get('/govuk-frontend').reply(200, registryDocument())
    mockPool(RAW).get(CHANGELOG_PATH).reply(500, 'down')

    await expect(discover(ADMIN, { target: '5.5.0' })).rejects.toMatchObject({
      code: 'NETWORK',
      message: `Error: Failed to fetch CHANGELOG.md from ${RAW}${CHANGELOG_PATH}`
    })
  })

  test('Should refuse a repo with no package.json', async () => {
    staged = stageStartWorkspace()
    rmSync(join(staged.root, 'repos', ADMIN, 'package.json'))

    await expect(discover(ADMIN, { target: '5.5.0' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `Error: No package.json found in ${join(staged.root, 'repos', ADMIN)}`
    })
  })
})
