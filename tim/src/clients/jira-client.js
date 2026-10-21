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
 * Each transition as `name -> status`, comma-separated, or `none`.
 *
 * @param {Array<{name: string, to: string|null}>} transitions
 * @returns {string}
 */
export const describeTransitions = (transitions) =>
  transitions.length === 0
    ? 'none'
    : transitions.map(({ name, to }) => `${name} -> ${to}`).join(', ')

const findTransitionTo = (transitions, status, { matchTransitionName }) =>
  transitions.find(({ to }) => to === status) ??
  (matchTransitionName
    ? transitions.find(({ name }) => name === status)
    : undefined)

const noTransitionError = ({ key, current, status, transitions }) => {
  const error = new TimError(
    'USAGE',
    `${key} is ${current} and offers no transition to "${status}". The board offers (transition -> status): ${describeTransitions(transitions)}.`
  )
  error.transitions = transitions
  return error
}

const readLinkFromIssueSide = (link) => {
  const base = { id: link.id ?? null, type: link.type?.name ?? null }
  if (link.outwardIssue) {
    return {
      ...base,
      direction: 'outward',
      relation: link.type?.outward ?? null,
      otherKey: link.outwardIssue.key
    }
  }
  return {
    ...base,
    direction: 'inward',
    relation: link.type?.inward ?? null,
    otherKey: link.inwardIssue?.key ?? null
  }
}

const resolutionsOffered = (transition) => {
  const resolutionField = transition.fields?.resolution
  if (!resolutionField) return null
  return (resolutionField.allowedValues ?? []).map(({ name }) => name)
}

const refuseResolutionNotOffered = ({ key, move, resolution }) => {
  if (move.resolutions === null) {
    throw new TimError(
      'USAGE',
      `The "${move.name}" transition on ${key} does not let you set a resolution. Run it again without --resolution.`
    )
  }
  if (!move.resolutions.includes(resolution)) {
    throw new TimError(
      'USAGE',
      `The "${move.name}" transition on ${key} offers no resolution "${resolution}". It offers: ${move.resolutions.join(', ') || 'none'}.`
    )
  }
}

