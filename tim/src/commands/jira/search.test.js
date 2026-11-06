import { describe, test, expect, beforeEach } from 'vitest'
import { execa } from 'execa'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { parseSearchArgs, runSearch, renderSearch } from './search.js'

const here = dirname(fileURLToPath(import.meta.url))
const cliPath = join(here, '..', '..', 'cli.js')

const jira = mockJiraForEachTest()

beforeEach(() => {
  delete process.env.JIRA_PROJECT_KEY
})

describe('parseSearchArgs', () => {
  test('turns words into a text search in the project, newest change first', () => {
    expect(
      parseSearchArgs({ text: 'commodity MDM', project: 'EUDPA' })
    ).toEqual({
      jql: 'project = EUDPA AND text ~ "commodity MDM" ORDER BY updated DESC',
      limit: 50
    })
  })

  test('adds the not-done clause for --open', () => {
    expect(
      parseSearchArgs({ text: 'species', project: 'EUDPA', open: true }).jql
    ).toBe(
      'project = EUDPA AND text ~ "species" AND statusCategory != Done ORDER BY updated DESC'
    )
  })

  test('escapes quotes and backslashes in the words', () => {
    expect(
      parseSearchArgs({ text: 'say "hi" \\ there', project: 'EUDPA' }).jql
    ).toBe(
      'project = EUDPA AND text ~ "say \\"hi\\" \\\\ there" ORDER BY updated DESC'
    )
  })

  test('falls back to JIRA_PROJECT_KEY when --project is not given', () => {
    process.env.JIRA_PROJECT_KEY = 'EUDPA'
    expect(parseSearchArgs({ text: 'species' }).jql).toBe(
      'project = EUDPA AND text ~ "species" ORDER BY updated DESC'
    )
  })

  test('sends --jql as written, with the limit given', () => {
    expect(
      parseSearchArgs({ text: '', jql: 'parent = EUDPA-125', limit: '10' })
    ).toEqual({ jql: 'parent = EUDPA-125', limit: 10 })
  })

  describe('invalid', () => {
    const usageMessage = (input) => {
      try {
        parseSearchArgs(input)
      } catch (error) {
        return { code: error.code, message: error.message }
      }
      return null
    }

    test('refuses when there is nothing to search for', () => {
      expect(usageMessage({ text: '', project: 'EUDPA' })).toEqual({
        code: 'USAGE',
        message: 'Give the words to search for, or --jql <query>.'
      })
    })

    test('refuses words and --jql together', () => {
      expect(usageMessage({ text: 'species', jql: 'project = EUDPA' })).toEqual(
        {
          code: 'USAGE',
          message:
            'Give search words or --jql, not both. Put the project and status in the JQL.'
        }
      )
    })

    test('refuses when no project is named either way', () => {
      expect(usageMessage({ text: 'species' })).toEqual({
        code: 'USAGE',
        message: 'Give --project <key>, or set JIRA_PROJECT_KEY.'
      })
    })

    test('refuses a limit that is not a whole number', () => {
      expect(
        usageMessage({ text: 'species', project: 'EUDPA', limit: '2.5' })
      ).toEqual({ code: 'USAGE', message: '--limit must be a whole number.' })
    })

    test('refuses a limit above the most it will show', () => {
      expect(
        usageMessage({ text: 'species', project: 'EUDPA', limit: '501' })
      ).toEqual({ code: 'USAGE', message: '--limit can be at most 500.' })
    })
  })
})

describe('runSearch', () => {
  test('returns the JQL it sent and the tickets that matched', async () => {
    jira()
      .get(/^\/rest\/api\/3\/search\/jql/)
      .query(
        (query) =>
          query.jql ===
          'project = EUDPA AND text ~ "species check" ORDER BY updated DESC'
      )
      .reply(200, {
        issues: [
          {
            key: 'EUDPA-757',
            fields: {
              summary: 'Re-check saved species against MDM',
              status: { name: 'To Do' },
              issuetype: { name: 'Story' }
            }
          }
        ]
      })

    const result = await runSearch({ text: 'species check', project: 'EUDPA' })

    expect(result).toEqual({
      jql: 'project = EUDPA AND text ~ "species check" ORDER BY updated DESC',
      issues: [
        {
          key: 'EUDPA-757',
          summary: 'Re-check saved species against MDM',
          status: 'To Do',
          type: 'Story'
        }
      ]
    })
  })
})

describe('renderSearch', () => {
  test('lists key, status, type and summary per ticket', () => {
    const text = renderSearch({
      jql: 'project = EUDPA',
      issues: [
        {
          key: 'EUDPA-757',
          summary: 'Re-check saved species',
          status: 'To Do',
          type: 'Story'
        }
      ]
    })
    expect(text).toBe('EUDPA-757  [To Do] Story  Re-check saved species')
  })

  test('says when nothing matches, with the JQL it sent', () => {
    expect(renderSearch({ jql: 'project = EUDPA', issues: [] })).toBe(
      'No tickets match: project = EUDPA'
    )
  })
})

describe('tim jira search (spawn)', () => {
  // TIM_NO_AUTO_PULL because the usage test below asserts stderr exactly, and a
  // tim run on `main` fast-forwards the workspace first. Several spawn tests
  // pulling at once race, and git's "Cannot fast-forward to multiple branches"
  // lands on the same stream as the usage message.
  const credentialFreeEnv = {
    ...process.env,
    TIM_NO_AUTO_PULL: '1',
    JIRA_USER: '',
    JIRA_TOKEN: '',
    JIRA_BASE_URL: '',
    JIRA_PROJECT_KEY: ''
  }

  test('exits 2 with a usage message when there is nothing to search for', async () => {
    const { stderr, exitCode } = await execa(
      'node',
      [cliPath, 'jira', 'search', '--project', 'EUDPA'],
      { reject: false, env: credentialFreeEnv }
    )

    expect(exitCode).toBe(2)
    expect(stderr.trim()).toBe(
      'Give the words to search for, or --jql <query>.'
    )
  })

  test('emits an ok:false envelope with an AUTH error when no Jira credentials are set', async () => {
    const { stdout, exitCode } = await execa(
      'node',
      [cliPath, 'jira', 'search', 'species', '--project', 'EUDPA', '--json'],
      { reject: false, env: credentialFreeEnv }
    )

    expect(exitCode).toBe(1)
    expect(JSON.parse(stdout.trim())).toMatchObject({
      ok: false,
      schema_version: 1,
      result: null,
      errors: [{ code: 'AUTH' }]
    })
  })
})
