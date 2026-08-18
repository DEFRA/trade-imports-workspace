const TICKET_PREFIX = 'EUDPA'
const TICKET_REF_PATTERN = new RegExp(`^(?:${TICKET_PREFIX}-)?(\\d+)$`, 'i')

/**
 * Normalise a branch argument into a ticket reference, or null when it
 * isn't one. Accepts `EUDPA-249`, `eudpa-249` and a bare `249`.
 *
 * @param {string} input
 * @returns {string|null}
 */
export const parseTicketRef = (input = '') => {
  const match = input.trim().match(TICKET_REF_PATTERN)
  return match ? `${TICKET_PREFIX}-${match[1]}` : null
}

/**
 * Whether a branch name carries the given ticket reference. Prefix-agnostic
 * (`feat/`, `spike/`, or no prefix at all) but boundary-guarded, so
 * `EUDPA-35` does not match `EUDPA-351`.
 *
 * @param {string} branchName
 * @param {string} ticket
 * @returns {boolean}
 */
export const matchesTicket = (branchName, ticket) =>
  new RegExp(`(^|[^A-Za-z0-9])${ticket}(?![0-9])`, 'i').test(branchName)

const matchingPairs = (repoBranches, ticket) =>
  repoBranches.flatMap(({ repo, names }) =>
    names
      .filter((name) => matchesTicket(name, ticket))
      .map((name) => ({ branch: name, repo }))
  )

const byRepoCountThenName = (left, right) =>
  right.repos.length - left.repos.length ||
  left.branch.localeCompare(right.branch)

const groupByBranch = (pairs) =>
  Object.entries(Object.groupBy(pairs, ({ branch }) => branch))
    .map(([branch, group]) => ({
      branch,
      repos: group.map(({ repo }) => repo)
    }))
    .sort(byRepoCountThenName)

const isLiteralHit = (repoBranches, input) =>
  repoBranches.some(({ names }) => names.includes(input))

/**
 * Resolve a branch argument against the branch names present across every
 * repo. Tries the literal name first, then falls back to matching a ticket
 * reference against every branch name in the workspace.
 *
 * Resolution is deliberately global rather than per repo: a ticket that maps
 * to a different branch name in each repo breaks cross-repo branch parity,
 * and surfacing that as ambiguity beats silently checking out divergent
 * branches.
 *
 * @param {string} input
 * @param {Array<{repo: string, names: string[]}>} repoBranches
 * @returns {{kind: 'resolved'|'ambiguous'|'not-found', branch?: string, ticket?: string|null, candidates?: Array<{branch: string, repos: string[]}>}}
 */
export const resolveBranch = (input, repoBranches) => {
  if (isLiteralHit(repoBranches, input)) {
    return { kind: 'resolved', branch: input, ticket: null }
  }

  const ticket = parseTicketRef(input)
  if (!ticket) return { kind: 'not-found', input, ticket: null }

  const candidates = groupByBranch(matchingPairs(repoBranches, ticket))
  if (candidates.length === 0) return { kind: 'not-found', input, ticket }
  if (candidates.length === 1) {
    return { kind: 'resolved', branch: candidates[0].branch, ticket }
  }
  return { kind: 'ambiguous', input, ticket, candidates }
}
