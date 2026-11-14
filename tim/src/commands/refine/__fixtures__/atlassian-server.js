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
  }
}

const comments = {
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

const issueResponse = (key) =>
  tickets[key] === undefined
    ? [
        404,
        {
          errorMessages: [
            'Issue does not exist or you do not have permission to see it.'
          ]
        }
      ]
    : [200, tickets[key]]

const pageResponse = (id) =>
  pages[id] === undefined
    ? [404, { statusCode: 404, message: 'No content found with id' }]
    : [200, pages[id]]

const route = (url) => {
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
  if (issuePath) return issueResponse(issuePath[1])
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
 * parent, description or comments. Any other ticket is missing.
 *
 * @returns {Promise<{base: string, close: () => Promise<void>}>}
 */
export const startAtlassianFixtureServer = async () => {
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.invalid')
    const [status, body] = route(url)
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(withBase(body, base)))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  return {
    base,
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
