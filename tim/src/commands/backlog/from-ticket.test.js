import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR, USAGE } from '../../constants/exitCodes.js'
import { backlogOf, row } from '../../backlog/__fixtures__/backlog-rows.js'
import { makeWorkareaWorkspace } from '../../backlog/__fixtures__/workarea-workspace.js'
import { envelopeOf, runTimInWorkspace } from '../../test-support/tim-cli.js'
import {
  attachmentBytes,
  useAtlassianFixtureServer
} from '../refine/__fixtures__/atlassian-server.js'

const WORKAREA = 'shared/eudpa-210-search-addresses-by-country-with'

const atlassian = useAtlassianFixtureServer()
let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const fromTicketAsText = (args) =>
  runTimInWorkspace(workspace.root, ['backlog', 'from-ticket', ...args])

const fromTicket = (args) => fromTicketAsText([...args, '--json'])

describe('tim backlog from-ticket', () => {
  test('Should name the workarea, branch and blocker, and write a sources file that distil status accepts', async () => {
    workspace = makeWorkareaWorkspace({ distilSchemas: true })

    const run = await fromTicket(['eudpa-210'])
    const status = await runTimInWorkspace(workspace.root, [
      'distil',
      'status',
      WORKAREA,
      '--json'
    ])

    expect(run.exitCode).toBe(0)
    expect(envelopeOf(run).result).toMatchObject({
      mode: 'fetch',
      ticket: 'EUDPA-210',
      workarea: WORKAREA,
      branch: 'feat/EUDPA-210-search-addresses-by-country-with',
      blockers: ['EUDPA-190 blocks this ticket and is In Progress.']
    })
    expect(envelopeOf(status)).toMatchObject({ ok: true })
    expect(
      envelopeOf(status).result.sources.map(({ id, kind }) => [id, kind])
    ).toEqual([
      ['repo:tests', 'repo'],
      ['ticket:EUDPA-210', 'ticket']
    ])
  })

  test('Should say in plain words what it fetched and saved', async () => {
    workspace = makeWorkareaWorkspace()

    const run = await fromTicketAsText(['EUDPA-210'])

    const [fetched, branch, ticketFile, sourcesFile, ...rest] =
      run.stdout.split('\n')
    expect(sourcesFile).toMatch(
      new RegExp(`^Wrote .*/workareas/${WORKAREA}/sources\\.json\\.$`)
    )
    expect([fetched, branch, ticketFile, ...rest]).toEqual([
      `Fetched EUDPA-210 into ${WORKAREA}.`,
      'Branch: feat/EUDPA-210-search-addresses-by-country-with',
      `Ticket file: workareas/${WORKAREA}/sources/ticket-eudpa-210.md`,
      'Attachments:',
      `  filter-mock.png: saved as workareas/${WORKAREA}/sources/attachments/9001-filter-mock.png`,
      `  rules.pdf: saved as workareas/${WORKAREA}/sources/attachments/9002-rules.pdf`,
      '  notes.docx: not saved, only images and PDFs are saved',
      'Blockers:',
      '  EUDPA-190 blocks this ticket and is In Progress.'
    ])
  })

  test('Should save the attachment bytes at the path the result gives, and list that path in the ticket file', async () => {
    workspace = makeWorkareaWorkspace()

    const run = await fromTicket(['EUDPA-210'])

    const { attachments, ticketFile } = envelopeOf(run).result
    const image = attachments.find(
      ({ filename }) => filename === 'filter-mock.png'
    )
    expect(readFileSync(join(workspace.root, image.savedAs))).toEqual(
      attachmentBytes[9001]
    )
    expect(readFileSync(join(workspace.root, ticketFile), 'utf8')).toContain(
      `- filter-mock.png (image/png): saved as ${image.savedAs}`
    )
  })

  test('Should keep a sources file already there, and say so', async () => {
    workspace = makeWorkareaWorkspace()
    await fromTicket(['EUDPA-210'])
    const sourcesPath = join(
      workspace.root,
      'workareas',
      WORKAREA,
      'sources.json'
    )
    const before = readFileSync(sourcesPath, 'utf8')

    const run = await fromTicketAsText(['EUDPA-210'])

    expect(run.stdout.split('\n')).toContain(
      `Kept the ${sourcesPath} already there.`
    )
    expect(readFileSync(sourcesPath, 'utf8')).toBe(before)
  })

  describe('--check', () => {
    test('Should report the ticket changed, with both updated times', async () => {
      workspace = makeWorkareaWorkspace()
      await fromTicket(['EUDPA-210'])
      atlassian().changeTicket('EUDPA-210', {
        updated: '2026-11-25T09:00:00.000+0000'
      })

      const run = await fromTicket(['EUDPA-210', '--check'])

      expect(envelopeOf(run).result).toEqual({
        mode: 'check',
        ticket: 'EUDPA-210',
        workarea: WORKAREA,
        changed: true,
        recordedUpdated: '2026-11-20T09:00:00.000+0000',
        currentUpdated: '2026-11-25T09:00:00.000+0000'
      })
    })

    test('Should say in plain words that the ticket has not changed', async () => {
      workspace = makeWorkareaWorkspace()
      await fromTicket(['EUDPA-210'])

      const run = await fromTicketAsText(['EUDPA-210', '--check'])

      expect(run.stdout).toBe(
        `EUDPA-210 has not changed in Jira since ${WORKAREA} was written.`
      )
    })

    test('Should say no workarea holds the ticket, before asking Jira anything', async () => {
      workspace = makeWorkareaWorkspace()

      const run = await fromTicket(['EUDPA-210', '--check'])

      expect(run.exitCode).toBe(USAGE)
      expect(envelopeOf(run).errors[0]).toEqual({
        code: 'NOT_FOUND',
        message:
          'No workarea holds EUDPA-210. Run tim backlog from-ticket EUDPA-210 first.'
      })
      expect(atlassian().requests).toEqual([])
    })
  })

  describe('a workarea that is already there', () => {
    test('Should refuse a workarea with a built row, naming it and the row, before asking Jira anything', async () => {
      workspace = makeWorkareaWorkspace({
        backlogs: {
          'shared/eudpa-210-old': backlogOf(
            row({ id: 'inc-001', status: 'done' })
          )
        }
      })

      const run = await fromTicket(['EUDPA-210'])

      expect(run.exitCode).toBe(ERROR)
      expect(envelopeOf(run).errors[0].message).toBe(
        'shared/eudpa-210-old already has built rows for EUDPA-210 (inc-001), so fetching the ticket again would put it out of step with them.'
      )
      expect(atlassian().requests).toEqual([])
    })

    test('Should refuse two workareas that match the key, naming both and --workarea, before asking Jira anything', async () => {
      workspace = makeWorkareaWorkspace({
        folders: ['eudpa-210-first', 'eudpa-210-second']
      })

      const run = await fromTicket(['EUDPA-210'])

      expect(run.exitCode).toBe(ERROR)
      expect(envelopeOf(run).errors[0].message).toBe(
        'More than one workarea holds EUDPA-210: shared/eudpa-210-first, shared/eudpa-210-second. Name the one you mean with --workarea.'
      )
      expect(atlassian().requests).toEqual([])
    })

    test('Should write into the workarea it is told to when two match', async () => {
      workspace = makeWorkareaWorkspace({
        folders: ['eudpa-210-first', 'eudpa-210-second']
      })

      const run = await fromTicket([
        'EUDPA-210',
        '--workarea',
        'shared/eudpa-210-second'
      ])

      expect(envelopeOf(run).result).toMatchObject({
        workarea: 'shared/eudpa-210-second',
        branch: 'feat/EUDPA-210-second'
      })
      expect(
        readFileSync(
          join(
            workspace.root,
            'workareas',
            'shared',
            'eudpa-210-second',
            'sources',
            'ticket-eudpa-210.md'
          ),
          'utf8'
        )
      ).toContain('# EUDPA-210: ')
    })
  })

  test('Should refuse a key that is not a Jira key before asking Jira anything', async () => {
    workspace = makeWorkareaWorkspace()

    const run = await fromTicket(['not-a-key'])

    expect(run.exitCode).toBe(USAGE)
    expect(envelopeOf(run).errors[0].message).toBe(
      'Give a Jira ticket key, such as EUDPA-123.'
    )
    expect(atlassian().requests).toEqual([])
  })
})
