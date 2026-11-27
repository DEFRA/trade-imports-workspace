import { afterEach, beforeEach } from 'vitest'
import { createServer } from 'node:http'

const BASE_TOKEN = '{{BASE}}'

const comment = (author, created, body) => ({
  id: `${author.length}${created.slice(0, 4)}`,
  author: { displayName: author },
  created,
  body
})

const tickets = {
  'EUDPA-101': {
    key: 'EUDPA-101',
    fields: {
      summary: 'Show the commodity code on the review page',
      issuetype: { name: 'Story' },
      status: { name: 'Refining' },
      priority: { name: 'Major' },
      assignee: { displayName: 'Pat Example' },
      parent: { key: 'EUDPA-50' },
      labels: ['animals', 'frontend'],
      description: 'Wiki text the refinement does not read'
    },
    renderedFields: {
      description: [
        '<p>As an importer I want to see the commodity code.</p>',
        `<p>See <a href="${BASE_TOKEN}/wiki/spaces/EUDP/pages/111/Review+page">the design</a> and <a href="${BASE_TOKEN}/wiki/spaces/EUDP/pages/222/Rules">the rules</a>.</p>`,
        `<p>Gone: <a href="${BASE_TOKEN}/wiki/spaces/EUDP/pages/333/Gone">old page</a>, space home ${BASE_TOKEN}/wiki/spaces/EUDP/overview and the design again ${BASE_TOKEN}/wiki/spaces/EUDP/pages/111/Review+page</p>`,
        '<p>AC:</p>',
        '<ol><li>Shows the code</li></ol>',
        ''
      ].join('\n')
    }
  },
  'EUDPA-102': {
    key: 'EUDPA-102',
    fields: {
      summary: 'Tidy the stub logs',
      issuetype: { name: 'Task' },
      status: { name: 'To Do' },
      priority: null,
      assignee: null
    },
    renderedFields: { description: null }
  },
  'EUDPA-103': {
    key: 'EUDPA-103',
    fields: {
      summary: 'Fix the date on the certificate',
      issuetype: { name: 'Bug' },
      status: { name: 'Ready' },
      priority: { name: 'Minor' },
      assignee: { displayName: 'Dee Signer' },
      parent: { key: 'EUDPA-60' },
      labels: ['plants']
    },
    renderedFields: { description: '<p>The date shows in US order.</p>' }
  },
  'EUDPA-104': {
    key: 'EUDPA-104',
    fields: {
      summary: 'Retire the old "export" button',
      issuetype: { name: 'Task' },
      status: { name: 'To Do' },
      priority: null,
      assignee: null,
      parent: null,
      labels: []
    },
    renderedFields: { description: null }
  },
  'EUDPA-50': {
    key: 'EUDPA-50',
    fields: {
      summary: 'Commodity codes everywhere',
      issuetype: { name: 'Epic' },
      status: { name: 'In Progress' },
      description: 'Wiki text of the epic'
    },
    renderedFields: { description: '<p>Every page shows commodity codes.</p>' }
  },
  'EUDPA-210': {
    key: 'EUDPA-210',
    fields: {
      summary:
        'Search addresses by country, with a filter, in the address book',
      issuetype: { name: 'Story' },
      status: { name: 'Refining' },
      priority: { name: 'Major' },
      assignee: { displayName: 'Pat Example' },
      parent: { key: 'EUDPA-50' },
      labels: ['ins'],
      updated: '2026-11-20T09:00:00.000+0000',
      description: 'h2. Acceptance criteria\n# Shows the country filter',
      issuelinks: [
        {
          id: '7001',
          type: {
            name: 'Blocks',
            inward: 'is blocked by',
            outward: 'blocks'
          },
          inwardIssue: {
            key: 'EUDPA-190',
            fields: {
              status: { name: 'In Progress' },
              summary: 'Add the country list'
            }
          }
        },
        {
          id: '7002',
          type: {
            name: 'Blocks',
            inward: 'is blocked by',
            outward: 'blocks'
          },
          inwardIssue: {
            key: 'EUDPA-191',
            fields: {
              status: { name: 'Done' },
              summary: 'Add the address book'
            }
          }
        }
      ],
      subtasks: [
        {
          key: 'EUDPA-211',
          fields: {
            status: { name: 'To Do' },
            summary: 'Write the filter'
          }
        }
      ],
      attachment: [
        {
          id: '9001',
          filename: 'filter-mock.png',
          mimeType: 'image/png',
          size: 8,
          created: '2026-11-19T10:00:00.000+0000'
        },
        {
          id: '9002',
          filename: 'rules.pdf',
          mimeType: 'application/pdf',
          size: 9,
          created: '2026-11-19T10:05:00.000+0000'
        },
        {
          id: '9003',
          filename: 'notes.docx',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 4,
          created: '2026-11-19T10:10:00.000+0000'
        }
      ]
    },
    renderedFields: {
      description: [
        '<h2>Acceptance criteria</h2>',
        '<ol><li>Shows the country filter</li></ol>',
        `<p>See <a href="${BASE_TOKEN}/wiki/spaces/EUDP/pages/111/Review+page">the design</a>.</p>`
      ].join('\n')
    }
  }
}

