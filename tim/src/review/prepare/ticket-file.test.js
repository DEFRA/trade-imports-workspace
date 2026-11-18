import { describe, expect, test } from 'vitest'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { branchTicketFile, ticketFileFromJira } from './ticket-file.js'

const jira = mockJiraForEachTest()

describe('#branchTicketFile', () => {
  test('Should describe the branch, with a comment where acceptance criteria go', () => {
    expect(
      branchTicketFile({
        reviewId: 'tidy-logs',
        branch: 'feature/tidy/logs',
        description: 'Tidy the logs'
      })
    ).toBe(
      '# tidy-logs\n\n## Description\n\nTidy the logs\n\n## Branch\n\n`feature/tidy/logs`\n\n## Acceptance Criteria\n\n<!-- No ticket - define acceptance criteria manually -->\n\n'
    )
  })
})

describe('#ticketFileFromJira', () => {
  test('Should refuse a ticket Jira cannot find, naming the ticket', async () => {
    jira()
      .get('/rest/api/2/issue/EUDPA-9')
      .query({ expand: 'renderedFields' })
      .reply(404, { errorMessages: ['Issue does not exist'] })

    await expect(
      ticketFileFromJira({ ticket: 'EUDPA-9', log: () => {} })
    ).rejects.toMatchObject({
      message: 'Error: Failed to fetch ticket EUDPA-9'
    })
  })
})
