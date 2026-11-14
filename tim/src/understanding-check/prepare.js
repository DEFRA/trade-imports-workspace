import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { createJiraClient } from '../clients/jira-client.js'
import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../review/store.js'
import {
  bestPracticesBundle,
  loadRoutingForBundles
} from './best-practices-bundle.js'
import { alternative, rawOutput } from './jq-values.js'
import { analysisFilePath, checkFilePaths, checkFolder } from './paths.js'
import {
  rawFolder,
  readPullRequests,
  selectPullRequests
} from './pull-requests.js'
import { redactDiff } from './redact.js'

export const DEFAULT_MAX_DIFF_BYTES = 200000

const fetchTicket = async (ticket) => {
  try {
    return await createJiraClient().getTicket(ticket, { withRendered: true })
  } catch (error) {
    throw new TimError(
      error.code ?? 'NETWORK',
      `Error: Failed to fetch ticket ${ticket}`,
      error
    )
  }
}

const ticketFields = (issue) => ({
  key: rawOutput(issue.id),
  summary: rawOutput(issue.summary),
  type: rawOutput(issue.type),
  status: rawOutput(issue.status),
  description: rawOutput(
    alternative(issue.renderedDescription, 'No description')
  )
})

const ticketMarkdown = ({ key, summary, type, status, description }) =>
  `# ${key}: ${summary}

## Metadata
- **Type:** ${type}
- **Status:** ${status}

## Description

${description}
`

const readHeadSha = (rawDir, repo) => {
  const path = join(rawDir, `${repo}.sha`)
  return existsSync(path) ? readFileSync(path, 'utf8').replace(/\n+$/, '') : ''
}

const cutToBytes = (diff, maxDiffBytes) =>
  diff.length > maxDiffBytes
    ? { diff: diff.subarray(0, maxDiffBytes), truncated: true }
    : { diff, truncated: false }

const analysisPlaceholder = ({ repo, ticket, pr, commit }) => ({
  repo,
  ticket,
  pr,
  commit,
  verdict: null,
  completed_at: null,
  changeSummary: null,
  whyItChanged: null,
  keyDesignDecisions: [],
  edgeCases: [],
  failureModes: [],
  securityRisks: [],
  dataOrApiChanges: [],
  testCoverageNotes: [],
  aiSuspectedRegions: []
})

const seedAnalysis = (checkDir, placeholder) => {
  const path = analysisFilePath(checkDir, placeholder.repo)
  if (!existsSync(path)) writeJsonAtomic(path, placeholder)
}

const prepareRepo = ({ context, pullRequest }) => {
  const { workspaceRoot, checkDir, rawDir, ticketKey, maxDiffBytes } = context
  const repo = pullRequest.repository.name
  const { number, state, url } = pullRequest
  context.log(`Processing ${repo}#${number} (${state})...`)
  const commit = readHeadSha(rawDir, repo)
  const rawDiffPath = join(rawDir, `${repo}.diff`)
  if (!existsSync(rawDiffPath)) {
    context.log(`  Failed to fetch diff for ${repo}#${number}`)
    return null
  }
  const { diff, truncated } = cutToBytes(
    readFileSync(rawDiffPath),
    maxDiffBytes
  )
  if (truncated) {
    context.log(`  Truncated diff to ${maxDiffBytes} bytes (coverage gap)`)
  }
  const redacted = redactDiff(diff.toString('utf8'))
  writeFileSync(join(checkDir, '.diffs', `${repo}.diff`), redacted.text)
  if (redacted.count > 0) {
    context.log(`  Redacted ${redacted.count} match(es) in ${repo}.diff`)
  }
  writeFileSync(
    join(checkDir, 'best-practices', `${repo}.md`),
    bestPracticesBundle({ workspaceRoot, routing: context.routing, repo })
  )
  seedAnalysis(
    checkDir,
    analysisPlaceholder({ repo, ticket: ticketKey, pr: number, commit })
  )
  return {
    metaEntry: { repo, pr: number, state, commit, url, truncated },
    redactions: redacted.count
  }
}

const oversizedDiffGap = ({ repo }) => ({
  kind: 'oversized_diff',
  repo,
  note: 'diff truncated at --max-diff-bytes'
})

