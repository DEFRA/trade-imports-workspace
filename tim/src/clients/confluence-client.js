import { TimError } from '../errors.js'

const mapStatus = (status, action) => {
  if (status === 401 || status === 403) {
    return new TimError(
      'AUTH',
      `${action}: Confluence rejected the credentials. Check JIRA_USER and JIRA_TOKEN.`
    )
  }
  if (status === 404) return new TimError('NOT_FOUND', `${action}: not found.`)
  if (status === 429) {
    return new TimError('RATE_LIMIT', `${action}: rate limited.`)
  }
  if (status >= 400) {
    return new TimError('NETWORK', `${action}: Confluence returned ${status}.`)
  }
  return null
}

const authHeader = (user, token) =>
  `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`

/**
 * Create a Confluence REST client. Uses the same Atlassian credentials as
 * the Jira client (Confluence sits under `${JIRA_BASE_URL}/wiki`).
 *
 * @param {object} [opts]
 * @param {string} [opts.user]
 * @param {string} [opts.token]
 * @param {string} [opts.baseUrl] - Atlassian instance base (NOT including `/wiki`)
 * @returns {object} client with whoami / getPage
 * @throws {TimError} AUTH / USAGE when credentials or base URL are missing
 */
export const createConfluenceClient = ({
  user = process.env.JIRA_USER,
  token = process.env.JIRA_TOKEN,
  baseUrl = process.env.JIRA_BASE_URL
} = {}) => {
  if (!user || !token) {
    throw new TimError(
      'AUTH',
      'Set JIRA_USER and JIRA_TOKEN to authenticate with Confluence.'
    )
  }
  if (!baseUrl) {
    throw new TimError(
      'USAGE',
      'Set JIRA_BASE_URL to point at the Atlassian instance.'
    )
  }
  const root = `${baseUrl.replace(/\/+$/, '')}/wiki`

  const get = async (path, action) => {
    const url = `${root}${path}`
    let response
    try {
      response = await fetch(url, {
        headers: {
          Authorization: authHeader(user, token),
          Accept: 'application/json'
        }
      })
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
    whoami: async () => {
      const data = await get('/rest/api/user/current', 'whoami')
      return {
        user: data.username ?? data.accountId,
        displayName: data.profile?.displayName ?? data.displayName ?? 'Unknown'
      }
    },

    getPage: async (id) => {
      const data = await get(
        `/rest/api/content/${encodeURIComponent(id)}?expand=body.storage,version`,
        `getPage(${id})`
      )
      return {
        id: data.id,
        title: data.title,
        version: data.version?.number ?? null,
        body: data.body?.storage?.value ?? ''
      }
    }
  }
}
