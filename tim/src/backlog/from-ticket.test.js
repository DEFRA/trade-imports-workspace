import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  attachmentBytes,
  useAtlassianFixtureServer
} from '../commands/refine/__fixtures__/atlassian-server.js'
import {
  blockersOf,
  branchPrefixOf,
  checkTicketForChanges,
  existingWorkareaFor,
  fetchTicketIntoWorkarea,
  slugOfSummary
} from './from-ticket.js'
import { backlogOf, row } from './__fixtures__/backlog-rows.js'
import { makeWorkareaWorkspace } from './__fixtures__/workarea-workspace.js'

const atlassian = useAtlassianFixtureServer()
let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

describe('#branchPrefixOf', () => {
  test.each([
    ['Bug', 'fix'],
    ['Story', 'feat'],
    ['Task', 'chore'],
    ['Epic', 'chore'],
    [null, 'chore']
  ])('Should give a %s ticket the %s prefix', (type, prefix) => {
    expect(branchPrefixOf(type)).toBe(prefix)
  })
})

describe('#slugOfSummary', () => {
  test('Should keep the first five words, lower case, with punctuation dropped', () => {
    expect(
      slugOfSummary('Search addresses by country, with a filter, in the book!')
    ).toBe('search-addresses-by-country-with')
  })

  test('Should skip a word that is only punctuation', () => {
    expect(slugOfSummary('Fix - the "export" button')).toBe(
      'fix-the-export-button'
    )
  })
})

describe('#blockersOf', () => {
  const clean = {
    status: 'Refining',
    description: 'h2. Acceptance criteria\n# Shows the code',
    links: []
  }

  test('Should find none in a ready ticket', () => {
    expect(blockersOf(clean)).toEqual([])
  })

  test('Should name an open "is blocked by" link, and not one whose ticket is Done', () => {
    const link = (otherKey, otherStatus, relation = 'is blocked by') => ({
      direction: 'inward',
      relation,
      otherKey,
      otherStatus
    })

    expect(
      blockersOf({
        ...clean,
        links: [
          link('EUDPA-190', 'In Progress'),
          link('EUDPA-191', 'Done'),
          link('EUDPA-192', 'Closed'),
          link('EUDPA-193', 'To Do', 'relates to')
        ]
      })
    ).toEqual(['EUDPA-190 blocks this ticket and is In Progress.'])
  })

  test.each([
    ['a wiki heading', 'h3. Acceptance Criteria\n# One'],
    ['a bold line', '*Acceptance criteria*\n# One']
  ])('Should count %s as the acceptance criteria heading', (_, description) => {
    expect(blockersOf({ ...clean, description })).toEqual([])
  })

  test('Should name a description with no acceptance criteria heading', () => {
    expect(
      blockersOf({
        ...clean,
        description: 'Some words about acceptance criteria'
      })
    ).toEqual(['The description has no acceptance criteria heading.'])
  })

  test.each(['Done', 'Closed'])('Should name a ticket that is %s', (status) => {
    expect(blockersOf({ ...clean, status })).toEqual([
      `The ticket is already ${status}.`
    ])
  })

  test('Should give every blocker of a ticket that breaks all three rules, in a fixed order', () => {
    expect(
      blockersOf({
        status: 'Done',
        description: 'Nothing useful',
        links: [
          {
            direction: 'inward',
            relation: 'is blocked by',
            otherKey: 'EUDPA-190',
            otherStatus: 'To Do'
          }
        ]
      })
    ).toEqual([
      'The ticket is already Done.',
      'The description has no acceptance criteria heading.',
      'EUDPA-190 blocks this ticket and is To Do.'
    ])
  })
})

