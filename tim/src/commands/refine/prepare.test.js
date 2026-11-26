import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { JIRA_BASE, mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { fetchCommentsAndPages, prepareRefinement } from './prepare.js'
import { reviewTemplatePath } from './workarea.js'

const jira = mockJiraForEachTest()

const workspaceWithTemplate = (template) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-refine-prepare-'))
  const templatePath = reviewTemplatePath(workspaceRoot)
  mkdirSync(dirname(templatePath), { recursive: true })
  writeFileSync(templatePath, template)
  return workspaceRoot
}

const ticketWithDescription = (description) => ({
  key: 'EUDPA-5',
  fields: {
    summary: 'Pick a port',
    issuetype: { name: 'Story' },
    status: { name: 'To Do' }
  },
  renderedFields: { description }
})

describe('#prepareRefinement', () => {
  test('Should ask Jira for the rendered description and leave out a page Confluence does not have', async () => {
    const link = `${JIRA_BASE}/wiki/spaces/EUDP/pages/9/Port`
    jira()
      .get('/rest/api/2/issue/EUDPA-5')
      .query({ expand: 'renderedFields' })
      .reply(200, ticketWithDescription(`<a href="${link}">port</a>`))
    jira().get('/rest/api/2/issue/EUDPA-5/comment').reply(200, { comments: [] })
    jira()
      .get('/wiki/rest/api/content/9')
      .query(true)
      .reply(404, { statusCode: 404 })
    const workspaceRoot = workspaceWithTemplate('# EUDPA-XXXXX\n')
    const lines = []

    const prepared = await prepareRefinement({
      workspaceRoot,
      ticket: 'EUDPA-5',
      log: async (line) => lines.push(line)
    })

    expect(lines).toContain(`  Fetching: ${link}`)
    expect(prepared.skipped).toEqual([
      { source: link, reason: 'getPage(9): not found.' }
    ])
    expect(
      readFileSync(join(prepared.directory, 'ticket.md'), 'utf8').endsWith(
        '## Confluence References\n\n\n'
      )
    ).toBe(true)
    expect(readFileSync(join(prepared.directory, 'review.md'), 'utf8')).toBe(
      '# EUDPA-5\n'
    )
  })
})

describe('#fetchCommentsAndPages', () => {
  const readable = `${JIRA_BASE}/wiki/spaces/EUDP/pages/9/Port`
  const refused = `${JIRA_BASE}/wiki/spaces/EUDP/pages/8/Gone`

  const fetchCommentsAndTwoPages = () => {
    const skipped = []
    const lines = []
    return fetchCommentsAndPages({
      ticket: 'EUDPA-5',
      description: `<a href="${readable}">port</a> <a href="${refused}">gone</a>`,
      log: async (line) => lines.push(line),
      skipped
    }).then((fetched) => ({ ...fetched, skipped, lines }))
  }

  const serveOneCommentAndTwoPages = () => {
    jira()
      .get('/rest/api/2/issue/EUDPA-5/comment')
      .reply(200, {
        comments: [
          {
            id: '1',
            author: { displayName: 'Pat Example' },
            created: '2026-11-01T09:00:00.000+0000',
            body: 'Agreed.'
          }
        ]
      })
    jira()
      .get('/wiki/rest/api/content/8')
      .query(true)
      .reply(404, { statusCode: 404 })
    jira()
      .get('/wiki/rest/api/content/9')
      .query(true)
      .reply(200, {
        id: '9',
        title: 'Port rules',
        space: { key: 'EUDP' },
        version: {
          number: 1,
          when: '2026-10-01T09:00:00.000Z',
          by: { displayName: 'Pat Example' }
        },
        metadata: { labels: { results: [] } },
        body: { view: { value: '<p>Ports have codes.</p>' } }
      })
  }

  test('Should give the comments and the readable page, and list the page Confluence refuses with its source and a reason', async () => {
    serveOneCommentAndTwoPages()

    const { comments, pages, skipped } = await fetchCommentsAndTwoPages()

    expect(comments.map(({ author, body }) => ({ author, body }))).toEqual([
      { author: 'Pat Example', body: 'Agreed.' }
    ])
    expect(pages.map((page) => page.title)).toEqual(['Port rules'])
    expect(skipped).toEqual([
      { source: refused, reason: expect.stringMatching(/\S/) }
    ])
  })

  test('Should print a progress line for comments and for each page it fetches', async () => {
    serveOneCommentAndTwoPages()

    const { lines } = await fetchCommentsAndTwoPages()

    expect(lines).toEqual([
      'Fetching comments...',
      'Checking for Confluence links...',
      `  Fetching: ${refused}`,
      `  Fetching: ${readable}`
    ])
  })
})
