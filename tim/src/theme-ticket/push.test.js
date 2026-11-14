import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { mockJiraForEachTest } from '../test-support/jira-mock.js'
import { pushDescription, renderPushText } from './push.js'

const ISSUE_PATH = '/rest/api/2/issue/EUDPA-9'
const DESCRIPTION = 'h2. Background\n\nOne paragraph on one line.\n'
const SUMMARY = 'The theme in one line'

const jira = mockJiraForEachTest()

let folder

afterEach(() => folder && rmSync(folder, { recursive: true, force: true }))

const ticketFolder = ({ key, summary, description = DESCRIPTION }) => {
  folder = mkdtempSync(join(tmpdir(), 'tim-theme-ticket-push-'))
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'description.txt'), description)
  if (key) {
    writeFileSync(join(folder, 'ticket.created.json'), JSON.stringify({ key }))
  }
  if (summary) {
    writeFileSync(join(folder, 'ticket.json'), JSON.stringify({ summary }))
  }
  return folder
}

const jiraHolds = ({ summary, description }) =>
  jira()
    .get(ISSUE_PATH)
    .reply(200, {
      key: 'EUDPA-9',
      fields: { summary, description, labels: [] }
    })

const jiraAcceptsUpdate = () => {
  const sent = { bodies: [] }
  jira()
    .put(ISSUE_PATH, (body) => {
      sent.bodies.push(body)
      return true
    })
    .reply(204)
  return sent
}

describe('#pushDescription dry run', () => {
  test('Should report the ticket, the description and the summary, and send nothing', async () => {
    const dir = ticketFolder({ key: 'EUDPA-9', summary: SUMMARY })

    const pushed = await pushDescription({ folder: dir })

    expect(renderPushText(pushed)).toBe(
      [
        'Ticket:      EUDPA-9',
        `Description: ${dir}/description.txt (3 lines)`,
        `Summary:     ${SUMMARY}`,
        '',
        'Dry run. Nothing sent. Add --confirm to send it.'
      ].join('\n')
    )
  })

  test('Should take the key given over the one ticket.created.json records', async () => {
    const dir = ticketFolder({ key: 'EUDPA-9' })

    const pushed = await pushDescription({ folder: dir, key: 'EUDPA-7' })

    expect(pushed.key).toBe('EUDPA-7')
  })
})

describe('#pushDescription refusals', () => {
  test('Should refuse a folder with no key, naming the manifest to create it from', async () => {
    const dir = ticketFolder({})

    await expect(pushDescription({ folder: dir })).rejects.toMatchObject({
      message: `tim theme-ticket push: no Jira key. Pass --key, or create the ticket first with:\n  tim jira create --from ${dir}/ticket.json`
    })
  })

  test('Should refuse a hard-wrapped description, naming the wrapped lines', async () => {
    const dir = ticketFolder({
      key: 'EUDPA-9',
      description: 'h2. Head\n\nWrapped here\nand here\n'
    })

    await expect(
      pushDescription({ folder: dir, confirm: true })
    ).rejects.toMatchObject({
      message: `tim theme-ticket push: ${dir}/description.txt looks hard-wrapped at these lines: 4 \nJira treats a single newline as a line break. Put each paragraph on one line.`
    })
  })

  test('Should refuse a description that uses {expand}', async () => {
    const dir = ticketFolder({
      key: 'EUDPA-9',
      description: 'h2. Head\n\n{expand:More}\n'
    })

    await expect(
      pushDescription({ folder: dir, confirm: true })
    ).rejects.toMatchObject({
      message: expect.stringContaining('description.txt uses {expand}.')
    })
  })

  test('Should refuse without a folder as a usage error', async () => {
    await expect(pushDescription({})).rejects.toMatchObject({
      code: 'USAGE',
      message: 'tim theme-ticket push: give a ticket folder'
    })
  })
})

describe('#pushDescription with confirm', () => {
  test('Should send the summary and the description in one update', async () => {
    const dir = ticketFolder({ key: 'EUDPA-9', summary: SUMMARY })
    jiraHolds({ summary: 'Old', description: 'Old' })
    const sent = jiraAcceptsUpdate()
    jiraHolds({ summary: SUMMARY, description: DESCRIPTION.trim() })

    const pushed = await pushDescription({ folder: dir, confirm: true })

    expect({ mode: pushed.mode, bodies: sent.bodies }).toEqual({
      mode: 'updated',
      bodies: [
        { fields: { summary: SUMMARY, description: DESCRIPTION.trim() } }
      ]
    })
  })

  test('Should send nothing and say so when Jira already holds both', async () => {
    const dir = ticketFolder({ key: 'EUDPA-9', summary: SUMMARY })
    jiraHolds({ summary: SUMMARY, description: DESCRIPTION.trim() })

    const pushed = await pushDescription({ folder: dir, confirm: true })

    expect(renderPushText(pushed).split('\n').at(-1)).toBe(
      'EUDPA-9 already holds those values. Nothing changed.'
    )
  })
})
