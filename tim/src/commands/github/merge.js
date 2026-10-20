import { setTimeout as delay } from 'node:timers/promises'
import { z } from 'zod'
import { createGithubClient } from '../../clients/github-client.js'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { resolveGithubToken } from '../auth.js'
import { makeRunAction } from '../_run-action.js'
import { summariseChecks } from './checks.js'
import { repoNameSchema } from './shared.js'

const MERGE_METHODS = ['squash', 'merge', 'rebase']
const MERGEABLE_ATTEMPTS = 5
const DEFAULT_MERGEABLE_POLL_MS = 2000
const SHORT_SHA_LENGTH = 7

const PR_NUMBER_MESSAGE = 'Give the PR number, for example 51.'

const argsSchema = z.object({
  repo: repoNameSchema,
  number: z.coerce
    .number({ error: PR_NUMBER_MESSAGE })
    .int(PR_NUMBER_MESSAGE)
    .positive(PR_NUMBER_MESSAGE),
  method: z
    .enum(MERGE_METHODS, {
      error: 'Give --method as squash, merge or rebase.'
    })
    .optional(),
  deleteBranch: z.boolean().optional().default(false),
  mergeablePollMs: z
    .number()
    .nonnegative()
    .optional()
    .default(DEFAULT_MERGEABLE_POLL_MS)
})

/**
 * Validate `merge`'s arguments before any request is sent.
 *
 * @param {object} input
 * @returns {{repo: string, number: number, method?: string, deleteBranch: boolean, mergeablePollMs: number}}
 * @throws {TimError} USAGE naming the first malformed argument
 */
