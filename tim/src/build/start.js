import { readJsonFile, writeJsonAtomic } from '../backlog/io.js'
import { nextBuildable, setRowFields } from '../backlog/shape.js'
import { backlogPathFor } from '../commands/backlog/rows.js'
import { readEnvelopeRepos } from './envelope-repos.js'
import { branchIncrementRepos } from './increment-branch.js'
import { ticketDescription, ticketSummary } from './ticket-description.js'

export const START_STEPS = ['derive', 'ticket', 'branch']

// The keys every programme once had to use. A backlog with exactly these keeps
// the rules written for them: `repo: both`, the tests repo added to every
// frontend change, and backend, tests, frontend as the merge order.
const LEGACY_KEYS = ['frontend', 'backend', 'tests']
const LEGACY_ORDER = ['backend', 'tests', 'frontend']

const CHORE_KINDS = new Set([
  'chore',
  'docs',
  'refactor',
  'test',
  'test-coverage',
  'test-infrastructure',
  'fixture'
])
const FIX_KINDS = new Set(['bug', 'fix'])
const SLUG_LIMIT = 40

class StepFailure extends Error {
  constructor(step, message) {
    super(message)
    this.step = step
  }
}

const fail = (step, message) => {
  throw new StepFailure(step, message)
}

const messageOf = (error) => error.message ?? String(error)

const branchTypeFor = (kind) => {
  if (FIX_KINDS.has(kind)) return 'fix'
  return CHORE_KINDS.has(kind) ? 'chore' : 'feat'
}

/**
 * The branch an increment builds on: `<type>/<KEY>-<slug>`, the type from the
 * row's kind and the slug from its title, cut to 40 characters.
 *
 * @param {{kind?: string, title: string}} row
 * @param {string} key - The increment's Jira key
 * @returns {string}
 */
export const branchNameFor = (row, key) => {
  const slug = String(row.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_LIMIT)
    .replace(/-+$/, '')
  return `${branchTypeFor(row.kind)}/${key}${slug ? `-${slug}` : ''}`
}

/**
 * Where an increment's lifecycle picks up, from what the backlog already
 * records and nothing else: never from the ticket's status, which people
 * move for reasons the loop cannot see.
 *
 * @param {{commit?: string, prs?: object[]}} row
 * @returns {'build'|'pr'|'ci'|'done'}
 */
export const resumePointFor = ({ commit, prs }) => {
  const list = Array.isArray(prs) ? prs : []
  if (list.length > 0) {
    return list.every((pr) => pr.merged === true) ? 'done' : 'ci'
  }
  return commit ? 'pr' : 'build'
}

const isLegacy = (keys) =>
  keys.length === LEGACY_KEYS.length &&
  LEGACY_KEYS.every((key) => keys.includes(key))

const legacyRepos = (row) => {
  if (Array.isArray(row.repos) && row.repos.length > 0) {
    const named = new Set(row.repos)
    if (named.has('frontend')) named.add('tests')
    return LEGACY_ORDER.filter((key) => named.has(key))
  }
  if (row.repo === 'both' || !row.repo) return [...LEGACY_ORDER]
  return LEGACY_ORDER.filter((key) => key === row.repo || key === 'tests')
}

const keyedRepos = (row, keys) => {
  if (Array.isArray(row.repos)) return [...row.repos]
  if (row.repo && row.repo !== 'both') return [row.repo]
  return [...keys]
}

/**
 * The repos an increment touches, in merge order. A row's `repos` is taken as
 * written; an older row's `repo` falls back. Under the frontend, backend and
 * tests keys the tests repo joins every frontend change, and the order is
 * backend, tests, frontend.
 *
 * @param {object} row
 * @param {string[]} keys - The backlog envelope's repo keys, in its order
 * @returns {string[]}
 */
export const incrementReposFor = (row, keys) =>
  isLegacy(keys) ? legacyRepos(row) : keyedRepos(row, keys)

const readRow = (path, id) => {
  const row = (readJsonFile(path).increments ?? []).find(
    (entry) => entry.id === id
  )
  if (!row) throw new Error(`Can't find ${id} in ${path}.`)
  return row
}

