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
 * The page id in a Confluence page id or page URL.
 *
 * @param {string} input - a page id such as `123`, or a URL whose path holds
 *   `/pages/<id>`
 * @returns {string} the page id, all digits
 * @throws {TimError} USAGE when the input holds no page id
 */
export const pageIdFrom = (input) => {
  const text = String(input ?? '')
  const isUrl = /^https?:\/\//.test(text)
  const pageId = isUrl ? (/^.*\/pages\/(\d+)/.exec(text)?.[1] ?? text) : text
  if (!/^\d+$/.test(pageId)) {
    throw new TimError(
      'USAGE',
      `Cannot find a page id in "${text}". Give a page id, or a page URL with /pages/<id> in it.`
    )
  }
  return pageId
}

const labelNamesOf = (page) =>
  (page.metadata?.labels?.results ?? [])
    .map((label) => label.name)
    .filter((name) => name !== null && name !== undefined)

/**
 * Create a Confluence REST client. Uses the same Atlassian credentials as
 * the Jira client (Confluence sits under `${JIRA_BASE_URL}/wiki`).
 *
 * @param {object} [opts]
 * @param {string} [opts.user]
 * @param {string} [opts.token]
 * @param {string} [opts.baseUrl] - Atlassian instance base (NOT including `/wiki`)
 * @returns {object} client with whoami / getPage / getPageView / getChildren /
 *   getContent / getPageExport. The page methods take a page id or page URL and throw
 *   TimError(USAGE) when it holds no page id.
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

  const getAllChildren = async (parentId, childType) => {
    const pageSize = 50
    const collected = []
    let start = 0
    while (true) {
      const data = await get(
        `/rest/api/content/${parentId}/child/${childType}?limit=${pageSize}&start=${start}`,
        `getChildren(${parentId})`
      )
      const results = data.results ?? []
      collected.push(...results)
      if (results.length < pageSize) return collected
      start += results.length
    }
  }

  const pageUrlOf = (page) =>
    `${root}/spaces/${page.space?.key ?? null}/pages/${page.id}`

  return {
    whoami: async () => {
      const data = await get('/rest/api/user/current', 'whoami')
      return {
        user: data.username ?? data.accountId,
        displayName: data.profile?.displayName ?? data.displayName ?? 'Unknown'
      }
    },

    getPage: async (input) => {
      const pageId = pageIdFrom(input)
      const data = await get(
        `/rest/api/content/${pageId}?expand=body.storage,body.view,version,space,history,metadata.labels`,
        `getPage(${pageId})`
      )
      return {
        id: data.id,
        title: data.title,
        version: data.version?.number ?? null,
        body: data.body?.storage?.value ?? '',
        space: data.space?.key ?? null,
        updated: data.version?.when ?? null,
        updatedBy: data.version?.by?.displayName ?? null,
        url: pageUrlOf(data),
        labels: labelNamesOf(data),
        bodyView: data.body?.view?.value ?? null
      }
    },

    getPageView: async (input) => {
      const pageId = pageIdFrom(input)
      return get(
        `/rest/api/content/${pageId}?expand=body.view,version,space,history,metadata.labels`,
        `getPageView(${pageId})`
      )
    },

    getChildren: async (input) => {
      const parentId = pageIdFrom(input)
      const pages = await getAllChildren(parentId, 'page')
      const folders = await getAllChildren(parentId, 'folder')
      return [...pages, ...folders]
    },

    getContent: async (input) => {
      const contentId = pageIdFrom(input)
      const data = await get(
        `/rest/api/content/${contentId}`,
        `getContent(${contentId})`
      )
      return { id: data.id, type: data.type, title: data.title }
    },

    getPageExport: async (input) => {
      const pageId = pageIdFrom(input)
      const data = await get(
        `/rest/api/content/${pageId}?expand=body.export_view,version,space`,
        `getPageExport(${pageId})`
      )
      return {
        id: data.id,
        title: data.title,
        version: data.version?.number ?? null,
        space: data.space?.key ?? null,
        updated: data.version?.when ?? null,
        body: data.body?.export_view?.value ?? ''
      }
    }
  }
}
