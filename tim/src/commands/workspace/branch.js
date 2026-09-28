import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  REPOS,
  repoPath,
  isWorkspaceBranchSynced,
  workspaceSyncSkipLine
} from '../../constants/repos.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { run } from '../../exec/exec.js'
import { runAcross } from '../../exec/parallel.js'
import { OK, USAGE, ERROR, PARTIAL_FAILURE } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'
import { lastLines } from './_task-output.js'
import { resolveBranch } from './branch-resolver.js'

const SCHEMA_VERSION = 1
const DEFAULT_BRANCH_FALLBACK = 'main'
const REF_SEPARATOR = '\t'

const collect = (value, previous) => previous.concat([value])

/**
 * Split the repo roster into the ones this run should touch and the ones
 * it should leave alone — a repo opts out via `workspaceBranchSync: false`
 * unless `include` names it explicitly.
 *
 * @param {string[]} [include]
 * @returns {{targets: string[], skipped: string[]}}
 */
export const partitionSyncTargets = (include = []) => {
  const included = new Set(include)
  const targets = []
  const skipped = []
  for (const repo of REPOS) {
    if (isWorkspaceBranchSynced(repo) || included.has(repo)) targets.push(repo)
    else skipped.push(repo)
  }
  return { targets, skipped }
}

const nonEmptyLines = (stdout = '') =>
  stdout.split('\n').filter((line) => line.trim().length > 0)