const recordOnRow = (path, id, changes) => {
  const { backlog, changed } = setRowFields({
    backlog: readJsonFile(path),
    id,
    changes
  })
  if (Object.keys(changed).length > 0) writeJsonAtomic(path, backlog)
}

const derive = ({ path, id, last }) => {
  let backlog
  try {
    backlog = readJsonFile(path)
  } catch (error) {
    fail('derive', messageOf(error))
  }
  const next = id ?? nextBuildable(backlog)
  if (next === null) return { id: null, repeat: false }
  if (!(backlog.increments ?? []).some((row) => row.id === next)) {
    fail('derive', `Can't find ${next} in ${path}.`)
  }
  return { id: next, repeat: next === last }
}

const recordTicket = ({ path, workarea, row, key, verb }) => {
  try {
    recordOnRow(path, row.id, { ticket: key })
  } catch (error) {
    fail(
      'ticket',
      `${verb} ${key} but could not record it on ${row.id}: ${messageOf(error)}. Record it with tim backlog set ${workarea} ${row.id} --ticket ${key} before anything runs again, or the next run raises a second ticket.`
    )
  }
}

// A create that times out may still have raised the ticket in Jira, and then
// its key was never recorded. So before raising one, look under the epic for
// an open ticket with this increment's exact summary, and reuse it.
const findRaisedEarlier = async ({ jira, config, summary }) => {
  const children = await jira.listOpenChildren(config.epic)
  return children.find((child) => child.summary === summary) ?? null
}

const raiseTicket = async ({ jira, path, workarea, row, config }) => {
  const summary = ticketSummary(row)
  const earlier = await findRaisedEarlier({ jira, config, summary })
  if (earlier) {
    recordTicket({ path, workarea, row, key: earlier.key, verb: 'Found' })
    return {
      key: earlier.key,
      created: false,
      warning: `${earlier.key} under ${config.epic} already has this increment's summary, probably raised by an attempt that died before it recorded the key. It was reused, not raised again.`
    }
  }
  let created
  try {
    created = await jira.createIssue({
      project: { key: config.project },
      summary,
      description: ticketDescription({ workarea, row }),
      issuetype: { name: 'Task' },
      priority: { name: 'Medium' },
      labels: [],
      parent: { key: config.epic }
    })
  } catch (error) {
    fail(
      'ticket',
      `Raising the ticket failed: ${messageOf(error)} Jira may have raised it anyway. Check ${config.project} under ${config.epic} for a ticket titled "${summary}" before running again: the next run looks for exactly that and reuses it rather than raising a second.`
    )
  }
  recordTicket({ path, workarea, row, key: created.key, verb: 'Raised' })
  return { key: created.key, created: true, warning: null }
}

const describeTransitions = (transitions) =>
  transitions.length === 0
    ? 'none'
    : transitions.map(({ name, to }) => `${name} -> ${to}`).join(', ')

// Status names are compared as exact strings: a board's statuses say nothing
// about the order its workflow runs in.
const setWorkingStatus = async ({ jira, key, status, config, id }) => {
  if (status === config.inDevStatus) return { status, warning: null }
  if (status === config.doneStatus) {
    return {
      status,
      warning: `${key} is already ${status}, but ${id} is not done in the backlog. A human needs to look at that mismatch.`
    }
  }
  const transitions = await jira.listTransitions(key)
  const move = transitions.find(({ to }) => to === config.inDevStatus)
  if (!move) {
    fail(
      'ticket',
      `${key} is ${status} and offers no transition to "${config.inDevStatus}". The board offers (transition -> status): ${describeTransitions(transitions)}. Fix jiraInDevStatus in the args.`
    )
  }
  await jira.transitionIssue(key, move.id)
  return { status: config.inDevStatus, warning: null }
}

const ticketStep = async ({ jira, path, workarea, id, config }) => {
  const row = readRow(path, id)
  const raised = row.ticket
    ? { key: row.ticket, created: false, warning: null }
    : await raiseTicket({ jira, path, workarea, row, config })
  const { key, created } = raised
  let found
  try {
    found = await jira.getTicket(key)
  } catch (error) {
    fail('ticket', `${key} is the ticket on ${id}, but ${messageOf(error)}`)
  }
  const { status, warning } = await setWorkingStatus({
    jira,
    key,
    status: found.status,
    config,
    id
  })
  await jira.moveToBoard(config.board, [key])
  return {
    key,
    created,
    status,
    movedToBoard: true,
    warnings: [raised.warning, warning].filter(Boolean)
  }
}