describe('#existingWorkareaFor', () => {
  const lookup = (key = 'EUDPA-29', workarea) =>
    existingWorkareaFor({ workspaceRoot: workspace.root, key, workarea })

  test('Should find none when no folder is named for the key', () => {
    workspace = makeWorkareaWorkspace({ folders: ['other-thing'] })

    expect(lookup()).toBeNull()
  })

  test('Should keep the folder it finds, and its slug', () => {
    workspace = makeWorkareaWorkspace({ folders: ['eudpa-29-old-slug'] })

    expect(lookup()).toEqual({
      workarea: 'shared/eudpa-29-old-slug',
      slug: 'old-slug'
    })
  })

  test('Should find a folder named by the bare key, with no slug', () => {
    workspace = makeWorkareaWorkspace({ folders: ['eudpa-29'] })

    expect(lookup()).toEqual({ workarea: 'shared/eudpa-29', slug: '' })
  })

  test('Should not take another ticket whose number starts the same, or a file', () => {
    workspace = makeWorkareaWorkspace({
      folders: ['eudpa-294-other'],
      files: { 'eudpa-29-notes.md': 'notes' }
    })

    expect(lookup()).toBeNull()
  })

  test('Should refuse when two folders match, naming both and the --workarea option', () => {
    workspace = makeWorkareaWorkspace({
      folders: ['eudpa-29-first', 'eudpa-29-second']
    })

    expect(() => lookup()).toThrow(
      /shared\/eudpa-29-first, shared\/eudpa-29-second.*--workarea/
    )
  })

  test('Should use the workarea it is told to, even when two folders match', () => {
    workspace = makeWorkareaWorkspace({
      folders: ['eudpa-29-first', 'eudpa-29-second']
    })

    expect(lookup('EUDPA-29', 'shared/eudpa-29-second/')).toEqual({
      workarea: 'shared/eudpa-29-second',
      slug: 'second'
    })
  })

  test('Should refuse a workarea that climbs out of workareas/', () => {
    workspace = makeWorkareaWorkspace()

    expect(() => lookup('EUDPA-29', '../elsewhere')).toThrow(
      /must be a path inside workareas/
    )
  })
})