const preparedSummary = ({ ticket, checkDir, selected }) => [
  '',
  '=== Understanding-check workspace ready ===',
  `Ticket: ${ticket.key}`,
  `Summary: ${ticket.summary}`,
  `Directory: ${checkDir}`,
  '',
  'Created:',
  '  ✓ ticket.md',
  '  ✓ .interview-meta.json (verdict: null)',
  ...selected.flatMap(({ repository: { name } }) => [
    `  ✓ .diffs/${name}.diff (redacted)`,
    `  ✓ best-practices/${name}.md`,
    `  ✓ analysis.${name}.json (placeholder)`
  ]),
  '',
  'Next: spawn one ANALYST per repo (see SKILL.md Step 2).'
]

const metaFor = ({ ticket, now, prepared }) => {
  const entries = prepared.map(({ metaEntry }) => metaEntry)
  const redactedRepos = prepared.filter(({ redactions }) => redactions > 0)
  return {
    ticket: ticket.key,
    summary: ticket.summary,
    type: ticket.type,
    status: ticket.status,
    created_at: now,
    prs: entries,
    verdict: null,
    verdict_reason: null,
    completed_at: null,
    redaction_summary: {
      matches: prepared.reduce(
        (total, { redactions }) => total + redactions,
        0
      ),
      files: redactedRepos.length
    },
    coverage_gaps: entries
      .filter(({ truncated }) => truncated)
      .map(oversizedDiffGap)
  }
}

/**
 * Prepares a ticket's check from Jira and what `gh` saved in the raw
 * folder: writes `ticket.md`, each selected pull request's diff cut to
 * `maxDiffBytes` and redacted, each repo's best-practices bundle and
 * analysis placeholder, then `.interview-meta.json`, and removes the raw
 * folder. A pull request with no saved diff is left out. Progress goes to
 * `log`; the redaction count goes to `warn`, never the matched text.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @param {number} args.maxDiffBytes
 * @param {string} args.now - The time to stamp as `created_at`
 * @param {(line: string) => void} args.log
 * @param {(line: string) => void} args.warn
 * @returns {Promise<object>} The meta written
 * @throws {TimError} When Jira cannot give the ticket, or the raw folder holds no pull requests
 */
export const prepareCheck = async ({
  workspaceRoot,
  ticket,
  maxDiffBytes,
  now,
  log,
  warn
}) => {
  const checkDir = checkFolder(workspaceRoot, ticket)
  const rawDir = rawFolder(checkDir)
  log('Creating understanding-check workspace...')
  mkdirSync(join(checkDir, '.diffs'), { recursive: true })
  mkdirSync(join(checkDir, 'best-practices'), { recursive: true })

  log('Fetching ticket details...')
  const ticketDetails = ticketFields(await fetchTicket(ticket))
  log('Writing ticket.md...')
  writeFileSync(join(checkDir, 'ticket.md'), ticketMarkdown(ticketDetails))

  log('Finding PRs...')
  const selected = selectPullRequests(readPullRequests(checkDir, ticket))
  const context = {
    workspaceRoot,
    checkDir,
    rawDir,
    ticketKey: ticketDetails.key,
    maxDiffBytes,
    routing: loadRoutingForBundles(workspaceRoot, warn),
    log
  }
  const prepared = selected
    .map((pullRequest) => prepareRepo({ context, pullRequest }))
    .filter((result) => result !== null)

  const meta = metaFor({ ticket: ticketDetails, now, prepared })
  if (meta.redaction_summary.matches > 0) {
    warn(
      `redacted: ${meta.redaction_summary.matches} matches across ${meta.redaction_summary.files} files`
    )
  }
  writeJsonAtomic(checkFilePaths(checkDir).meta, meta)
  rmSync(rawDir, { recursive: true, force: true })
  preparedSummary({ ticket: ticketDetails, checkDir, selected }).forEach(log)
  return meta
}

/**
 * The byte limit `--max-diff-bytes` gives.
 *
 * @param {string | undefined} given
 * @returns {number}
 * @throws {TimError} USAGE when it is not a whole number of bytes
 */
export const maxDiffBytesOf = (given) => {
  if (given === undefined) return DEFAULT_MAX_DIFF_BYTES
  if (!/^\d+$/.test(given)) {
    throw new TimError(
      'USAGE',
      `Error: --max-diff-bytes must be a whole number of bytes, not ${given}`
    )
  }
  return Number(given)
}
