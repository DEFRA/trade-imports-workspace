import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mockJiraForEachTest } from '../test-support/jira-mock.js'
import { preparePlan, reposIn } from './prepare-plan.js'

const jira = mockJiraForEachTest()

const workspaceWithRepo = (repo) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-ticket-plan-'))
  writeFileSync(
    join(workspaceRoot, 'repos.json'),
    '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n'
  )
  mkdirSync(join(workspaceRoot, 'repos', repo), { recursive: true })
  return workspaceRoot
}

const answerTicket = (key, ticket) => {
  jira()
    .get(`/rest/api/2/issue/${key}`)
    .query({ expand: 'renderedFields' })
    .reply(200, ticket)
  jira().get(`/rest/api/2/issue/${key}/comment`).reply(200, { comments: [] })
}

describe('#reposIn', () => {
  test.each([
    ['a,b', ['a', 'b']],
    [' a , b ,', ['a', 'b']],
    ['', []],
    [undefined, []]
  ])('Should read %j as %j', (repoList, repos) => {
    expect(reposIn(repoList)).toEqual(repos)
  })
})

describe('#preparePlan', () => {
  test('Should write the meta with the time given and a bundle naming no files when the review routing is missing', async () => {
    answerTicket('EUDPA-7', {
      key: 'EUDPA-7',
      fields: {
        summary: 'Tidy',
        issuetype: { name: 'Task' },
        status: { name: 'To Do' },
        labels: ['stub']
      },
      renderedFields: { description: '<p>Tidy.</p>' }
    })
    const workspaceRoot = workspaceWithRepo('trade-imports-stub')

    const { directory, meta } = await preparePlan({
      workspaceRoot,
      ticket: 'EUDPA-7',
      repoList: 'trade-imports-stub',
      now: () => new Date('2026-11-14T09:30:00.123Z')
    })

    expect(meta).toEqual({
      ticket: 'EUDPA-7',
      summary: 'Tidy',
      type: 'Task',
      status: 'To Do',
      priority: 'null',
      parent: 'None',
      labels: ['stub'],
      created: '2026-11-14T09:30:00Z',
      repos: [
        {
          repo: 'trade-imports-stub',
          tech: { technologies: [], best_practices: [] }
        }
      ]
    })
    expect(
      readFileSync(
        join(directory, 'best-practices', 'trade-imports-stub.md'),
        'utf8'
      )
    ).toBe(
      '# Best practices applicable to trade-imports-stub\n\nConcatenated from `docs/best-practices/` at prepare-plan time.\nApply these standards when planning changes in this repo.\n\n'
    )
  })

  test('Should name the ticket when Jira cannot give it', async () => {
    jira()
      .get('/rest/api/2/issue/EUDPA-8')
      .query({ expand: 'renderedFields' })
      .reply(404, { errorMessages: ['Issue does not exist'] })
    const workspaceRoot = workspaceWithRepo('trade-imports-stub')

    const preparing = preparePlan({ workspaceRoot, ticket: 'EUDPA-8' })

    await expect(preparing).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Error: failed to fetch ticket EUDPA-8'
    })
  })
})