describe('#fetchTicketIntoWorkarea', () => {
  const WORKAREA = 'shared/eudpa-210-search-addresses-by-country-with'

  const fetchTicket = (options = {}) =>
    fetchTicketIntoWorkarea({
      workspaceRoot: workspace.root,
      key: 'EUDPA-210',
      ...options
    })

  const inWorkarea = (path, workarea = WORKAREA) =>
    join(workspace.root, 'workareas', workarea, path)

  const ticketFile = () =>
    readFileSync(inWorkarea('sources/ticket-eudpa-210.md'), 'utf8')

  test('Should write the ticket file with the description, comments, linked page, parent, links and subtasks', async () => {
    workspace = makeWorkareaWorkspace()

    await fetchTicket()

    expect(ticketFile()).toContain(
      '# EUDPA-210: Search addresses by country, with a filter, in the address book'
    )
    expect(ticketFile()).toContain('<li>Shows the country filter</li>')
    expect(ticketFile()).toContain(
      '### Pat Example (2026-11-21)\nThe filter replaces the country box.'
    )
    expect(ticketFile()).toContain('### Review page design')
    expect(ticketFile()).toContain(
      '### EUDPA-50: Commodity codes everywhere (In Progress)\n\n<p>Every page shows commodity codes.</p>'
    )
    expect(ticketFile()).toContain(
      '- is blocked by EUDPA-190 (In Progress): Add the country list\n- is blocked by EUDPA-191 (Done): Add the address book'
    )
    expect(ticketFile()).toContain('- EUDPA-211 (To Do): Write the filter')
  })

  test('Should save the image and PDF attachments beside the ticket file, and list all three in it', async () => {
    workspace = makeWorkareaWorkspace()

    const { attachments } = await fetchTicket()

    expect(
      readFileSync(inWorkarea('sources/attachments/9001-filter-mock.png'))
    ).toEqual(attachmentBytes[9001])
    expect(
      readFileSync(inWorkarea('sources/attachments/9002-rules.pdf'))
    ).toEqual(attachmentBytes[9002])
    expect(attachments.map(({ filename }) => filename)).toEqual([
      'filter-mock.png',
      'rules.pdf',
      'notes.docx'
    ])
    expect(ticketFile()).toContain(
      `- filter-mock.png (image/png): saved as workareas/${WORKAREA}/sources/attachments/9001-filter-mock.png`
    )
    expect(ticketFile()).toContain(
      '- notes.docx (application/vnd.openxmlformats-officedocument.wordprocessingml.document): not saved, only images and PDFs are saved'
    )
  })

  test('Should write the tests repo and the ticket as the two sources, with the ticket file as the ticket locator', async () => {
    workspace = makeWorkareaWorkspace()

    const { sourcesFile } = await fetchTicket()

    expect(sourcesFile).toEqual({
      path: inWorkarea('sources.json'),
      written: true
    })
    expect(
      JSON.parse(readFileSync(inWorkarea('sources.json'), 'utf8'))
    ).toEqual({
      programme: 'eudpa-210-search-addresses-by-country-with',
      goal: 'Build what EUDPA-210 asks for: Search addresses by country, with a filter, in the address book',
      repos: { tests: 'repos/trade-imports-ins-tests' },
      reposWhy:
        "The tests repo holds every domain's end-to-end specs, which show what is already proven.",
      precedence: ['repo:tests', 'ticket:EUDPA-210'],
      sources: [
        {
          id: 'repo:tests',
          kind: 'repo',
          locator: 'repos/trade-imports-ins-tests',
          scope: "every domain's e2e specs and journey flows",
          role: 'what is already proven end to end'
        },
        {
          id: 'ticket:EUDPA-210',
          kind: 'ticket',
          locator: `workareas/${WORKAREA}/sources/ticket-eudpa-210.md`,
          scope:
            'the whole ticket: description, acceptance criteria, comments, linked Confluence pages and saved attachments',
          role: 'what the ticket asks for, and what its comments have changed'
        }
      ]
    })
  })

  test('Should record the branch and when Jira last updated the ticket', async () => {
    workspace = makeWorkareaWorkspace()

    const { recordFile } = await fetchTicket({
      now: () => new Date('2026-11-24T10:00:00.000Z')
    })

    expect(JSON.parse(readFileSync(recordFile, 'utf8'))).toEqual({
      ticket: 'EUDPA-210',
      updated: '2026-11-20T09:00:00.000+0000',
      branch: 'feat/EUDPA-210-search-addresses-by-country-with',
      fetchedAt: '2026-11-24T10:00:00Z'
    })
  })

  test('Should name the workarea and the branch from the ticket, and list its blocker', async () => {
    workspace = makeWorkareaWorkspace()

    expect(await fetchTicket()).toMatchObject({
      workarea: WORKAREA,
      branch: 'feat/EUDPA-210-search-addresses-by-country-with',
      blockers: ['EUDPA-190 blocks this ticket and is In Progress.'],
      skipped: []
    })
  })

  test('Should keep the folder and slug it first named when the summary has since changed', async () => {
    workspace = makeWorkareaWorkspace()
    await fetchTicket()
    atlassian().changeTicket('EUDPA-210', {
      summary: 'Something else entirely'
    })

    expect(await fetchTicket()).toMatchObject({
      workarea: WORKAREA,
      branch: 'feat/EUDPA-210-search-addresses-by-country-with'
    })
  })

  test('Should take the summary slug for a workarea named by the bare key', async () => {
    workspace = makeWorkareaWorkspace({ folders: ['eudpa-210'] })

    expect(await fetchTicket()).toMatchObject({
      workarea: 'shared/eudpa-210',
      branch: 'feat/EUDPA-210-search-addresses-by-country-with'
    })
  })

  test('Should keep a sources file already there', async () => {
    workspace = makeWorkareaWorkspace()
    await fetchTicket()
    writeFileSync(inWorkarea('sources.json'), '{"edited":true}\n')

    const { sourcesFile } = await fetchTicket()

    expect(readFileSync(inWorkarea('sources.json'), 'utf8')).toBe(
      '{"edited":true}\n'
    )
    expect(sourcesFile.written).toBe(false)
  })

  test('Should refuse a workarea with a built row, and ask Jira nothing', async () => {
    workspace = makeWorkareaWorkspace({
      backlogs: {
        'shared/eudpa-210-old': backlogOf(
          row({ id: 'inc-001', status: 'done' }),
          row({ id: 'inc-002' })
        )
      }
    })

    await expect(fetchTicket()).rejects.toMatchObject({
      code: 'REFUSED',
      message:
        'shared/eudpa-210-old already has built rows for EUDPA-210 (inc-001), so fetching the ticket again would put it out of step with them.'
    })
    expect(atlassian().requests).toEqual([])
  })

  test('Should fetch into a workarea whose backlog has no built row', async () => {
    workspace = makeWorkareaWorkspace({
      backlogs: { 'shared/eudpa-210-old': backlogOf(row({ id: 'inc-001' })) }
    })

    expect(await fetchTicket()).toMatchObject({
      workarea: 'shared/eudpa-210-old'
    })
  })

  test('Should list a parent Jira will not give, and carry on', async () => {
    workspace = makeWorkareaWorkspace()
    atlassian().changeTicket('EUDPA-210', { parent: { key: 'EUDPA-9999' } })

    const { skipped } = await fetchTicket()

    expect(skipped).toEqual([
      {
        source: 'parent EUDPA-9999',
        reason: 'Error: Failed to fetch ticket EUDPA-9999'
      }
    ])
    expect(ticketFile()).not.toContain('## Parent')
  })

  test('Should list an attachment that cannot be downloaded as not saved, and carry on', async () => {
    workspace = makeWorkareaWorkspace()
    atlassian().changeTicket('EUDPA-210', {
      attachment: [
        {
          id: '9999',
          filename: 'gone.png',
          mimeType: 'image/png',
          size: 1,
          created: '2026-11-19T10:00:00.000+0000'
        }
      ]
    })

    const { attachments, skipped } = await fetchTicket()

    expect(attachments).toEqual([
      {
        filename: 'gone.png',
        mimeType: 'image/png',
        notSavedBecause:
          'the download failed: downloadAttachment(9999): not found.'
      }
    ])
    expect(skipped).toEqual([
      {
        source: 'attachment 9999 (gone.png)',
        reason: 'downloadAttachment(9999): not found.'
      }
    ])
  })

  test('Should list an attachment as not saved, with the reason, when Jira refuses to list it', async () => {
    workspace = makeWorkareaWorkspace()
    atlassian().refuseAttachmentListing('EUDPA-210', 500)

    const { attachments, skipped } = await fetchTicket()

    expect(attachments).toEqual([])
    expect(skipped).toEqual([
      {
        source: 'attachments on EUDPA-210',
        reason: 'listAttachments(EUDPA-210): Jira returned 500.'
      }
    ])
  })

  test('Should keep two attachments that share a filename, each with its own bytes', async () => {
    workspace = makeWorkareaWorkspace()
    const sameName = (id) => ({
      id,
      filename: 'screen.png',
      mimeType: 'image/png',
      size: 8,
      created: '2026-11-19T10:00:00.000+0000'
    })
    atlassian().changeTicket('EUDPA-210', {
      attachment: [sameName('9001'), sameName('9002')]
    })

    const { attachments } = await fetchTicket()

    const savedPaths = attachments.map(({ savedAs }) => savedAs)
    expect(new Set(savedPaths).size).toBe(2)
    expect(
      readFileSync(inWorkarea('sources/attachments/9001-screen.png'))
    ).toEqual(attachmentBytes[9001])
    expect(
      readFileSync(inWorkarea('sources/attachments/9002-screen.png'))
    ).toEqual(attachmentBytes[9002])
    expect(ticketFile()).toContain(
      `- screen.png (image/png): saved as workareas/${WORKAREA}/sources/attachments/9001-screen.png`
    )
    expect(ticketFile()).toContain(
      `- screen.png (image/png): saved as workareas/${WORKAREA}/sources/attachments/9002-screen.png`
    )
  })

  test('Should still write the ticket file and the sources file for a ticket with no attachments', async () => {
    workspace = makeWorkareaWorkspace()
    atlassian().changeTicket('EUDPA-210', { attachment: [] })

    const { attachments } = await fetchTicket()

    expect(attachments).toEqual([])
    expect(ticketFile()).toContain(
      '# EUDPA-210: Search addresses by country, with a filter, in the address book'
    )
    expect(
      JSON.parse(readFileSync(inWorkarea('sources.json'), 'utf8')).programme
    ).toBe('eudpa-210-search-addresses-by-country-with')
  })
})

