import { describe, test, expect } from 'vitest'
import { SCREENS } from './menuConfig.js'

describe('SCREENS', () => {
  test('exposes the screen identifiers used by Phase 5a routing', () => {
    expect(SCREENS).toMatchObject({
      MAIN: 'main',
      LOADING: 'loading',
      ERROR: 'error',
      WORKSPACE_MENU: 'workspace-menu',
      WORKSPACE_STATUS_OUTPUT: 'workspace-status-output'
    })
  })

  test('exposes the screen identifiers used by Phase 5b routing', () => {
    expect(SCREENS).toMatchObject({
      WORKSPACE_TASK_RESULTS: 'workspace-task-results',
      AUTH_RESULTS: 'auth-results'
    })
  })

  test('exposes the screen identifiers used by Phase 5d routing', () => {
    expect(SCREENS).toMatchObject({
      DOCKER_MENU: 'docker-menu',
      START_MENU: 'start-menu'
    })
  })

  test('exposes the screen identifiers used by Phase 5e routing', () => {
    expect(SCREENS).toMatchObject({
      JIRA_COMMENTS_INPUT: 'jira-comments-input',
      JIRA_COMMENTS_RESULT: 'jira-comments-result'
    })
  })

  test('exposes the screen identifiers used by Phase 5c routing', () => {
    expect(SCREENS).toMatchObject({
      JIRA_MENU: 'jira-menu',
      JIRA_TICKET_INPUT: 'jira-ticket-input',
      JIRA_TICKET_RESULT: 'jira-ticket-result',
      CONFLUENCE_MENU: 'confluence-menu',
      CONFLUENCE_PAGE_INPUT: 'confluence-page-input',
      CONFLUENCE_PAGE_RESULT: 'confluence-page-result'
    })
  })

  test('exposes the screen identifier used by Phase 5g routing', () => {
    expect(SCREENS).toMatchObject({
      WORKSPACE_TASK_PROGRESS: 'workspace-task-progress'
    })
  })

  test('every value is a unique non-empty string', () => {
    const values = Object.values(SCREENS)
    expect(new Set(values).size).toBe(values.length)
    for (const value of values) expect(value).toMatch(/^[a-z][a-z0-9-]*$/)
  })
})
