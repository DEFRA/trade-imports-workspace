import { afterEach, describe, expect, test } from 'vitest'
import { mockJiraForEachTest } from '../test-support/jira-mock.js'
import {
  createGitWorkspace,
  specText
} from './__fixtures__/theme-ticket-workspace.js'
import {
  checkStaleTickets,
  citedSpecFiles,
  compareTimes,
  renderStaleText
} from './stale.js'

const SPEC = 'openspec/specs/plants/offset/spec.md'

const jira = mockJiraForEachTest()

let workspace

afterEach(() => workspace?.remove())

const jiraUpdated = (key, updated) =>
  jira()
    .get(`/rest/api/2/issue/${key}`)
    .reply(200, { key, fields: { summary: key, updated } })

const stageTicket = async ({ commitDate }) => {
  workspace = await createGitWorkspace()
  workspace.write({
    [SPEC]: specText('Offset', [{ heading: 'Offset works', id: 'OF-1' }]),
    'workareas/wa/tickets/plants/ticket.created.json': '{"key":"EUDPA-5"}\n',
    'workareas/wa/tickets/plants/description.txt': `h2. Specs\n* [spec|https://example.invalid/${SPEC}]\n`
  })
  await workspace.commit('docs(KEY-1): spec it', commitDate)
}

describe('#compareTimes', () => {
  test.each([
    ['2026-04-01T10:00:00+01:00', '2026-04-01T09:30:00.000+0000', 'current'],
    ['2026-04-01T10:00:00Z', '2026-04-01T09:30:00.000+0000', 'stale'],
    ['2026-04-01T09:30:00Z', '2026-04-01T09:30:00.000+0000', 'current'],
    ['not a date', '2026-04-01T09:30:00.000+0000', null]
  ])(
    'Should judge a spec changed at %s against a ticket updated at %s as %s',
    (specChanged, ticketUpdated, verdict) => {
      expect(compareTimes(specChanged, ticketUpdated)).toBe(verdict)
    }
  )
})

describe('#citedSpecFiles', () => {
  test('Should list each spec file a description links to once, in code point order', () => {
    const description =
      'see openspec/specs/plants/b/spec.md and openspec/specs/ins/a/spec.md, then openspec/specs/plants/b/spec.md again'

    expect(citedSpecFiles(description)).toEqual([
      'openspec/specs/ins/a/spec.md',
      'openspec/specs/plants/b/spec.md'
    ])
  })
})

describe('#checkStaleTickets', () => {
  test('Should call a ticket current when its spec changed earlier in real time, though later on the clock face', async () => {
    await stageTicket({ commitDate: '2026-04-01T10:00:00+01:00' })
    jiraUpdated('EUDPA-5', '2026-04-01T09:30:00.000+0000')

    const report = await checkStaleTickets({
      workspaceRoot: workspace.root,
      workarea: 'wa'
    })

    expect(renderStaleText(report)).toBe(
      [
        'FOLDER                 TICKET       SPEC LAST CHANGED      TICKET UPDATED         VERDICT',
        'plants                 EUDPA-5      2026-04-01T10:00:00    2026-04-01T09:30:00    current',
        '',
        '1 ticket(s) compared, 0 stale.'
      ].join('\n')
    )
  })

  test('Should call a ticket stale when its spec changed after Jira last updated it, and say how to regenerate', async () => {
    await stageTicket({ commitDate: '2026-04-01T10:00:00+00:00' })
    jiraUpdated('EUDPA-5', '2026-04-01T09:30:00.000+0000')

    const report = await checkStaleTickets({
      workspaceRoot: workspace.root,
      workarea: 'wa'
    })

    expect(renderStaleText(report).split('\n').slice(1)).toEqual([
      expect.stringMatching(/ STALE — regenerate$/),
      '',
      '1 ticket(s) compared, 1 stale.',
      'Regenerate a stale ticket by re-deriving its theme and rewriting its description.txt.'
    ])
  })

  test('Should say it cannot compare when Jira cannot find the ticket', async () => {
    await stageTicket({ commitDate: '2026-04-01T10:00:00+00:00' })
    jira()
      .get('/rest/api/2/issue/EUDPA-5')
      .reply(404, { errorMessages: ['Gone'] })

    const report = await checkStaleTickets({
      workspaceRoot: workspace.root,
      workarea: 'wa'
    })

    expect(
      report.tickets.map(({ verdict, ticketUpdated }) => ({
        verdict,
        ticketUpdated
      }))
    ).toEqual([{ verdict: 'cannot compare', ticketUpdated: '' }])
  })

  test('Should refuse a workarea with no tickets folder', async () => {
    workspace = await createGitWorkspace()

    await expect(
      checkStaleTickets({ workspaceRoot: workspace.root, workarea: 'gone' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `tim theme-ticket stale: no tickets folder at ${workspace.root}/workareas/gone/tickets`
    })
  })
})
