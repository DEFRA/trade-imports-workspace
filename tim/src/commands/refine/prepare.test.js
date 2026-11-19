import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { JIRA_BASE, mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { prepareRefinement } from './prepare.js'
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