describe('#checkTicketForChanges', () => {
  const check = (options = {}) =>
    checkTicketForChanges({
      workspaceRoot: workspace.root,
      key: 'EUDPA-210',
      ...options
    })

  test('Should find the ticket unchanged when Jira has not updated it since the record', async () => {
    workspace = makeWorkareaWorkspace()
    await fetchTicketIntoWorkarea({
      workspaceRoot: workspace.root,
      key: 'EUDPA-210'
    })

    expect(await check()).toEqual({
      ticket: 'EUDPA-210',
      workarea: 'shared/eudpa-210-search-addresses-by-country-with',
      changed: false,
      recordedUpdated: '2026-11-20T09:00:00.000+0000',
      currentUpdated: '2026-11-20T09:00:00.000+0000'
    })
  })

  test('Should find the ticket changed when Jira updated it after the record', async () => {
    workspace = makeWorkareaWorkspace()
    await fetchTicketIntoWorkarea({
      workspaceRoot: workspace.root,
      key: 'EUDPA-210'
    })
    atlassian().changeTicket('EUDPA-210', {
      updated: '2026-11-25T09:00:00.000+0000'
    })

    expect(await check()).toMatchObject({
      changed: true,
      currentUpdated: '2026-11-25T09:00:00.000+0000'
    })
  })

  test('Should say no workarea holds the ticket, and ask Jira nothing', async () => {
    workspace = makeWorkareaWorkspace()

    await expect(check()).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message:
        'No workarea holds EUDPA-210. Run tim backlog from-ticket EUDPA-210 first.'
    })
    expect(atlassian().requests).toEqual([])
  })

  test('Should say a workarea with no record of the ticket has none, and ask Jira nothing', async () => {
    workspace = makeWorkareaWorkspace({ folders: ['eudpa-210-old'] })

    await expect(check()).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message:
        'shared/eudpa-210-old has no record of EUDPA-210. Run tim backlog from-ticket EUDPA-210 --workarea shared/eudpa-210-old first.'
    })
    expect(atlassian().requests).toEqual([])
  })
})
