import { renderItemsTable } from '../items-table.js'

const NOT_DONE = 'Not Done'
const SEVERITIES = ['Critical', 'Major', 'Minor']
const BLOCKING_SEVERITIES = ['Critical', 'Major']
export const APPROVED = 'APPROVED'

const isAbsent = (value) =>
  value === null || value === undefined || value === false

const orDefault = (value, fallback) => (isAbsent(value) ? fallback : value)

const isUnwalked = (item) =>
  item.disposition === null || item.disposition === undefined

const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0)

/**
 * The text after the first `**Notes:**` line's label in a review index,
 * or empty when there is none.
 *
 * @param {string} indexText - review-index.md
 * @returns {string}
 */
export const notesOf = (indexText) => {
  const line = indexText
    .split('\n')
    .find((candidate) => candidate.startsWith('**Notes:**'))
  return line === undefined ? '' : line.replace(/^\*\*Notes:\*\*\s*/, '')
}

/**
 * Whether an item is still open: Not Done, or nobody has walked it.
 *
 * @param {object} item
 * @returns {boolean}
 */
export const isOpenItem = (item) => isUnwalked(item) || item.status === NOT_DONE

/**
 * @param {object[]} items
 * @returns {number}
 */
export const openItemCount = (items) => items.filter(isOpenItem).length

/**
 * A repo's verdict from its own items: FAIL while a Critical or Major item
 * is open, APPROVED WITH CHANGES while only Minor ones are, else APPROVED.
 *
 * @param {object[]} items
 * @returns {'FAIL' | 'APPROVED WITH CHANGES' | 'APPROVED'}
 */
export const repoVerdict = (items) => {
  const open = items.filter(isOpenItem)
  if (open.some((item) => BLOCKING_SEVERITIES.includes(item.severity))) {
    return 'FAIL'
  }
  return open.length > 0 ? 'APPROVED WITH CHANGES' : APPROVED
}

const joinedForSentence = (refs) =>
  refs.length === 1
    ? refs[0]
    : `${refs.slice(0, -1).join(', ')} and ${refs.at(-1)}`

/**
 * A pull request's verdict line: its own verdict, then the other pull
 * requests in the ticket that are not APPROVED, named as possible
 * blockers.
 *
 * @param {string} ownVerdict - From {@link repoVerdict}
 * @param {string[]} blockers - GitHub references such as `DEFRA/repo#12`
 * @returns {string}
 */
export const verdictLine = (ownVerdict, blockers) => {
  if (blockers.length === 0) return ownVerdict
  const named = joinedForSentence(blockers)
  return ownVerdict === 'FAIL'
    ? `FAIL. Also potentially blocked by ${named}.`
    : `${ownVerdict}, potentially blocked by ${named}. Merge this PR with caution.`
}

const statusKey = (item) =>
  isUnwalked(item)
    ? 'Not walked'
    : `${orDefault(item.status, '—')} / ${item.disposition}`

