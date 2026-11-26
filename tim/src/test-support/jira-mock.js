import { afterEach, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { closeHttpMocks, installHttpMocks } from './http-mock.js'

export const JIRA_BASE = 'https://example.atlassian.net'

const JIRA_FIXTURES = fileURLToPath(new URL('fixtures/jira/', import.meta.url))

export const loadJiraFixture = (name) =>
  JSON.parse(readFileSync(`${JIRA_FIXTURES}${name}`, 'utf8'))

const commentsPathOf = (key) => `/rest/api/2/issue/${key}/comment`

/**
 * Answer every read of an issue's comments with the `before` list until a
 * comment write on that issue has been accepted, and with the `after` list
 * from then on. `after` is `before` when left out.
 */
export const commentReads = (jira, key, { before, after = before }) => {
  jira.keysWithAcceptedWrite.delete(key)
  jira()
    .persist()
    .get(commentsPathOf(key))
    .reply(200, () => ({
      comments: jira.keysWithAcceptedWrite.has(key) ? after : before
    }))
}

/** Accept one new comment on an issue, answering with `created`. */
export const acceptsComment = (jira, key, created) => {
  const sent = { body: null }
  jira()
    .post(commentsPathOf(key), (body) => {
      sent.body = body
      jira.keysWithAcceptedWrite.add(key)
      return true
    })
    .reply(201, created)
  return sent
}

/** Accept one edit of a comment on an issue, answering with `edited`. */
export const acceptsCommentEdit = (jira, key, commentId, edited) => {
  const sent = { body: null }
  jira()
    .put(`${commentsPathOf(key)}/${commentId}`, (body) => {
      sent.body = body
      jira.keysWithAcceptedWrite.add(key)
      return true
    })
    .reply(200, edited)
  return sent
}

export const mockJiraForEachTest = () => {
  const mocks = { pool: null, environment: null }
  const jira = () => mocks.pool(JIRA_BASE)
  jira.keysWithAcceptedWrite = new Set()

  beforeEach(() => {
    jira.keysWithAcceptedWrite.clear()
    mocks.environment = { ...process.env }
    process.env.JIRA_USER = 'sam'
    process.env.JIRA_TOKEN = 'token'
    process.env.JIRA_BASE_URL = JIRA_BASE
    mocks.pool = installHttpMocks().mockPool
  })

  afterEach(() => {
    process.env = mocks.environment
    closeHttpMocks()
  })

  return jira
}