export const attachmentBytes = {
  9001: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  9002: Buffer.from('%PDF-1.4\n')
}

const comments = {
  'EUDPA-210': [
    comment(
      'Pat Example',
      '2026-11-21T08:00:00.000+0000',
      'The filter replaces the country box.'
    )
  ],
  'EUDPA-101': [
    comment(
      'Pat Example',
      '2025-03-04T10:00:00.000+0000',
      'Agreed with design.'
    ),
    comment(
      'Sam Example',
      '2025-03-05T16:30:00.000+0000',
      'Two questions:\n# Which page?\n# Which code?'
    )
  ],
  'EUDPA-102': [],
  'EUDPA-104': []
}

const pages = {
  111: {
    id: '111',
    title: 'Review page design',
    space: { key: 'EUDP' },
    version: {
      number: 4,
      when: '2025-02-01T09:00:00.000Z',
      by: { displayName: 'Dee Signer' }
    },
    metadata: {
      labels: { results: [{ name: 'design' }, { name: 'animals' }] }
    },
    body: {
      storage: { value: '<h1>Review page</h1>' },
      view: { value: '<h1>Review page</h1>\n<p>Show the code.</p>' }
    }
  },
  222: {
    id: '222',
    title: 'Rules',
    space: { key: 'EUDP' },
    version: {
      number: 1,
      when: '2025-01-10T12:00:00.000Z',
      by: { displayName: 'Pat Example' }
    },
    metadata: { labels: { results: [] } },
    body: { view: { value: '<p>Codes have eight digits.</p>\n' } }
  }
}

const withBase = (value, base) =>
  JSON.parse(JSON.stringify(value).split(BASE_TOKEN).join(base))

const commentsResponse = (key, { bashShape }) => {
  const list = comments[key]
  if (list === undefined) {
    return [500, { errorMessages: ['Comments are unavailable'] }]
  }
  return [
    200,
    bashShape ? { fields: { comment: { comments: list } } } : { comments: list }
  ]
}

const issueResponse = (key, changes) => {
  if (key === 'EUDPA-400') {
    return [400, { errorMessages: ['The issue key is not valid.'] }]
  }
  if (tickets[key] === undefined) {
    return [
      404,
      {
        errorMessages: [
          'Issue does not exist or you do not have permission to see it.'
        ]
      }
    ]
  }
  return [
    200,
    {
      ...tickets[key],
      fields: { ...tickets[key].fields, ...changes[key] }
    }
  ]
}

const pageResponse = (id) =>
  pages[id] === undefined
    ? [404, { statusCode: 404, message: 'No content found with id' }]
    : [200, pages[id]]

const attachmentResponse = (id) =>
  attachmentBytes[id] === undefined
    ? [404, { errorMessages: ['No attachment with that id.'] }]
    : [200, attachmentBytes[id], 'application/octet-stream']