const statusRows = (items) => {
  const counts = new Map()
  for (const item of items) {
    const key = statusKey(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort(([left], [right]) => byCodePoint(left, right))
    .sort(([, left], [, right]) => right - left)
    .map(([key, count]) => `| ${key} | ${count} |`)
}

const severityRows = (items) =>
  SEVERITIES.map((severity) => {
    const ofSeverity = items.filter((item) => item.severity === severity)
    return {
      severity,
      open: openItemCount(ofSeverity),
      total: ofSeverity.length
    }
  })
    .filter(({ total }) => total > 0)
    .map(({ severity, open, total }) => `| ${severity} | ${open} | ${total} |`)

const itemCountSentence = (count, itemsFileName) =>
  count === 1
    ? `_1 item in this repo. Its issue, what it must satisfy and the commit that closed it are in \`${itemsFileName}\`._`
    : `_${count} items in this repo. Each one, with its issue, what it must satisfy and the commit that closed it, is in \`${itemsFileName}\`._`

/**
 * One repo's items as counts: a status and disposition table, a severity
 * table of open and total, and the items file that holds the detail.
 *
 * @param {object[]} items
 * @param {string} itemsFileName - `items.<repo>.json`
 * @returns {string[]} The lines
 */
export const itemCountLines = (items, itemsFileName) => [
  '| Status | Items |',
  '|---|---|',
  ...statusRows(items),
  '',
  '| Severity | Open | Total |',
  '|---|---|---|',
  ...severityRows(items),
  '',
  itemCountSentence(items.length, itemsFileName)
]

const headLines = ({ headSha, readSha, unreviewedWords }) =>
  headSha === '' || headSha === readSha
    ? []
    : [
        `**PR head:** \`${headSha}\`. The commits after \`${readSha}\` are counted below by the items they closed, but have not been ${unreviewedWords}.`
      ]

const commitLines = ({ reviewedSha, reReviewedSha, headSha }) => {
  if (reReviewedSha !== null) {
    return [
      ...(reviewedSha === ''
        ? []
        : [`**First reviewed at:** \`${reviewedSha}\``]),
      `**Re-reviewed at:** \`${reReviewedSha}\``,
      ...headLines({
        headSha,
        readSha: reReviewedSha,
        unreviewedWords: 're-reviewed'
      })
    ]
  }
  if (reviewedSha === '') return []
  return [
    `**Reviewed at:** \`${reviewedSha}\``,
    ...headLines({ headSha, readSha: reviewedSha, unreviewedWords: 'reviewed' })
  ]
}

const titleLine = ({ ticket, branch, reReviewedSha }) => {
  if (reReviewedSha !== null) return `# Code re-review — ${ticket}`
  return branch === null
    ? `# Code review — ${ticket}`
    : `# Code review handoff — ${ticket}`
}

const headerLines = (args) => [
  titleLine(args),
  '',
  ...(args.verdict === '' ? [] : [`**Verdict:** ${args.verdict}`]),
  ...(args.notes === '' ? [] : [`**Notes:** ${args.notes}`]),
  `**Reviewer:** @${args.reviewer}`,
  ...commitLines(args),
  ...(args.branch === null
    ? []
    : [`**Handoff branch:** \`${args.branch}\` (workspace repo)`]),
  ''
]

const detailLines = ({
  ticket,
  repo,
  items,
  summary,
  hasSummaryFile,
  branch
}) => {
  if (items !== null && summary) {
    return [...itemCountLines(items, `items.${repo}.json`), '']
  }
  if (items !== null) return [renderItemsTable(items), '']
  if (hasSummaryFile && branch === null) {
    return [
      `_See \`workareas/reviews/${ticket}/review.${repo}.md\` in the reviewer's workspace._`,
      ''
    ]
  }
  if (hasSummaryFile) {
    return [`_See \`review.${repo}.md\` on the handoff branch._`, '']
  }
  return []
}

const allDoneLine = ({ items, summary }) => {
  if (!summary) {
    return 'All tracked **Fix** items for this repo are **Done** on this branch (see the Status and Notes columns above). **Merged** rows are sub-findings folded into those Fix items.'
  }
  const everyFixDone =
    'Every **Fix** item for this repo is **Done** on this branch.'
  return items.some((item) => item.disposition === 'Merged')
    ? `${everyFixDone} **Merged** items are sub-findings folded into those Fix items.`
    : everyFixDone
}

const statusLine = ({ ticket, items, summary }) => {
  if (items === null) {
    return `_Review detail: \`workareas/reviews/${ticket}/\` on the author's machine._`
  }
  const open = openItemCount(items)
  return open === 0
    ? allDoneLine({ items, summary })
    : `**${open}** item(s) remain open. The author applies them on this PR branch; local tracker: \`workareas/reviews/${ticket}/\`.`
}

const commentOnlyFooterLines = (args) => [
  '## Status',
  '',
  statusLine(args),
  '',
  '---',
  '',
  `_Generated by the \`review\` skill (${args.ticket})._`
]

const handoffFooterLines = ({ ticket, branch }) => [
  '## Action this review',
  '',
  '**Option A — walk it in Claude Code (recommended):**',
  '',
  '```bash',
  '# Branch-scoped fetch — a bare `fetch origin` would also pull the',
  "# workspace repo's gh-pages (~1 GiB).",
  `git -C ~/git/defra/trade-imports-workspace fetch origin "+refs/heads/${branch}:refs/remotes/origin/${branch}"`,
  `git -C ~/git/defra/trade-imports-workspace checkout ${branch}`,
  '```',
  '',
  'Then in a Claude Code session opened at the workspace:',
  '',
  '```',
  `walk review ${ticket}`,
  `implement review ${ticket}`,
  '```',
  '',
  'The shared `items.{repo}.json` lives on this branch — your dispositions',
  `write back to the same file, so push your commits to \`${branch}\` to keep`,
  'the state in sync. The implementor will offer to clean up the local +',
  'remote branch when it finishes.',
  '',
  '**Option B — action manually:** read the items table above and apply',
  'each fix in your PR branch directly. No checkout needed.',
  '',
  '---',
  '',
  `_Generated by the \`review\` skill (${ticket}). Branch lifecycle is owned`,
  'by the implementor — it offers cleanup on completion._'
]

/**
 * One pull request's review comment, in markdown, ending with a newline.
 * A handoff (a `branch`) tells the author how to walk the review from the
 * branch; a comment-only post (`branch` null) says what is still open. A
 * re-review (a `reReviewedSha`) names the commit first reviewed and the
 * commit the latest re-review read.
 *
 * @param {object} args
 * @param {string} args.ticket
 * @param {string} args.repo
 * @param {string} args.verdict - From {@link verdictLine}; empty for none
 * @param {string} args.notes - The index's notes; empty for none
 * @param {string} args.reviewer - The login named as reviewer
 * @param {string} args.reviewedSha - The first 8 characters of the commit first reviewed; empty for none
 * @param {string | null} args.reReviewedSha - The first 8 characters of the commit the latest re-review read, or null for a review that is not a re-review
 * @param {string} args.headSha - The first 8 characters of the PR's head; empty for none
 * @param {string | null} args.branch - The handoff branch, or null for a comment-only post
 * @param {object[] | null} args.items - The repo's items, or null when it has no items file
 * @param {boolean} args.hasSummaryFile - Whether the repo has a review.<repo>.md
 * @param {boolean} args.summary - Counts in place of the full item table
 * @returns {string}
 */
export const shareBody = (args) =>
  `${[
    ...headerLines(args),
    `## Repository: \`${args.repo}\``,
    '',
    ...detailLines(args),
    ...(args.branch === null
      ? commentOnlyFooterLines(args)
      : handoffFooterLines(args))
  ].join('\n')}\n`
