import { afterEach, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { closeHttpMocks, installHttpMocks } from './http-mock.js'

export const JIRA_BASE = 'https://example.atlassian.net'

const JIRA_FIXTURES = fileURLToPath(new URL('fixtures/jira/', import.meta.url))

export const loadJiraFixture = (name) =>
  JSON.parse(readFileSync(`${JIRA_FIXTURES}${name}`, 'utf8'))

export const mockJiraForEachTest = () => {
  const mocks = { pool: null, environment: null }

  beforeEach(() => {
    mocks.environment = { ...process.env }
    process.env.JIRA_USER = 'sam'
    process.env.JIRA_TOKEN = 'token'
    process.env.JIRA_BASE_URL = JIRA_BASE
    mocks.pool = installHttpMocks().mockPool
  })

  afterEach(() => {
    process.env = mocks.environment
    closeHttpMocks()
  })

  return () => mocks.pool(JIRA_BASE)
}
