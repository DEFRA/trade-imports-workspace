import { TimError } from '../errors.js'

const DEFAULT_BASE_URL = 'https://sonarcloud.io'
const PROJECT_PREFIX = 'DEFRA_'
const PAGE_SIZE = 500

const mapStatus = (status, action) => {
  if (status === 401 || status === 403) {
    return new TimError(
      'AUTH',
      `${action}: SonarCloud refused the request. Set SONAR_TOKEN to a SonarCloud token that can read this project.`
    )
  }
  if (status === 404) {
    return new TimError(
      'NOT_FOUND',
      `${action}: SonarCloud can't find that project, branch or pull request.`
    )
  }
  if (status === 429) {
    return new TimError('RATE_LIMIT', `${action}: SonarCloud rate limited.`)
  }
  if (status >= 400) {
    return new TimError('NETWORK', `${action}: SonarCloud returned ${status}.`)
  }
  return null
}

const projectKeyOf = (project) =>
  project.startsWith(PROJECT_PREFIX) ? project : `${PROJECT_PREFIX}${project}`

const fileOf = (component) => component.slice(component.indexOf(':') + 1)

const issueSummary = (baseUrl, projectKey, scope) => (issue) => ({
  key: issue.key,
  rule: issue.rule,
  severity: issue.severity,
  type: issue.type,
  file: fileOf(issue.component),
  line: issue.line ?? null,
  message: issue.message,
  url: `${baseUrl}/project/issues?id=${projectKey}&${scope}&open=${issue.key}`
})

/**
 * Create a SonarCloud client. A public project needs no token; SONAR_TOKEN
 * is sent when set, so a private project works too.
 *
 * @param {object} [opts]
 * @param {string} [opts.token]
 * @param {string} [opts.baseUrl]
 * @returns {object} client with listIssues
 */
export const createSonarClient = ({
  token = process.env.SONAR_TOKEN,
  baseUrl = DEFAULT_BASE_URL
} = {}) => {
  const root = baseUrl.replace(/\/+$/, '')

  const get = async (path, action) => {
    const headers = { Accept: 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    let response
    try {
      response = await fetch(`${root}${path}`, { headers })
    } catch (error) {
      throw new TimError('NETWORK', `${action}: ${error.message}`, error)
    }
    const mapped = mapStatus(response.status, action)
    if (mapped) throw mapped
    try {
      return await response.json()
    } catch (error) {
      throw new TimError('PARSE', `${action}: invalid JSON response.`, error)
    }
  }

  return {
    /**
     * Open issues in a project, a pull request or a branch. For a pull
     * request, these are the issues its quality gate counts as new.
     *
     * @param {string} project - repo name, with or without the DEFRA_ prefix
     * @param {object} [scope]
     * @param {string|number} [scope.pullRequest]
     * @param {string} [scope.branch]
     */
    listIssues: async (project, { pullRequest, branch } = {}) => {
      const projectKey = projectKeyOf(project)
      const scopeParams = new URLSearchParams()
      if (pullRequest !== undefined) {
        scopeParams.set('pullRequest', String(pullRequest))
      }
      if (branch !== undefined) scopeParams.set('branch', branch)
      const scope = scopeParams.toString()
      const query = new URLSearchParams({
        componentKeys: projectKey,
        issueStatuses: 'OPEN,CONFIRMED',
        ps: String(PAGE_SIZE)
      })
      for (const [name, value] of scopeParams) query.set(name, value)
      const data = await get(
        `/api/issues/search?${query}`,
        `listIssues(${projectKey})`
      )
      return {
        project: projectKey,
        pullRequest: pullRequest === undefined ? null : String(pullRequest),
        branch: branch ?? null,
        total: data.total ?? data.issues.length,
        issues: data.issues.map(issueSummary(root, projectKey, scope))
      }
    }
  }
}
