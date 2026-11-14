import { ERROR, OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { readSearchedPullRequests } from '../../review/prepare/gh-output.js'
import {
  prepareLocalReview,
  preparedLocalReviewText
} from '../../review/prepare/prepare-local.js'
import {
  prepareReview,
  preparedReviewText,
  reviewIdOf
} from '../../review/prepare/prepare.js'
import {
  freshStartText,
  reviewStartMode,
  startFreshReview
} from '../../review/prepare/start.js'
import { reviewDir } from '../../review/paths.js'
import { buildRefreshScope } from '../../review/refresh/scope.js'
import {
  selectPullRequests,
  selectedText
} from '../../understanding-check/pull-requests.js'
import { errorPayloadFor, jsonEnvelope } from '../envelope.js'
import { makeRunAction } from '../_run-action.js'

const writeStdout = (text) => process.stdout.write(text)
const writeStdoutLine = (line) => process.stdout.write(`${line}\n`)
const writeStderrLine = (line) => process.stderr.write(`${line}\n`)
const ignore = () => {}

const stdoutFlushed = () =>
  new Promise((resolve) => process.stdout.write('', resolve))

const stampNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

const parseOptions = (opts) => ({
  ...opts,
  workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
})

const selectedToFetch = ({ workspaceRoot, ticket, branch }) =>
  selectPullRequests(
    readSearchedPullRequests({
      reviewFolder: reviewDir(workspaceRoot, reviewIdOf({ ticket, branch })),
      ticket,
      branch
    })
  )

const prepareLocal = async ({ workspaceRoot, repo, branch, files, json }) => {
  const prepared = await prepareLocalReview({
    workspaceRoot,
    repo,
    branch,
    fileList: files,
    now: stampNow(),
    log: json ? ignore : writeStdoutLine
  })
  await stdoutFlushed()
  return prepared
}

const prepareFromRaw = async (
  [ticket],
  { workspaceRoot, branch, desc, json }
) => {
  const prepared = await prepareReview({
    workspaceRoot,
    ticket,
    branch,
    description: desc,
    now: stampNow(),
    write: json ? ignore : writeStdout
  })
  await stdoutFlushed()
  return prepared
}

const runPrepare = async ([review, localBranch], options) => {
  if (options.select) {
    return {
      selected: selectedToFetch({
        workspaceRoot: options.workspaceRoot,
        ticket: review,
        branch: options.branch
      })
    }
  }
  const prepared = options.local
    ? await prepareLocal({ ...options, repo: review, branch: localBranch })
    : await prepareFromRaw([review], options)
  return options.json ? prepared.meta : { ...prepared, local: options.local }
}

const preparedText = (result) => {
  if (result.selected !== undefined) {
    return result.selected.length === 0 ? null : selectedText(result.selected)
  }
  return result.local
    ? preparedLocalReviewText(result)
    : preparedReviewText(result)
}

const registerPrepare = (review, { timVersion }) =>
  review
    .command('prepare')
    .argument('[review]', 'The ticket, or with --local the repo folder')
    .argument('[local-branch]', 'With --local, the branch to review')
    .description(
      "Prepare a review. For a ticket, or a branch's pull requests with --branch, it reads JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL, and what gh saved in the review's .raw folder: prs.json from gh search prs, then <repo>.json from gh pr view for each pull request --select prints (an open one over any other, then the newest, one per repo). It writes ticket.md, clones each pull request's merge commit (or head when open) into repos/, bakes the best-practices bundles, writes .review-meta.json, seeds a file review for each changed file .prs/<repo>-<pr>.json lists, and the per-repo stubs, then removes .raw. With --local it reviews a branch of a repo under repos/ with no ticket and no pull request: the files changed since the merge-base with origin/main, or exactly --files. With --json the result is the meta."
    )
    .option(
      '--branch <name>',
      "Review this branch's pull requests, not a ticket's"
    )
    .option('--desc <text>', "The branch review's description")
    .option('--local', 'Review <repo> <branch> under repos/ directly')
    .option(
      '--files <list>',
      'With --local, review exactly these comma-separated files'
    )
    .option(
      '--select',
      'Print the pull request to fetch for each repo, as <repo> <number>'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim review prepare EUDPA-1234 --select\n  tim review prepare EUDPA-1234\n  tim review prepare --branch feat/NO_JIRA-tidy --desc "Tidy the logs"\n  tim review prepare --local trade-imports-plants-prototype design/1-home --files app/views/home.html --json'
    )
    .action(
      makeRunAction({
        parseOptions,
        run: ({ args }, options) => runPrepare(args, options),
        renderText: preparedText,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const refreshResult = async ({ workspaceRoot, ticket }) => {
  try {
    return {
      mode: 'REFRESH',
      scope: await buildRefreshScope({
        workspaceRoot,
        reviewId: ticket,
        writeSnapshot: true,
        log: writeStderrLine
      })
    }
  } catch (error) {
    return { mode: 'REFRESH', error }
  }
}

const runStart = async ([review, localBranch], options) => {
  if (options.local) {
    if (!options.json) writeStdout('MODE: FRESH\n\n')
    const prepared = await prepareLocal({
      ...options,
      repo: review,
      branch: localBranch
    })
    return { mode: 'FRESH', local: true, prepared }
  }
  const { workspaceRoot } = options
  if (reviewStartMode({ workspaceRoot, ticket: review }) === 'REFRESH') {
    return refreshResult({ workspaceRoot, ticket: review })
  }
  return {
    mode: 'FRESH',
    ...startFreshReview({ workspaceRoot, ticket: review })
  }
}

const refreshEnvelope = ({ scope, error }, timVersion) =>
  error === undefined
    ? jsonEnvelope({ ok: true, result: scope, timVersion })
    : jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })

const startText = (started, timVersion) => {
  if (started.local) return preparedLocalReviewText(started.prepared)
  const body =
    started.mode === 'REFRESH'
      ? JSON.stringify(refreshEnvelope(started, timVersion))
      : freshStartText(started)
  return `MODE: ${started.mode}\n\n${body}`
}

const startJson = (started) => {
  if (started.local) return { mode: started.mode, meta: started.prepared.meta }
  if (started.error !== undefined) throw started.error
  return started
}

const registerStart = (review, { timVersion }) =>
  review
    .command('start')
    .argument('[review]', 'The ticket, or with --local the repo folder')
    .argument('[local-branch]', 'With --local, the branch to review')
    .description(
      "Start a review. The first line says MODE: REFRESH when the review already has review-index.md: it then pulls the review clones, writes the refresh snapshot and prints the scope as tim review refresh scope --json does. Otherwise it says MODE: FRESH, makes the review's .raw folder ready and names the gh command that fills it, for tim review prepare. With --local it says MODE: FRESH and runs tim review prepare --local."
    )
    .option('--local', 'Review <repo> <branch> under repos/ directly')
    .option(
      '--files <list>',
      'With --local, review exactly these comma-separated files'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim review start EUDPA-1234\n  tim review start --local trade-imports-plants-prototype design/1-home'
    )
    .action(
      makeRunAction({
        parseOptions,
        run: async ({ args }, options) => {
          const started = await runStart(args, options)
          return options.json ? startJson(started) : started
        },
        renderText: (started) => startText(started, timVersion),
        exitCodeForResult: (started) =>
          started.error === undefined ? OK : ERROR,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

/**
 * `tim review prepare` and `tim review start`.
 *
 * @param {import('commander').Command} review
 * @param {{timVersion: string}} options
 */
export const registerPrepareAndStart = (review, { timVersion }) => {
  registerPrepare(review, { timVersion })
  registerStart(review, { timVersion })
}
