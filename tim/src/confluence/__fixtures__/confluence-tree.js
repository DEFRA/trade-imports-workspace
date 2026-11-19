import { readFileSync, readdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

export const CONFLUENCE_ORIGIN = 'https://example.atlassian.net'

const CORPUS_DIR = fileURLToPath(new URL('html-corpus/', import.meta.url))

/** The HTML corpus file names, sorted. */
export const corpusNames = readdirSync(CORPUS_DIR)
  .filter((name) => name.endsWith('.html'))
  .sort()

/**
 * @param {string} name - A corpus file name
 * @returns {string} its HTML
 */
export const corpusHtml = (name) => readFileSync(`${CORPUS_DIR}${name}`, 'utf8')

const page = (id, title, body, { version = 1, children = [] } = {}) => ({
  id,
  type: 'page',
  title,
  version,
  body,
  children
})

const folder = (id, title, children) => ({
  id,
  type: 'folder',
  title,
  children
})

export const ROOT_ID = '100'

const nodes = [
  folder(ROOT_ID, 'Root', ['201', '202', '205', '206', '203']),
  page('201', 'Overview & Goals', corpusHtml('headings-and-paragraphs.html'), {
    version: 7
  }),
  page('202', 'Architecture', corpusHtml('code-blocks.html'), {
    version: 3,
    children: ['301', '302']
  }),
  page('205', 'Capability "Map"', corpusHtml('tables.html')),
  page('206', 'Empty page', corpusHtml('empty.html')),
  folder('203', 'Team Folder', ['204']),
  page('204', '  Études: Notes!  ', corpusHtml('lists.html')),
  page('301', 'Data Flow', corpusHtml('links-images-entities.html'), {
    version: 12
  }),
  folder('302', 'Sub Folder', ['401']),
  page('401', '--Deep--Page--', corpusHtml('line-endings.html'))
]

const byId = new Map(nodes.map((node) => [node.id, node]))

const json = (status, body) => ({ status, body: JSON.stringify(body) })

const notFound = (id) =>
  json(404, {
    statusCode: 404,
    message: `No content found with id: ContentId{id=${id}}`
  })

const childrenResponse = (node, childType, query) => {
  const limit = Number(query.get('limit') ?? 25)
  const start = Number(query.get('start') ?? 0)
  const matching = node.children
    .map((id) => byId.get(id))
    .filter((child) => child.type === childType)
    .map(({ id, type, title }) => ({ id, type, title }))
  return json(200, { results: matching.slice(start, start + limit) })
}

const pageResponse = (node) =>
  json(200, {
    id: node.id,
    type: node.type,
    title: node.title,
    space: { key: 'EUDP' },
    version: { number: node.version, when: '2026-10-01T09:15:00.000Z' },
    body: { export_view: { value: node.body } }
  })

/**
 * What the fake Confluence answers to one request path.
 *
 * @param {string} pathAndQuery - The request path from `/wiki` on
 * @returns {{status: number, body: string}}
 */
export const answer = (pathAndQuery) => {
  const url = new URL(pathAndQuery, CONFLUENCE_ORIGIN)
  const match =
    /^\/wiki\/rest\/api\/content\/(\d+)(?:\/child\/(page|folder))?$/.exec(
      url.pathname
    )
  if (!match) return json(404, { statusCode: 404, message: 'Unknown path' })
  const [, id, childType] = match
  const node = byId.get(id)
  if (!node) return notFound(id)
  if (childType) return childrenResponse(node, childType, url.searchParams)
  if (url.searchParams.get('expand')) return pageResponse(node)
  return json(200, { id: node.id, type: node.type, title: node.title })
}

/**
 * Serve the fake Confluence on a local port, for the Bash scripts' curl.
 *
 * @returns {Promise<{baseUrl: string, close: () => Promise<void>}>}
 */
export const serveConfluence = async () => {
  const server = createServer((request, response) => {
    const { status, body } = answer(request.url)
    response.writeHead(status, { 'content-type': 'application/json' })
    response.end(body)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  }
}

/**
 * Serve the fake Confluence through nock, for tim.
 *
 * @param {(origin: string) => import('nock').Scope} mockPool
 */
export const mockConfluence = (mockPool) => {
  mockPool(CONFLUENCE_ORIGIN)
    .persist()
    .get(() => true)
    .reply((uri) => {
      const { status, body } = answer(uri)
      return [status, body, { 'content-type': 'application/json' }]
    })
}
