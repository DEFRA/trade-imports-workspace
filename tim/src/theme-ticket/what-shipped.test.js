import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import nock from 'nock'
import { afterEach, describe, expect, test } from 'vitest'
import {
  acceptsComment,
  acceptsCommentEdit,
  commentReads,
  mockJiraForEachTest
} from '../test-support/jira-mock.js'
import { recordUnmatchedRequests } from '../test-support/http-mock.js'
import {
  postWhatShippedComment,
  renderWhatShippedComment
} from './what-shipped.js'

const derivedTwoDomains = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('__fixtures__/derived-two-domains.json', import.meta.url)
    ),
    'utf8'
  )
)

const KEY = 'EUDPA-9'
const WORKAREA = 'shared/eudpa-9'
const FLOW = 'live-animals/journey-flow/spec.md'
const TRANSPORTER = 'live-animals/journey-pages/transporter-type/spec.md'
const PLANTS_FLOW = 'plants/journey-flow/spec.md'

const jira = mockJiraForEachTest()

let root

afterEach(() => root && rmSync(root, { recursive: true, force: true }))

const onBranch = (derived, branch) => ({
  ...derived,
  branch,
  domains: Object.fromEntries(
    Object.entries(derived.domains).map(([name, domain]) => [
      name,
      {
        ...domain,
        files: domain.files.map((file) => ({
          ...file,
          url: file.url.replace('/blob/main/', `/blob/${branch}/`)
        }))
      }
    ])
  )
})

const specUrl = (branch, path) =>
  `https://github.com/DEFRA/trade-imports-workspace/blob/${branch}/openspec/specs/${path}`

const workarea = ({ ticket, derived }) => {
  root = mkdtempSync(join(tmpdir(), 'tim-what-shipped-'))
  const dir = join(root, 'workareas', WORKAREA)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'backlog.json'),
    JSON.stringify({ ticket, repos: {} })
  )
  const derivedFile = join(dir, 'derived.json')
  writeFileSync(derivedFile, JSON.stringify(derived))
  return { workspaceRoot: root, workarea: WORKAREA, derivedFile }
}

const jiraComment = (id, body) => ({
  id,
  author: { displayName: 'Sam' },
  created: '2026-11-01T09:00:00.000+0000',
  body
})

describe('#renderWhatShippedComment', () => {
  test('Should list each domain with its count and each scenario linked to its spec file on the derived branch', () => {
    const feature = onBranch(derivedTwoDomains, 'feat/EUDPA-9-example')

    expect(renderWhatShippedComment(feature)).toBe(
      [
        'h4. What shipped',
        '4 scenarios in 2 domains, each linked to its specification.',
        'h5. Live animals journey (2 scenarios)',
        `* [Choosing the commercial transporter type opens its details form without error|${specUrl('feat/EUDPA-9-example', TRANSPORTER)}]`,
        `* [A page opened from Overview has the same address as from any other start, plus only the mark that it was opened from Overview|${specUrl('feat/EUDPA-9-example', FLOW)}]`,
        'h5. High-risk plants journey (2 scenarios)',
        `* [The commodities list goes on to origin once a commodity line is saved|${specUrl('feat/EUDPA-9-example', PLANTS_FLOW)}]`,
        `* [A task link carries only the mark that the page was opened from Overview|${specUrl('feat/EUDPA-9-example', PLANTS_FLOW)}]`
      ].join('\n')
    )
  })

  test('Should link to main when the derived theme points at main', () => {
    const links =
      renderWhatShippedComment(derivedTwoDomains).match(/\|(https:[^\]]+)\]/g)

    expect(links).toEqual([
      `|${specUrl('main', TRANSPORTER)}]`,
      `|${specUrl('main', FLOW)}]`,
      `|${specUrl('main', PLANTS_FLOW)}]`,
      `|${specUrl('main', PLANTS_FLOW)}]`
    ])
  })

  test('Should keep a heading’s brackets and bars from breaking its link', () => {
    const derived = {
      domains: {
        plants: {
          title: 'Plants',
          scenarios: [{ heading: 'A [odd] | heading', file: PLANTS_FLOW }],
          files: [{ path: PLANTS_FLOW, url: 'https://example.invalid/p' }]
        }
      }
    }

    expect(renderWhatShippedComment(derived).split('\n').at(-1)).toBe(
      '* [A odd heading|https://example.invalid/p]'
    )
  })

  test('Should say one scenario in the singular', () => {
    const derived = {
      domains: {
        plants: {
          title: 'Plants',
          scenarios: [{ heading: 'Only one', file: PLANTS_FLOW }],
          files: [{ path: PLANTS_FLOW, url: 'https://example.invalid/p' }]
        }
      }
    }

    expect(renderWhatShippedComment(derived).split('\n').slice(0, 3)).toEqual([
      'h4. What shipped',
      '1 scenario in 1 domain, each linked to its specification.',
      'h5. Plants (1 scenario)'
    ])
  })
})