const route = (url, changes, refusedListings) => {
  const attachmentPath = /^\/rest\/api\/2\/attachment\/content\/(\d+)$/.exec(
    url.pathname
  )
  if (attachmentPath) return attachmentResponse(attachmentPath[1])
  const commentsPath = /^\/rest\/api\/2\/issue\/([^/]+)\/comment$/.exec(
    url.pathname
  )
  if (commentsPath) {
    return commentsResponse(commentsPath[1], { bashShape: false })
  }
  const issuePath = /^\/rest\/api\/2\/issue\/([^/]+)$/.exec(url.pathname)
  if (issuePath && url.searchParams.get('fields') === 'comment') {
    return commentsResponse(issuePath[1], { bashShape: true })
  }
  if (
    issuePath &&
    url.searchParams.get('fields') === 'attachment' &&
    refusedListings.has(issuePath[1])
  ) {
    return [refusedListings.get(issuePath[1]), { errorMessages: [] }]
  }
  if (issuePath) return issueResponse(issuePath[1], changes)
  const pagePath = /^\/wiki\/rest\/api\/content\/(\d+)$/.exec(url.pathname)
  if (pagePath) return pageResponse(pagePath[1])
  return [404, { errorMessages: [`No fixture for ${url.pathname}`] }]
}

/**
 * A local Jira and Confluence answering from fixtures, so the Bash scripts
 * and tim read the same tickets, comments and pages. Descriptions link to
 * pages under the server's own base.
 *
 * EUDPA-101 has comments and five Confluence links (one repeated, one with
 * no page id, one to a missing page). EUDPA-102 has no priority, assignee,
 * parent, labels, description or comments. EUDPA-103's comments cannot be
 * read. EUDPA-104 has an empty labels list and no priority, assignee,
 * parent, description or comments. Jira refuses EUDPA-400 as a bad
 * request. Any other ticket is missing.
 *
 * EUDPA-210 has a parent (EUDPA-50), an open and a Done "is blocked by"
 * link, a subtask, a comment, a link to one Confluence page and three
 * attachments: a PNG and a PDF whose bytes `attachmentBytes` holds, and a
 * `.docx`.
 *
 * Every request's path is kept in `requests`. `changeTicket` replaces fields
 * of a ticket for this server only, and `refuseAttachmentListing` makes the
 * request that lists a ticket's attachments answer with the given status.
 *
 * @returns {Promise<{base: string, requests: string[], changeTicket: (key: string, fields: object) => void, refuseAttachmentListing: (key: string, status: number) => void, close: () => Promise<void>}>}
 */
export const startAtlassianFixtureServer = async () => {
  const requests = []
  const changes = {}
  const refusedListings = new Map()
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.invalid')
    requests.push(url.pathname)
    const [status, body, contentType = 'application/json'] = route(
      url,
      changes,
      refusedListings
    )
    response.writeHead(status, { 'Content-Type': contentType })
    response.end(
      Buffer.isBuffer(body) ? body : JSON.stringify(withBase(body, base))
    )
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  return {
    base,
    requests,
    changeTicket: (key, fields) => {
      changes[key] = { ...changes[key], ...fields }
    },
    refuseAttachmentListing: (key, status) => {
      refusedListings.set(key, status)
    },
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections()
        server.close(resolve)
      })
  }
}

export const atlassianEnv = (base) => ({
  JIRA_USER: 'sam',
  JIRA_TOKEN: 'token',
  JIRA_BASE_URL: base
})

/**
 * Starts a fixture server before each test and stops it after, and points
 * `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL` at it for the test.
 *
 * @returns {() => Awaited<ReturnType<typeof startAtlassianFixtureServer>>} The running server
 */
export const useAtlassianFixtureServer = () => {
  const running = { server: null, savedEnvironment: null }

  beforeEach(async () => {
    running.server = await startAtlassianFixtureServer()
    running.savedEnvironment = { ...process.env }
    Object.assign(process.env, atlassianEnv(running.server.base))
  })

  afterEach(async () => {
    Object.keys(process.env)
      .filter((name) => !(name in running.savedEnvironment))
      .forEach((name) => delete process.env[name])
    Object.assign(process.env, running.savedEnvironment)
    await running.server.close()
  })

  return () => running.server
}
