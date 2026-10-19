import { afterEach, beforeEach } from 'vitest'
import { closeHttpMocks, installHttpMocks } from './http-mock.js'

export const GITHUB_API = 'https://api.github.com'
export const GITHUB_REPO = 'trade-imports-animals-frontend'
export const GITHUB_REPO_PATH = `/repos/DEFRA/${GITHUB_REPO}`

export const mockGithubForEachTest = () => {
  const mocks = { pool: null, environment: null }

  beforeEach(() => {
    mocks.environment = { ...process.env }
    process.env.GITHUB_TOKEN = 'token'
    mocks.pool = installHttpMocks().mockPool
  })

  afterEach(() => {
    process.env = mocks.environment
    closeHttpMocks()
  })

  return (origin = GITHUB_API) => mocks.pool(origin)
}