describe('#postWhatShippedComment', () => {
  test('Should post the comment when the ticket has none, and touch nothing else on the ticket', async () => {
    const args = workarea({ ticket: KEY, derived: derivedTwoDomains })
    const body = renderWhatShippedComment(derivedTwoDomains)
    const posted = jiraComment('10500', body)
    commentReads(jira, KEY, { before: [], after: [posted] })
    const sent = acceptsComment(jira, KEY, posted)
    const unmatched = recordUnmatchedRequests()

    const result = await postWhatShippedComment({ ...args, confirm: true })

    expect({
      mode: result.mode,
      sent: sent.body,
      unmatched,
      pending: nock.pendingMocks()
    }).toEqual({
      mode: 'commented',
      sent: { body },
      unmatched: [],
      pending: []
    })
  })

  test('Should edit the earlier what-shipped comment when the links have changed, and post no second one', async () => {
    const args = workarea({ ticket: KEY, derived: derivedTwoDomains })
    const earlier = jiraComment(
      '10500',
      renderWhatShippedComment(
        onBranch(derivedTwoDomains, 'feat/EUDPA-9-example')
      )
    )
    const body = renderWhatShippedComment(derivedTwoDomains)
    const edited = { ...earlier, body }
    commentReads(jira, KEY, { before: [earlier], after: [edited] })
    const sent = acceptsCommentEdit(jira, KEY, '10500', edited)

    const result = await postWhatShippedComment({ ...args, confirm: true })

    expect({
      mode: result.mode,
      id: result.comment.id,
      sent: sent.body
    }).toEqual({ mode: 'edited', id: '10500', sent: { body } })
  })

  test('Should leave the ticket alone when its what-shipped comment already says the same', async () => {
    const args = workarea({ ticket: KEY, derived: derivedTwoDomains })
    const current = jiraComment(
      '10500',
      renderWhatShippedComment(derivedTwoDomains)
    )
    commentReads(jira, KEY, { before: [current] })

    const result = await postWhatShippedComment({ ...args, confirm: true })

    expect(result.mode).toBe('unchanged')
  })

  test('Should refuse a ticket with two what-shipped comments, naming both, and write nothing', async () => {
    const args = workarea({ ticket: KEY, derived: derivedTwoDomains })
    const body = renderWhatShippedComment(derivedTwoDomains)
    commentReads(jira, KEY, {
      before: [jiraComment('10500', body), jiraComment('10600', body)]
    })

    await expect(
      postWhatShippedComment({ ...args, confirm: true })
    ).rejects.toMatchObject({
      message:
        'tim theme-ticket comment: EUDPA-9 has 2 what-shipped comments (10500, 10600). Delete all but one in Jira, then run this again.'
    })
  })

  test('Should refuse a backlog that names no ticket before any request', async () => {
    const args = workarea({ ticket: undefined, derived: derivedTwoDomains })

    await expect(postWhatShippedComment(args)).rejects.toMatchObject({
      code: 'USAGE',
      message: expect.stringContaining('names no ticket')
    })
  })

  test('Should read the ticket’s comments on a dry run, send no write and return the text', async () => {
    const args = workarea({ ticket: KEY, derived: derivedTwoDomains })
    commentReads(jira, KEY, { before: [] })

    const result = await postWhatShippedComment(args)

    expect(result).toEqual({
      mode: 'dry-run',
      key: KEY,
      body: renderWhatShippedComment(derivedTwoDomains)
    })
  })
})