export const parseMergeArgs = (input) => {
  const result = argsSchema.safeParse(input)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const settledMergeState = async (client, { repo, number, pollMs }) => {
  const poll = async (attempt) => {
    const pr = await client.getPrMergeState(repo, number)
    const settled = pr.state !== 'open' || pr.mergeable !== null
    if (settled || attempt >= MERGEABLE_ATTEMPTS) return pr
    await delay(pollMs)
    return poll(attempt + 1)
  }
  return poll(1)
}

const chooseMethod = (requested, allowed) => {
  if (requested) {
    return allowed.includes(requested)
      ? { method: requested, reason: null }
      : {
          method: null,
          reason: `The repo does not allow ${requested} merges. It allows: ${allowed.join(', ')}.`
        }
  }
  const preferred = MERGE_METHODS.find((method) => allowed.includes(method))
  return preferred
    ? { method: preferred, reason: null }
    : { method: null, reason: 'The repo allows no merge method.' }
}

const namesWithOutcome = (checks, outcome) =>
  checks.filter((check) => check.outcome === outcome).map((check) => check.name)

const checksReason = (summary) => {
  if (summary.outcome === 'passed') return null
  const { passed, failed, pending } = summary.counts
  const failedNames = namesWithOutcome(summary.checks, 'failed')
  const pendingNames = namesWithOutcome(summary.checks, 'pending')
  return [
    `Not every check has passed on ${summary.sha.slice(0, SHORT_SHA_LENGTH)}: ${passed} passed, ${failed} failed, ${pending} pending.`,
    ...(failedNames.length ? [`Failed: ${failedNames.join(', ')}.`] : []),
    ...(pendingNames.length ? [`Pending: ${pendingNames.join(', ')}.`] : [])
  ].join(' ')
}

const mergeabilityReasons = (pr) => [
  ...(pr.draft ? ['The PR is a draft.'] : []),
  ...(pr.mergeable === false || pr.mergeableState === 'dirty'
    ? [`The PR has merge conflicts with ${pr.baseRef}.`]
    : []),
  ...(pr.mergeable === null
    ? [
        'GitHub has not yet worked out whether the PR can merge. Try again in a minute.'
      ]
    : []),
  ...(pr.mergeableState === 'blocked'
    ? [
        'Branch protection blocks the merge, for example a review is still needed. tim does not bypass branch protection.'
      ]
    : [])
]

const behindReason = (pr, behindBy) =>
  behindBy > 0
    ? `The PR is ${behindBy} commit${behindBy === 1 ? '' : 's'} behind ${pr.baseRef}. Update the branch and wait for its checks.`
    : null

const refusalsFor = async (client, pr, requestedMethod) => {
  const [behindBy, listing, allowed] = await Promise.all([
    client.commitsBehindBase(pr.repo, pr.baseRef, pr.headSha),
    client.listChecks(pr.repo, pr.headSha),
    client.allowedMergeMethods(pr.repo)
  ])
  const { method, reason: methodReason } = chooseMethod(
    requestedMethod,
    allowed
  )
  const reasons = [
    ...mergeabilityReasons(pr),
    behindReason(pr, behindBy),
    checksReason(summariseChecks(listing)),
    methodReason
  ].filter(Boolean)
  return { method, reasons }
}

const resultOf = (pr, fields) => ({
  repo: pr.repo,
  number: pr.number,
  url: pr.url,
  branch: pr.headRef,
  method: null,
  sha: null,
  branchDeleted: false,
  reasons: [],
  ...fields
})

const withBranchDeleted = async (client, result, { deleteBranch }) =>
  deleteBranch
    ? {
        ...result,
        branchDeleted: await client.deleteBranch(result.repo, result.branch)
      }
    : result

const mergeOpenPr = async (client, pr, { method: requestedMethod }) => {
  if (pr.state !== 'open') {
    return resultOf(pr, {
      status: 'refused',
      reasons: ['The PR is closed and was not merged.']
    })
  }
  const { method, reasons } = await refusalsFor(client, pr, requestedMethod)
  if (reasons.length > 0) {
    return resultOf(pr, { status: 'refused', method, reasons })
  }
  const merge = await client.mergePr(pr.repo, pr.number, {
    method,
    sha: pr.headSha
  })
  return merge.merged
    ? resultOf(pr, { status: 'merged', method, sha: merge.sha })
    : resultOf(pr, { status: 'refused', method, reasons: [merge.reason] })
}

/**
 * `tim github merge`'s full behaviour. Merges a PR only when it is open,
 * free of conflicts and branch protection blocks, up to date with its base,
 * and every check on its head commit has passed. An already-merged PR
 * returns its merge commit and changes nothing but the optional branch
 * deletion.
 *
 * @param {object} input - The raw arguments, validated by `parseMergeArgs`
 * @returns {Promise<object>} repo, number, url, branch, status (`merged`, `already-merged` or `refused`), method, sha, branchDeleted and reasons
 * @throws {TimError} USAGE for a bad argument, before any request
 */
export const runMerge = async (input) => {
  const { repo, number, method, deleteBranch, mergeablePollMs } =
    parseMergeArgs(input)
  const client = createGithubClient({ token: await resolveGithubToken() })
  const pr = await settledMergeState(client, {
    repo,
    number,
    pollMs: mergeablePollMs
  })
  const result = pr.merged
    ? resultOf(pr, { status: 'already-merged', sha: pr.mergeCommitSha })
    : await mergeOpenPr(client, pr, { method })
  return result.status === 'refused'
    ? result
    : withBranchDeleted(client, result, { deleteBranch })
}

/**
 * @param {{status: string}} result
 * @returns {number} 1 when the merge was refused, otherwise 0
 */
export const exitCodeForMerge = ({ status }) =>
  status === 'refused' ? ERROR : OK

const branchLine = ({ branch, branchDeleted }) =>
  branchDeleted ? [`Deleted branch ${branch}.`] : []

const RENDER_BY_STATUS = {
  merged: (result) => [
    `Merged ${result.repo} #${result.number} by ${result.method} as ${result.sha}.`,
    ...branchLine(result)
  ],
  'already-merged': (result) => [
    `${result.repo} #${result.number} was already merged as ${result.sha}.`,
    ...branchLine(result)
  ],
  refused: (result) => [
    `Did not merge ${result.repo} #${result.number}:`,
    ...result.reasons.map((reason) => `  - ${reason}`)
  ]
}

export const renderMerge = (result) =>
  RENDER_BY_STATUS[result.status](result).join('\n')

export const register = (gh, { timVersion }) => {
  gh.command('merge <repo> <prNumber>')
    .description(
      'Merge a pull request once it is open, up to date with its base and every check has passed'
    )
    .option(
      '--method <method>',
      'squash, merge or rebase. Defaults to squash when the repo allows it'
    )
    .option(
      '--delete-branch',
      'Delete the PR branch after the merge has succeeded'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim github merge trade-imports-animals-frontend 51',
        '  tim github merge trade-imports-animals-frontend 51 --method merge --delete-branch --json',
        '',
        'It refuses, and says why, when the PR is closed, a draft, has conflicts,',
        'is behind its base, is blocked by branch protection, or has a check that',
        'has not passed. It never bypasses branch protection. It exits 0 when the',
        'PR is merged or was already merged, and 1 when it refused.',
        'Running it on a merged PR prints the merge commit and changes nothing.'
      ].join('\n')
    )
    .action(
      makeRunAction({
        run: ({ args }, opts) =>
          runMerge({
            repo: args[0],
            number: args[1],
            method: opts.method,
            deleteBranch: opts.deleteBranch
          }),
        renderText: renderMerge,
        exitCodeForResult: exitCodeForMerge,
        timVersion
      })
    )
}
