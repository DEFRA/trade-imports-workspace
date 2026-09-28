import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { TimError } from '../errors.js'

const mapStatus = (status, action) => {
  if (status === 401 || status === 403) {
    return new TimError(
      'AUTH',
      `${action}: Jira rejected the credentials. Check JIRA_USER and JIRA_TOKEN.`
    )
  }
  if (status === 404) return new TimError('NOT_FOUND', `${action}: not found.`)
  if (status === 429) {
    return new TimError('RATE_LIMIT', `${action}: rate limited.`)
  }
  if (status >= 400) {
    return new TimError('NETWORK', `${action}: Jira returned ${status}.`)
  }
  return null
}

/**
 * Map a 400 response body to a `TimError`, carrying Jira's own field
 * reasons rather than a bare status code — the whole point of validating a
 * manifest is to give the person something they can act on.
 *
 * @param {string} action
 * @param {{errorMessages?: string[], errors?: Record<string, string>}} payload
 * @returns {TimError} USAGE
 */
const mapBadRequest = (action, payload) => {
  const fieldReasons = Object.entries(payload?.errors ?? {}).map(
    ([field, reason]) => `${field}: ${reason}`
  )
  const reasons = [...(payload?.errorMessages ?? []), ...fieldReasons]
  const detail = reasons.length
    ? reasons.join('; ')
    : 'Jira rejected the request.'
  return new TimError('USAGE', `${action}: ${detail}`)
}

/**
 * Read a response body as JSON, tolerating an empty body (Jira returns
 * 201/204 with nothing on some writes).
 *
 * @param {Response} response
 * @param {string} action
 * @returns {Promise<any>}
 * @throws {TimError} PARSE when the body is non-empty and not valid JSON
 */
const parseBody = async (response, action) => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new TimError('PARSE', `${action}: invalid JSON response.`, error)
  }
}

const authHeader = (user, token) =>
  `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`

/**
 * Create a Jira REST client. Reads JIRA_USER + JIRA_TOKEN + JIRA_BASE_URL
 * from env by default — matches the contract used by ../tools/jira/auth.sh.
 *
 * @param {object} [opts]
 * @param {string} [opts.user]
 * @param {string} [opts.token]
 * @param {string} [opts.baseUrl]
 * @returns {object} client with whoami / getTicket / getComments
 * @throws {TimError} AUTH when credentials are missing
 */