const stripOriginPrefix = (name) => name.replace(/^origin\//, '')

const readLocalRefs = async (dir) => {
  const result = await run('git', [
    '-C',
    dir,
    'for-each-ref',
    `--format=%(refname:short)${REF_SEPARATOR}%(worktreepath)`,
    'refs/heads'
  ])
  return nonEmptyLines(result.stdout).map((line) => {
    const [name, worktreePath = ''] = line.split(REF_SEPARATOR)
    return { name, worktreePath }
  })
}

const readRemoteNames = async (dir) => {
  const result = await run('git', [
    '-C',
    dir,
    'for-each-ref',
    '--format=%(refname:short)',
    'refs/remotes/origin'
  ])
  return nonEmptyLines(result.stdout)
    .filter((name) => name !== 'origin/HEAD')
    .map(stripOriginPrefix)
}

const readDefaultBranch = async (dir) => {
  const result = await run('git', [
    '-C',
    dir,
    'symbolic-ref',
    '--short',
    'refs/remotes/origin/HEAD'
  ])
  return stripOriginPrefix(result.stdout.trim()) || DEFAULT_BRANCH_FALLBACK
}

const readCurrentBranch = async (dir) => {
  const result = await run('git', ['-C', dir, 'branch', '--show-current'])
  return result.stdout.trim() || null
}

const countUncommitted = async (dir) => {
  const result = await run('git', ['-C', dir, 'status', '--porcelain'])
  return nonEmptyLines(result.stdout).length
}

const fetchAll = async (repos) => {
  const results = await Promise.all(
    repos
      .filter(({ cloned }) => cloned)
      .map(async ({ repo, dir }) => {
        const result = await run('git', [
          '-C',
          dir,
          'fetch',
          '--prune',
          '--quiet',
          'origin'
        ])
        return { repo, ok: result.exitCode === 0 }
      })
  )
  return new Set(results.filter(({ ok }) => !ok).map(({ repo }) => repo))
}

const inspectRepo = async ({ repo, dir, cloned }, fetchFailed) => {
  if (!cloned) {
    return {
      repo,
      dir,
      cloned,
      fetchFailed,
      names: [],
      localRefs: [],
      current: null,
      defaultBranch: DEFAULT_BRANCH_FALLBACK,
      uncommitted: 0
    }
  }

  const [localRefs, remoteNames, defaultBranch, current, uncommitted] =
    await Promise.all([
      readLocalRefs(dir),
      readRemoteNames(dir),
      readDefaultBranch(dir),
      readCurrentBranch(dir),
      countUncommitted(dir)
    ])

  return {
    repo,
    dir,
    cloned,
    fetchFailed,
    names: [...new Set([...localRefs.map(({ name }) => name), ...remoteNames])],
    localRefs,
    current,
    defaultBranch,
    uncommitted
  }
}

const inspectAll = async (workspaceRoot, { withFetch, repoNames }) => {
  const repos = repoNames.map((repo) => {
    const dir = repoPath(workspaceRoot, repo)
    return { repo, dir, cloned: existsSync(join(dir, '.git')) }
  })
  const fetchFailures = withFetch ? await fetchAll(repos) : new Set()
  return Promise.all(
    repos.map((entry) => inspectRepo(entry, fetchFailures.has(entry.repo)))
  )
}

const targetFor = ({ names, defaultBranch }, branch) =>
  names.includes(branch) ? branch : defaultBranch

const worktreeHolding = ({ localRefs }, target) =>
  localRefs.find(({ name }) => name === target)?.worktreePath || null

const hasLocalRef = ({ localRefs }, target) =>
  localRefs.some(({ name }) => name === target)

// A branch that exists only on the remote must be created with an explicit
// --track start-point. A bare `checkout -b` would branch from the current
// HEAD and silently diverge from the remote branch of the same name.
const checkoutArgs = (inspection, target) =>
  hasLocalRef(inspection, target)
    ? ['checkout', target]
    : ['checkout', '-b', target, '--track', `origin/${target}`]

const stashIfDirty = async ({ dir, uncommitted }, target) => {
  if (uncommitted === 0) return { ok: true, stashed: false }
  const result = await run('git', [
    '-C',
    dir,
    'stash',
    'push',
    '-u',
    '-m',
    `tim: switching to ${target}`
  ])
  return result.exitCode === 0
    ? { ok: true, stashed: true }
    : {
        ok: false,
        stashed: false,
        exitCode: result.exitCode,
        stderrTail: lastLines(result.stderr)
      }
}

// The tree has not moved, so popping straight back is safe. If the pop
// itself fails the stash stays put and the caller reports it.
const restoreStash = async (dir, stashed) => {
  if (!stashed) return false
  const pop = await run('git', ['-C', dir, 'stash', 'pop'])
  return pop.exitCode === 0
}

const applyToRepo = async (inspection, branch, { dryRun }) => {
  const { repo, dir, cloned, current, fetchFailed, uncommitted } = inspection
  const base = {
    repo,
    from: current,
    fetchFailed,
    uncommitted,
    stashed: false,
    worktreePath: null,
    exitCode: 0,
    stderrTail: null,
    ok: true
  }

  if (!cloned) return { ...base, target: null, action: 'skipped' }

  const target = targetFor(inspection, branch)
  const action = target === branch ? 'switched' : 'to-default'

  if (current === target) return { ...base, target, action: 'already-on' }

  const worktreePath = worktreeHolding(inspection, target)
  if (worktreePath) {
    return { ...base, target, action: 'in-worktree', worktreePath }
  }

  if (dryRun) return { ...base, target, action }

  const stash = await stashIfDirty(inspection, target)
  if (!stash.ok) {
    return {
      ...base,
      target,
      action: 'stash-failed',
      exitCode: stash.exitCode,
      stderrTail: stash.stderrTail,
      ok: false
    }
  }

  const checkout = await run('git', [
    '-C',
    dir,
    ...checkoutArgs(inspection, target)
  ])
  if (checkout.exitCode !== 0) {
    const restored = await restoreStash(dir, stash.stashed)
    return {
      ...base,
      target,
      action: 'checkout-failed',
      stashed: stash.stashed && !restored,
      exitCode: checkout.exitCode,
      stderrTail: lastLines(checkout.stderr),
      ok: false
    }
  }

  return { ...base, target, action, stashed: stash.stashed }
}

const toReportRow = ({ repo, cloned, current, uncommitted }) => ({
  repo,
  cloned,
  branch: current,
  uncommitted
})

const namesByRepo = (inspections) =>
  inspections
    .filter(({ cloned }) => cloned)
    .map(({ repo, names }) => ({ repo, names }))

// runAcross folds the whole inspection back in as `item`; drop it so the
// JSON envelope carries the result rather than every branch name we read.
const toRepoResult = ({ item, durationMs, ...result }) =>
  result.action
    ? result
    : {
        repo: item?.repo ?? null,
        from: null,
        target: null,
        action: 'failed',
        fetchFailed: false,
        uncommitted: 0,
        stashed: false,
        worktreePath: null,
        exitCode: null,
        stderrTail: result.error ?? null,
        ok: false
      }

// A full branch name that exists in no repo yet: under --dry-run it is a
// branch being planned, so report where it would need creating. A bare
// ticket reference that matches nothing stays not-found.
const isPlannedBranch = (resolution) =>
  resolution.kind === 'not-found' && !resolution.ticket

const plannedResult =
  (branch) =>
  ({ repo, cloned, current, uncommitted, defaultBranch }) => ({
    repo,
    from: current,
    target: cloned ? branch : null,
    action: cloned ? 'would-create' : 'skipped',
    base: cloned ? defaultBranch : null,
    fetchFailed: false,
    uncommitted,
    stashed: false,
    worktreePath: null,
    exitCode: 0,
    stderrTail: null,
    ok: true
  })

/**
 * Report every repo's current branch, or resolve `input` to a branch and
 * check it out across the workspace.
 *
 * @param {string} workspaceRoot
 * @param {{input?: string, dryRun?: boolean, include?: string[]}} [options]
 * @returns {Promise<object>} A discriminated result — `report`, `applied`, `ambiguous` or `not-found`
 */
export const runBranch = async (
  workspaceRoot,
  { input, dryRun = false, include = [] } = {}
) => {
  const { targets, skipped } = partitionSyncTargets(include)
  const inspections = await inspectAll(workspaceRoot, {
    withFetch: Boolean(input),
    repoNames: targets
  })

  if (!input) {
    return { kind: 'report', repos: inspections.map(toReportRow), skipped }
  }

  const resolution = resolveBranch(input, namesByRepo(inspections))
  if (dryRun && isPlannedBranch(resolution)) {
    return {
      kind: 'applied',
      branch: input,
      ticket: null,
      dryRun,
      planned: true,
      repos: inspections.map(plannedResult(input)),
      skipped
    }
  }
  if (resolution.kind !== 'resolved') return resolution

  const results = await runAcross(inspections, (inspection) =>
    applyToRepo(inspection, resolution.branch, { dryRun })
  )
  return {
    kind: 'applied',
    branch: resolution.branch,
    ticket: resolution.ticket,
    dryRun,
    repos: results.map(toRepoResult),
    skipped
  }
}

const padded = (rows) => {
  const width = Math.max(...rows.map(({ repo }) => repo.length))
  return (repo) => repo.padEnd(width)
}

const branchCounts = (rows) =>
  Object.entries(
    Object.groupBy(
      rows.filter(({ cloned, branch }) => cloned && branch),
      ({ branch }) => branch
    )
  ).sort(([, left], [, right]) => right.length - left.length)

const renderDrift = (rows) => {
  const counts = branchCounts(rows)
  if (counts.length === 0) return 'No repos are cloned.'
  if (counts.length === 1) return `Every repo is on ${counts[0][0]}.`
  return [
    'Branches differ across repos:',
    ...counts.map(([branch, group]) => `  ${branch} — ${group.length} repos`)
  ].join('\n')
}

const renderSkipFooter = (skipped = []) =>
  skipped.length === 0 ? [] : ['', ...skipped.map(workspaceSyncSkipLine)]

const renderReportText = ({ repos, skipped }) => {
  const pad = padded(repos)
  const lines = repos.map(({ repo, cloned, branch, uncommitted }) => {
    if (!cloned) return `  ${pad(repo)}  (not cloned)`
    const dirt = uncommitted > 0 ? ` — ${uncommitted} uncommitted` : ''
    return `  ${pad(repo)}  ${branch ?? '(detached)'}${dirt}`
  })
  return [...lines, '', renderDrift(repos), ...renderSkipFooter(skipped)].join(
    '\n'
  )
}

const ACTION_TEXT = {
  skipped: () => 'not cloned',
  'already-on': ({ target }) => `already on ${target}`,
  switched: ({ from }) => `switched from ${from ?? 'a detached head'}`,
  'to-default': ({ target }) => `no such branch — moved to ${target}`,
  'in-worktree': ({ target, worktreePath }) =>
    `${target} is checked out at ${worktreePath}`,
  'stash-failed': () => 'FAILED to stash uncommitted work',
  'checkout-failed': ({ exitCode }) => `FAILED (exit ${exitCode})`,
  failed: () => 'FAILED',
  'would-create': ({ target, base }) =>
    `no ${target} yet — would need creating from ${base}`
}

const ACTION_TONE = {
  skipped: 'gray',
  'already-on': 'green',
  switched: 'green',
  'to-default': 'yellow',
  'in-worktree': 'yellow',
  'stash-failed': 'red',
  'checkout-failed': 'red',
  failed: 'red',
  'would-create': 'yellow'
}

const MOVING_ACTIONS = new Set(['switched', 'to-default'])

/**
 * One repo's outcome as display text plus a tone, shared by the plain-text
 * renderer and the Ink screen so the two cannot drift apart.
 *
 * @param {object} result
 * @param {boolean} [dryRun]
 * @returns {{text: string, tone: string}}
 */
export const describeRepoOutcome = (result, dryRun = false) => {
  const { stashed, fetchFailed, uncommitted, action } = result
  const wouldStash = dryRun && uncommitted > 0 && MOVING_ACTIONS.has(action)
  const suffixes = [
    wouldStash ? `would stash ${uncommitted} changes` : null,
    stashed ? 'work stashed' : null,
    fetchFailed ? 'fetch failed, used local refs' : null
  ].filter(Boolean)
  const suffix = suffixes.length > 0 ? ` (${suffixes.join('; ')})` : ''
  return {
    text: `${ACTION_TEXT[action](result)}${suffix}`,
    tone: ACTION_TONE[action]
  }
}

const renderRepoLine = (pad, result, dryRun) => {
  const { repo, stderrTail } = result
  const tail = stderrTail ? `\n    ${stderrTail.replace(/\n/g, '\n    ')}` : ''
  return `  ${pad(repo)}  ${describeRepoOutcome(result, dryRun).text}${tail}`
}

export const stashedRepos = (repos) =>
  repos.filter(({ stashed }) => stashed).map(({ repo }) => repo)

export const appliedHeading = ({ branch, ticket, dryRun, planned }) => {
  const named = `${branch}${ticket ? ` (${ticket})` : ''}`
  if (planned) {
    return `Dry run — ${branch} is not in any repo yet. Nothing changed.`
  }
  return dryRun
    ? `Dry run — would switch to ${named}. Nothing changed.`
    : `Switched to ${named}`
}

export const STASH_RECOVERY_HINT =
  'Run `git -C repos/<repo> stash pop` to bring it back.'

const renderStashFooter = (repos) => {
  const stashed = stashedRepos(repos)
  if (stashed.length === 0) return []
  return ['', `Work stashed in: ${stashed.join(', ')}`, STASH_RECOVERY_HINT]
}

const renderAppliedText = (outcome) => {
  const { dryRun, repos, skipped } = outcome
  const pad = padded(repos)
  return [
    appliedHeading(outcome),
    '',
    ...repos.map((result) => renderRepoLine(pad, result, dryRun)),
    ...(dryRun ? [] : renderStashFooter(repos)),
    ...renderSkipFooter(skipped)
  ].join('\n')
}

const renderAmbiguousText = ({ ticket, candidates }) =>
  [
    `${ticket} matches ${candidates.length} branches:`,
    '',
    ...candidates.map(
      ({ branch, repos }) => `  ${branch}\n    ${repos.join(', ')}`
    ),
    '',
    'Run again with the full branch name.'
  ].join('\n')

export const notFoundMessage = ({ input, ticket }) =>
  ticket
    ? `Can't find a branch for ${ticket} in any repo.`
    : `Can't find a branch called "${input}", and it is not a ticket reference.`

const envelope = (timVersion, { ok, result, errors = [] }) =>
  JSON.stringify({
    ok,
    schema_version: SCHEMA_VERSION,
    tim_version: timVersion,
    result,
    errors,
    metadata: { ranAt: new Date().toISOString() }
  })

const renderJson = (outcome, timVersion) => {
  if (outcome.kind === 'report') {
    return envelope(timVersion, {
      ok: true,
      result: {
        mode: 'report',
        repos: outcome.repos,
        skipped: outcome.skipped ?? []
      }
    })
  }

  if (outcome.kind === 'applied') {
    return envelope(timVersion, {
      ok: outcome.repos.every(({ ok }) => ok),
      result: {
        mode: 'applied',
        branch: outcome.branch,
        ticket: outcome.ticket,
        dryRun: outcome.dryRun,
        planned: Boolean(outcome.planned),
        repos: outcome.repos,
        skipped: outcome.skipped ?? []
      }
    })
  }

  if (outcome.kind === 'ambiguous') {
    return envelope(timVersion, {
      ok: false,
      result: {
        mode: 'ambiguous',
        ticket: outcome.ticket,
        candidates: outcome.candidates
      },
      errors: [
        {
          code: 'USAGE',
          message: `${outcome.ticket} matches ${outcome.candidates.length} branches. Run again with the full branch name.`
        }
      ]
    })
  }

  return envelope(timVersion, {
    ok: false,
    result: null,
    errors: [{ code: 'NOT_FOUND', message: notFoundMessage(outcome) }]
  })
}

export const renderOutcomeText = (outcome) => {
  if (outcome.kind === 'report') return renderReportText(outcome)
  if (outcome.kind === 'applied') return renderAppliedText(outcome)
  if (outcome.kind === 'ambiguous') return renderAmbiguousText(outcome)
  return notFoundMessage(outcome)
}

const exitCodeFor = (outcome) => {
  if (outcome.kind === 'ambiguous') return USAGE
  if (outcome.kind === 'not-found') return ERROR
  if (outcome.kind === 'applied' && outcome.repos.some(({ ok }) => !ok)) {
    return PARTIAL_FAILURE
  }
  return OK
}

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

export const register = (parent, { timVersion }) => {
  parent
    .command('branch')
    .argument(
      '[nameOrTicket]',
      'Branch name, or a ticket reference such as EUDPA-249. Omit to report current branches.'
    )
    .description(
      'Check out a matching branch in every repo. Repos without it move to their default branch.'
    )
    .option('--dry-run', 'Show what would change without touching any repo')
    .option(
      '--include <repo>',
      'Also report or switch a repo that normally sits out of workspace-wide branch switches (such as the plants prototype). Repeatable.',
      collect,
      []
    )
    .action(async function branchAction(nameOrTicket, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await runBranch(workspaceRoot, {
          input: nameOrTicket,
          dryRun: Boolean(opts.dryRun),
          include: opts.include
        })

        const unresolved =
          outcome.kind === 'ambiguous' || outcome.kind === 'not-found'
        if (globalOpts.json) emit(renderJson(outcome, timVersion))
        else if (unresolved) emitError(renderOutcomeText(outcome))
        else emit(renderOutcomeText(outcome))

        process.exit(exitCodeFor(outcome))
      } catch (error) {
        if (isTimError(error) && globalOpts.json) {
          emit(
            envelope(timVersion, {
              ok: false,
              result: null,
              errors: [{ code: error.code, message: error.message }]
            })
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(
          isTimError(error) && error.code === 'USAGE' ? USAGE : ERROR
        )
      }
    })
}