/**
 * Create a Jira REST client. Reads JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL
 * from the environment by default.
 *
 * @param {object} [opts]
 * @param {string} [opts.user]
 * @param {string} [opts.token]
 * @param {string} [opts.baseUrl]
 * @returns {object} The Jira client
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

  const sendJson = async (method, path, body, action) => {
    const url = `${normalisedBase}${path}`
    let response
    try {
      response = await fetch(url, {
        method,
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

  const postJson = (path, body, action) => sendJson('POST', path, body, action)

  const postIssueLink = ({ type, inwardKey, outwardKey, action }) =>
    postJson(
      '/rest/api/2/issueLink',
      {
        type: { name: type },
        inwardIssue: { key: inwardKey },
        outwardIssue: { key: outwardKey }
      },
      action
    )

  const postForNoContent = async (path, body, action) => {
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
    if (response.status === 204) return
    const payload = await parseBody(response, action)
    if (response.status === 400) throw mapBadRequest(action, payload)
    const mapped = mapStatus(response.status, action)
    if (mapped) throw mapped
    const reasons = [
      ...(payload?.errorMessages ?? []),
      ...Object.entries(payload?.errors ?? {}).map(
        ([field, reason]) => `${field}: ${reason}`
      )
    ]
    throw new TimError(
      'UNKNOWN',
      `${action}: Jira answered ${response.status}, not 204${reasons.length ? `: ${reasons.join('; ')}` : '.'}`
    )
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

  const getTicket = async (id) => {
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
  }

  const listTransitions = async (key, { withResolutions = false } = {}) => {
    const path = `/rest/api/2/issue/${encodeURIComponent(key)}/transitions`
    const data = await get(
      withResolutions ? `${path}?expand=transitions.fields` : path,
      `listTransitions(${key})`
    )
    return (data.transitions ?? []).map((transition) => ({
      id: transition.id,
      name: transition.name,
      to: transition.to?.name ?? null,
      ...(withResolutions
        ? { resolutions: resolutionsOffered(transition) }
        : {})
    }))
  }

  const transitionIssue = async (key, transitionId, { resolution } = {}) => {
    await postJson(
      `/rest/api/2/issue/${encodeURIComponent(key)}/transitions`,
      {
        transition: { id: transitionId },
        ...(resolution ? { fields: { resolution: { name: resolution } } } : {})
      },
      `transitionIssue(${key})`
    )
  }

  const moveToStatus = async (
    key,
    status,
    { from, matchTransitionName = false, resolution } = {}
  ) => {
    const current = from === undefined ? (await getTicket(key)).status : from
    if (current === status) {
      return { key, from: current, to: current, moved: false, transition: null }
    }
    const transitions = await listTransitions(key, {
      withResolutions: Boolean(resolution)
    })
    const move = findTransitionTo(transitions, status, { matchTransitionName })
    if (!move) {
      throw noTransitionError({ key, current, status, transitions })
    }
    if (resolution) refuseResolutionNotOffered({ key, move, resolution })
    await transitionIssue(key, move.id, { resolution })
    return {
      key,
      from: current,
      to: move.to,
      moved: true,
      transition: move.name,
      ...(resolution ? { resolution } : {})
    }
  }

  return {
    whoami: async () => {
      const data = await get('/rest/api/2/myself', 'whoami')
      return {
        user: data.name ?? data.accountId,
        accountId: data.accountId ?? null,
        displayName: data.displayName
      }
    },

    /**
     * Who an issue is assigned to now.
     *
     * @param {string} key
     * @returns {Promise<{accountId: string, displayName: string|null}|null>} null when unassigned
     */
    getAssignee: async (key) => {
      const data = await get(
        `/rest/api/2/issue/${encodeURIComponent(key)}?fields=assignee`,
        `getAssignee(${key})`
      )
      const assignee = data.fields?.assignee
      if (!assignee) return null
      return {
        accountId: assignee.accountId,
        displayName: assignee.displayName ?? null
      }
    },

    /**
     * @param {string} key
     * @param {string} accountId - An Atlassian account id, not a username or email
     * @returns {Promise<void>}
     * @throws {TimError} USAGE carrying Jira's reason when it refuses the account
     */
    assignIssue: async (key, accountId) => {
      await sendJson(
        'PUT',
        `/rest/api/2/issue/${encodeURIComponent(key)}/assignee`,
        { accountId },
        `assignIssue(${key})`
      )
    },

    /**
     * @param {string} key
     * @returns {Promise<string|null>} The resolution's name, or null when the issue has none
     */
    getResolution: async (key) => {
      const data = await get(
        `/rest/api/2/issue/${encodeURIComponent(key)}?fields=resolution`,
        `getResolution(${key})`
      )
      return data.fields?.resolution?.name ?? null
    },

    getTicket,

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
     * @param {string} key
     * @param {string} body - Jira wiki markup, not markdown
     * @returns {Promise<{id: string, author: string|null, createdAt: string, body: string}>}
     * @throws {TimError} USAGE carrying Jira's reason when it refuses the comment
     */
    addComment: async (key, body) => {
      const data = await postJson(
        `/rest/api/2/issue/${encodeURIComponent(key)}/comment`,
        { body },
        `addComment(${key})`
      )
      return {
        id: data.id,
        author: data.author?.displayName ?? null,
        createdAt: data.created,
        body: data.body
      }
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
     * @param {string} key
     * @param {string} target
     * @returns {Promise<void>}
     */
    relateIssues: async (key, target) => {
      await postIssueLink({
        type: 'Relates',
        inwardKey: key,
        outwardKey: target,
        action: `relateIssues(${key}, ${target})`
      })
    },

    /**
     * Record that `blocker` blocks `blocked`.
     *
     * @param {{blocker: string, blocked: string}} link
     * @returns {Promise<void>}
     */
    recordBlocker: async ({ blocker, blocked }) => {
      await postIssueLink({
        type: 'Blocks',
        inwardKey: blocker,
        outwardKey: blocked,
        action: `recordBlocker(${blocker} blocks ${blocked})`
      })
    },

    /**
     * An issue's current links, each read from this issue's side: `relation`
     * is the wording that sits between this issue and `otherKey`, such as
     * "blocks" or "is blocked by". `direction` is `outward` when this issue
     * holds the link type's outward wording ("blocks"), `inward` otherwise.
     *
     * @param {string} key
     * @returns {Promise<Array<{id: string|null, type: string|null, direction: 'outward'|'inward', relation: string|null, otherKey: string|null}>>}
     */
    getIssueLinks: async (key) => {
      const data = await get(
        `/rest/api/2/issue/${encodeURIComponent(key)}?fields=issuelinks`,
        `getIssueLinks(${key})`
      )
      return (data.fields?.issuelinks ?? []).map(readLinkFromIssueSide)
    },

    /**
     * The transitions an issue offers now, each with the status it leads to.
     * A transition's name can differ from that status's name.
     *
     * @param {string} key
     * @param {object} [options]
     * @param {boolean} [options.withResolutions=false] - Also return each transition's `resolutions`: the names its screen accepts, or null when it has no resolution field
     * @returns {Promise<Array<{id: string, name: string, to: string|null, resolutions?: string[]|null}>>}
     */
    listTransitions,

    /**
     * Move an issue through one of the transitions it offers.
     *
     * @param {string} key
     * @param {string} transitionId - From `listTransitions`
     * @param {object} [options]
     * @param {string} [options.resolution] - A resolution name the transition's screen accepts
     * @returns {Promise<void>}
     */
    transitionIssue,

    /**
     * Move an issue into the status with exactly this name. An issue already
     * in it is left alone. The one implementation behind `tim jira
     * transition` and `tim build start`'s move to the working status.
     *
     * @param {string} key
     * @param {string} status - The status name, compared exactly
     * @param {object} [options]
     * @param {string} [options.from] - The issue's status, when the caller already read it
     * @param {boolean} [options.matchTransitionName=false] - Also accept a transition with this name when no transition leads to a status with it
     * @param {string} [options.resolution] - Set this resolution as part of the move
     * @returns {Promise<{key: string, from: string|null, to: string|null, moved: boolean, transition: string|null, resolution?: string}>}
     * @throws {TimError} USAGE carrying `transitions` when the issue offers no way into that status; USAGE when the transition's screen does not accept the resolution
     */
    moveToStatus,

    /**
     * Move issues out of a board's backlog onto the board. Board membership
     * is not a field on the issue and no status sets it; this is the only
     * call that does. Moving an issue already on the board changes nothing.
     *
     * @param {number|string} boardId
     * @param {string[]} keys - At most 50, a Jira limit
     * @returns {Promise<void>}
     * @throws {TimError} UNKNOWN when Jira answers anything but 204
     */
    moveToBoard: async (boardId, keys) => {
      await postForNoContent(
        `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/issue`,
        { issues: keys },
        `moveToBoard(${boardId}, ${keys.join(', ')})`
      )
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
    },

    /**
     * Every open issue under a parent (an epic's children), with its summary,
     * reading every page the enhanced JQL search returns.
     *
     * @param {string} parentKey - Such as `'EUDPA-20628'`
     * @returns {Promise<Array<{key: string, summary: string}>>}
     */
    listOpenChildren: async (parentKey) => {
      const jql = `parent = ${parentKey} AND statusCategory != Done`
      const base = `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary&maxResults=100`
      const children = []
      let pageToken = null
      for (let page = 0; page < MAX_CHILD_PAGES; page += 1) {
        const data = await get(
          pageToken
            ? `${base}&nextPageToken=${encodeURIComponent(pageToken)}`
            : base,
          `listOpenChildren(${parentKey})`
        )
        for (const issue of data.issues ?? []) {
          children.push({
            key: issue.key,
            summary: issue.fields?.summary ?? ''
          })
        }
        pageToken = data.nextPageToken ?? null
        if (!pageToken) break
      }
      return children
    }
  }
}

const MAX_CHILD_PAGES = 50