export const createJiraClient = ({
  user = process.env.JIRA_USER,
  token = process.env.JIRA_TOKEN,
  baseUrl = process.env.JIRA_BASE_URL
} = {}) => {
  if (!user || !token) {
    throw new TimError(
      'AUTH',
      'Set JIRA_USER and JIRA_TOKEN to authenticate with Jira.'
    )
  }
  if (!baseUrl) {
    throw new TimError(
      'USAGE',
      'Set JIRA_BASE_URL to point at the Atlassian instance.'
    )
  }
  const normalisedBase = baseUrl.replace(/\/+$/, '')

  const get = async (path, action) => {
    const url = `${normalisedBase}${path}`
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

  const postJson = async (path, body, action) => {
    const url = `${normalisedBase}${path}`
    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader(user, token),
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(body)
      })
    } catch (error) {
      throw new TimError('NETWORK', `${action}: ${error.message}`, error)
    }
    if (response.status === 400) {
      throw mapBadRequest(action, await parseBody(response, action))
    }
    const mapped = mapStatus(response.status, action)
    if (mapped) throw mapped
    return parseBody(response, action)
  }

  const postMultipart = async (path, form, action) => {
    const url = `${normalisedBase}${path}`
    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader(user, token),
          'X-Atlassian-Token': 'no-check'
        },
        body: form
      })
    } catch (error) {
      throw new TimError('NETWORK', `${action}: ${error.message}`, error)
    }
    if (response.status === 400) {
      throw mapBadRequest(action, await parseBody(response, action))
    }
    const mapped = mapStatus(response.status, action)
    if (mapped) throw mapped
    return parseBody(response, action)
  }

  return {
    whoami: async () => {
      const data = await get('/rest/api/2/myself', 'whoami')
      return {
        user: data.name ?? data.accountId,
        displayName: data.displayName
      }
    },

    getTicket: async (id) => {
      const data = await get(
        `/rest/api/2/issue/${encodeURIComponent(id)}`,
        `getTicket(${id})`
      )
      return {
        id: data.key,
        summary: data.fields?.summary ?? '',
        status: data.fields?.status?.name ?? null,
        type: data.fields?.issuetype?.name ?? null,
        assignee: data.fields?.assignee?.displayName ?? null,
        priority: data.fields?.priority?.name ?? null,
        description: data.fields?.description ?? ''
      }
    },

    getComments: async (id) => {
      const data = await get(
        `/rest/api/2/issue/${encodeURIComponent(id)}/comment`,
        `getComments(${id})`
      )
      return (data.comments ?? []).map((c) => ({
        id: c.id,
        author: c.author?.displayName ?? null,
        createdAt: c.created,
        body: c.body
      }))
    },

    /**
     * Create an issue. `fields` is sent verbatim as Jira's `{fields: ...}`
     * body — the caller (a manifest-to-fields mapping) owns the shape, this
     * is a thin transport. `description` must already be Jira wiki markup,
     * not markdown.
     *
     * @param {object} fields
     * @returns {Promise<{key: string, id: string, url: string}>}
     * @throws {TimError} USAGE when Jira returns 400 with field errors
     */
    createIssue: async (fields) => {
      const data = await postJson(
        '/rest/api/2/issue',
        { fields },
        'createIssue'
      )
      return {
        key: data.key,
        id: data.id,
        url: `${normalisedBase}/browse/${data.key}`
      }
    },

    /**
     * Attach each file to an issue as its own multipart POST, so one
     * file failing (too large, a transient 5xx) never stops the rest —
     * the caller gets a per-file result to build a partial-success receipt
     * from, rather than the client throwing on the first failure.
     *
     * @param {string} key
     * @param {string[]} filePaths - Absolute paths on disk
     * @returns {Promise<Array<{filename: string, path: string, status: 'attached'|'failed', id?: string, size?: number, error?: string}>>}
     */
    attachFiles: async (key, filePaths) => {
      const results = []
      for (const filePath of filePaths) {
        const filename = basename(filePath)
        const action = `attachFiles(${key})`
        try {
          const buffer = await readFile(filePath)
          const form = new FormData()
          form.append('file', new Blob([buffer]), filename)
          const data = await postMultipart(
            `/rest/api/2/issue/${encodeURIComponent(key)}/attachments`,
            form,
            action
          )
          const attachment = Array.isArray(data) ? data[0] : data
          results.push({
            filename,
            path: filePath,
            status: 'attached',
            id: attachment?.id ?? null,
            size: buffer.length
          })
        } catch (error) {
          results.push({
            filename,
            path: filePath,
            status: 'failed',
            error: error.message
          })
        }
      }
      return results
    },

    /**
     * The filenames already attached to an issue, for skip-existing checks.
     *
     * @param {string} key
     * @returns {Promise<Array<{id: string, filename: string, size: number, created: string}>>}
     */
    listAttachments: async (key) => {
      const data = await get(
        `/rest/api/2/issue/${encodeURIComponent(key)}?fields=attachment`,
        `listAttachments(${key})`
      )
      return (data.fields?.attachment ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        size: a.size,
        created: a.created
      }))
    },

    /**
     * Link two issues. Only `'Relates'` is supported in v1 — Jira's other
     * link types (Blocks, Duplicates, ...) need direction-aware wording
     * this CLI doesn't model yet.
     *
     * @param {string} type - Must be `'Relates'`
     * @param {string} inwardKey
     * @param {string} outwardKey
     * @returns {Promise<{type: string, inwardKey: string, outwardKey: string}>}
     * @throws {TimError} USAGE when `type` is not `'Relates'`
     */
    linkIssues: async (type, inwardKey, outwardKey) => {
      if (type !== 'Relates') {
        throw new TimError(
          'USAGE',
          `linkIssues: only "Relates" is supported in v1, got "${type}".`
        )
      }
      await postJson(
        '/rest/api/2/issueLink',
        {
          type: { name: 'Relates' },
          inwardIssue: { key: inwardKey },
          outwardIssue: { key: outwardKey }
        },
        `linkIssues(${inwardKey}, ${outwardKey})`
      )
      return { type: 'Relates', inwardKey, outwardKey }
    },

    /**
     * An issue's current issue links, to verify a link landed after
     * creating it.
     *
     * @param {string} key
     * @returns {Promise<Array<{type: string|null, inwardKey: string|null, outwardKey: string|null}>>}
     */
    getIssueLinks: async (key) => {
      const data = await get(
        `/rest/api/2/issue/${encodeURIComponent(key)}?fields=issuelinks`,
        `getIssueLinks(${key})`
      )
      return (data.fields?.issuelinks ?? []).map((link) => ({
        type: link.type?.name ?? null,
        inwardKey: link.inwardIssue?.key ?? null,
        outwardKey: link.outwardIssue?.key ?? null
      }))
    },

    /**
     * Open epics in a project, for a hand-off to offer as the default
     * parent when no `parent` is set in the manifest. Uses the enhanced
     * JQL search: Atlassian removed `/rest/api/{2,3}/search`, which now
     * answers 410 Gone.
     *
     * @param {string} project - Project key, e.g. `'EUDPA'`
     * @returns {Promise<Array<{key: string, summary: string}>>}
     */
    listOpenEpics: async (project) => {
      const jql = `project = ${project} AND issuetype = Epic AND statusCategory != Done`
      const data = await get(
        `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary&maxResults=100`,
        `listOpenEpics(${project})`
      )
      return (data.issues ?? []).map((issue) => ({
        key: issue.key,
        summary: issue.fields?.summary ?? ''
      }))
    }
  }
}
