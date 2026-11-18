import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const TEMPLATE_PATH =
  '.claude/skills/ticket-refiner/assets/refinement-template.md'

export const realReviewTemplate = () =>
  readFileSync(
    fileURLToPath(new URL(`../../../../../${TEMPLATE_PATH}`, import.meta.url)),
    'utf8'
  )

export const KEPT_REVIEW = '# Review in progress\n\nHalf written.\n'

const meta = (ticket, extra = {}) =>
  `${JSON.stringify(
    {
      ticket,
      summary: 'A ticket & its summary',
      type: 'Story',
      priority: 'Major',
      parent: 'EUDPA-50',
      labels: ['animals'],
      status: 'Refining',
      created: '2025-03-01T10:00:00Z',
      verdict: null,
      verdict_reason: null,
      completed_at: null,
      ...extra
    },
    null,
    2
  )}\n`

const refinementFile = (ticket, name) =>
  `workareas/ticket-refinement/${ticket}/${name}`

/**
 * The workspace files the refine goldens start from: the real review
 * template, a review in progress for EUDPA-103, and a meta for each
 * finalize case. EUDPA-201's meta has a verdict already and a key after
 * the verdict keys.
 */
export const refinementWorkareaFiles = () => ({
  [TEMPLATE_PATH]: realReviewTemplate(),
  [refinementFile('EUDPA-103', 'review.md')]: KEPT_REVIEW,
  [refinementFile('EUDPA-201', '.refinement-meta.json')]: meta('EUDPA-201', {
    verdict: 'NEEDS WORK',
    verdict_reason: 'No AC',
    completed_at: '2025-03-02T10:00:00Z',
    notes: 'kept'
  }),
  [refinementFile('EUDPA-202', '.refinement-meta.json')]: meta('EUDPA-202'),
  [refinementFile('EUDPA-203', '.refinement-meta.json')]: meta('EUDPA-203'),
  [refinementFile('EUDPA-204', '.refinement-meta.json')]: meta('EUDPA-204')
})

export const prepareCases = [
  { name: 'a ticket with comments and Confluence links', ticket: 'EUDPA-101' },
  { name: 'a ticket with no optional fields or comments', ticket: 'EUDPA-102' },
  {
    name: 'a ticket whose comments cannot be read, with a review in progress',
    ticket: 'EUDPA-103'
  },
  { name: 'a ticket Jira does not have', ticket: 'EUDPA-404' }
]

export const finalizeCases = [
  {
    name: 'READY with a reason, over an earlier verdict',
    ticket: 'EUDPA-201',
    args: ['--verdict', 'READY', '--reason', 'Clear AC, repos identified']
  },
  {
    name: 'NEEDS WORK with no reason',
    ticket: 'EUDPA-202',
    args: ['--verdict', 'NEEDS WORK']
  },
  {
    name: 'SPIKE REQUIRED with an empty reason',
    ticket: 'EUDPA-203',
    args: ['--verdict', 'SPIKE REQUIRED', '--reason', '']
  },
  {
    name: 'a lowercase verdict',
    ticket: 'EUDPA-204',
    args: ['--verdict', 'ready']
  },
  {
    name: 'a ticket with no refinement',
    ticket: 'EUDPA-299',
    args: ['--verdict', 'READY']
  }
]