const branchFor = (path, id, key) => {
  const row = readRow(path, id)
  if (row.branch) return row.branch
  const name = branchNameFor(row, key)
  recordOnRow(path, id, { branch: name })
  return name
}

// A row that names no repos takes every configured one, in the order the
// caller's repo keys give (the loop's args), not the envelope's.
const reposFor = (row, envelope, repoOrder) => {
  const keys = envelope.map((repo) => repo.key)
  const wanted = incrementReposFor(row, repoOrder ?? keys)
  const unknown = wanted.filter((key) => !keys.includes(key))
  if (unknown.length > 0) {
    fail(
      'branch',
      `${row.id} names ${unknown.join(', ')}, which the backlog envelope's repos do not.`
    )
  }
  return wanted.map((key) => envelope.find((repo) => repo.key === key))
}

const stepReached = (result) => {
  if (result.ticket) return 'branch'
  return result.id ? 'ticket' : 'derive'
}

const emptyResult = (workarea, id) => ({
  workarea,
  id,
  repeat: false,
  ticket: null,
  branch: null,
  repos: null,
  resumeAt: null,
  branched: [],
  warnings: [],
  failedStep: null,
  reason: null
})

const runSteps = async (result, context) => {
  const { workspaceRoot, workarea, path, base, config } = context
  Object.assign(result, derive(context))
  if (!result.id || result.repeat) return result

  try {
    result.ticket = await ticketStep({
      jira: context.jira(),
      path,
      workarea,
      id: result.id,
      config
    })
  } catch (error) {
    if (error instanceof StepFailure) throw error
    fail('ticket', messageOf(error))
  }
  result.warnings = result.ticket.warnings
  result.branch = branchFor(path, result.id, result.ticket.key)
  const row = readRow(path, result.id)
  result.resumeAt = resumePointFor(row)

  const repos = reposFor(
    row,
    readEnvelopeRepos(workspaceRoot, workarea),
    config.repoOrder
  )
  result.repos = repos.map((repo) => repo.key)
  const branched = await branchIncrementRepos({
    repos,
    branch: result.branch,
    base
  })
  result.branched = branched.repos
  if (!branched.ok) fail('branch', branched.reason)
  return result
}

/**
 * Start an increment: derive it (or take the one named), give it a Jira
 * ticket on the board in the working status, and put its repos on its branch.
 * Each step is safe to run again: a ticket or branch already on the row is
 * reused, and a raised ticket is recorded on the row before anything else, so
 * a retry never raises a second one. A failure names its step and its exact
 * reason, and the result keeps whatever the earlier steps did.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {string} [args.id] - Build this increment rather than the next buildable one
 * @param {string} [args.last] - The increment the previous attempt built: met again, it stops before the ticket
 * @param {string} args.base - The branch a new increment branch is cut from
 * @param {{project: string, epic: string, inDevStatus: string, doneStatus: string, board: number, repoOrder?: string[]}} args.config - repoOrder is the configured repo keys in order, the fallback for a row that names none
 * @param {() => object} args.jira - Makes the Jira client, only once a ticket is needed
 * @returns {Promise<object>} id (null when nothing is buildable), repeat, ticket, branch, repos, resumeAt, branched, warnings, failedStep and reason
 */
export const runBuildStart = async ({
  workspaceRoot,
  workarea,
  id,
  last,
  base,
  config,
  jira
}) => {
  const path = backlogPathFor(workspaceRoot, workarea)
  const result = emptyResult(workarea, id ?? null)
  try {
    return await runSteps(result, {
      workspaceRoot,
      workarea,
      path,
      id,
      last,
      base,
      config,
      jira
    })
  } catch (error) {
    const step = error instanceof StepFailure ? error.step : stepReached(result)
    return { ...result, failedStep: step, reason: messageOf(error) }
  }
}
