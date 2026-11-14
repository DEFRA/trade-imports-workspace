import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { TimError } from '../../errors.js'
import { styleDir } from '../../style/paths.js'
import {
  prepareLocalStyleReview,
  prepareStyleReview,
  preparedStyleText
} from '../../style/prepare.js'
import { bakeStyleBundle, styleTopicsOf } from '../../style/rules-bundle.js'
import { buildStyleScope, renderStyleScopeText } from '../../style/scope.js'
import { errorPayloadFor, jsonEnvelope } from '../envelope.js'
import { makeRunAction } from '../_run-action.js'

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

const styleAction = ({ run, renderText, exitCodeForResult, timVersion }) =>
  makeRunAction({
    parseOptions,
    run: ({ args }, options) => run(args, options),
    renderText,
    exitCodeForResult,
    exitCodeForError: () => ERROR,
    timVersion
  })

const prepareTicket = async ({ workspaceRoot, reviewId, json }) => {
  const prepared = prepareStyleReview({
    workspaceRoot,
    reviewId,
    now: stampNow(),
    log: json ? ignore : writeStdoutLine
  })
  await stdoutFlushed()
  return prepared
}

const prepareLocal = async ({ workspaceRoot, repo, branch, files, json }) => {
  const prepared = await prepareLocalStyleReview({
    workspaceRoot,
    repo,
    branch,
    fileList: files,
    now: stampNow(),
    log: json ? ignore : writeStdoutLine,
    reviewLog: writeStderrLine
  })
  await stdoutFlushed()
  return prepared
}

const runPrepare = async ([review, localBranch], options) => {
  const prepared = options.local
    ? await prepareLocal({ ...options, repo: review, branch: localBranch })
    : await prepareTicket({ ...options, reviewId: review })
  return options.json ? prepared.meta : prepared
}

const registerPrepare = (style, { timVersion }) =>
  style
    .command('prepare')
    .argument('[review]', 'The ticket, or with --local the repo folder')
    .argument('[local-branch]', 'With --local, the branch to review')
    .description(
      "Prepare a code style review under workareas/code-style-reviews/<review-id> from the ticket's review workspace, which tim review prepare writes first. Each file a pull request changes, as .prs/<repo>-<pr>.json lists it, that .claude/skills/code-style/assets/routing.json maps to a topic becomes a source file. It writes .style-meta.json, a .style.json placeholder for each source file with no verdict yet, and style-rules.<repo>.<topic>.md for each repo and topic. It refuses a pull request whose .prs/ file is missing, or lists no files when the pull request changes some. With --local it prepares the local review of <repo> <branch> under repos/ first, as tim review prepare --local does, printing its report on stderr. With --json the result is the meta."
    )
    .option('--local', 'Review <repo> <branch> under repos/ directly')
    .option(
      '--files <list>',
      'With --local, review exactly these comma-separated files'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim style prepare EUDPA-1234\n  tim style prepare --local trade-imports-plants-prototype design/1-home --files app/views/home.html --json'
    )
    .action(
      styleAction({
        run: runPrepare,
        renderText: preparedStyleText,
        timVersion
      })
    )

const registerScope = (style, { timVersion }) =>
  style
    .command('scope')
    .argument('[review-id]', 'A ticket key')
    .description(
      "Pull each review clone, then sort a style refresh's work into four lists per repo, over the window from the commit the last refresh saw to HEAD, keeping only files the code-style routing maps to a topic: A, changed files not resolved in a merge, with their items; B, open items in files that did not change; C, files hand-resolved in a merge, with their items; D, files the latest pull request changes with no style verdict. List D reads .prs/<repo>-<pr>.json in the review folder, which `gh api repos/DEFRA/<repo>/pulls/<pr>/files --paginate --slurp` writes; a missing one is left out with a warning. Prints a summary; --json gives the lists as result. --write-snapshot records the window in .style-meta.json."
    )
    .option('--repo <repo>', 'Only this repo')
    .option('--no-pull', 'Use the clones as they are')
    .option('--write-snapshot', 'Record the window in .style-meta.json')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style scope EUDPA-1234 --write-snapshot --json\n  tim style scope EUDPA-1234 --no-pull --repo trade-imports-stub'
    )
    .action(
      styleAction({
        run: ([reviewId], options) =>
          buildStyleScope({ ...options, reviewId, log: writeStderrLine }),
        renderText: renderStyleScopeText,
        timVersion
      })
    )

const styleStartMode = ({ workspaceRoot, ticket }) => {
  if (!ticket) {
    throw new TimError(
      'USAGE',
      'Usage: tim style start EUDPA-XXXXX [--no-pull] [--repo REPO] | --local <repo> <branch> [--files F1,F2,...]'
    )
  }
  return existsSync(join(styleDir(workspaceRoot, ticket), '.style-meta.json'))
    ? 'REFRESH'
    : 'FRESH'
}

const refreshResult = async ({ workspaceRoot, ticket, pull, repo }) => {
  try {
    return {
      mode: 'REFRESH',
      scope: await buildStyleScope({
        workspaceRoot,
        reviewId: ticket,
        repo,
        pull,
        writeSnapshot: true,
        log: writeStderrLine
      })
    }
  } catch (error) {
    return { mode: 'REFRESH', error }
  }
}

const freshResult = async (options, prepare) => {
  if (!options.json) process.stdout.write('MODE: FRESH\n\n')
  try {
    return { mode: 'FRESH', prepared: await prepare() }
  } catch (error) {
    return { mode: 'FRESH', error }
  }
}

const runStart = async ([review, localBranch], options) => {
  if (options.local) {
    return freshResult(options, () =>
      prepareLocal({ ...options, repo: review, branch: localBranch })
    )
  }
  const { workspaceRoot } = options
  if (styleStartMode({ workspaceRoot, ticket: review }) === 'REFRESH') {
    return refreshResult({ ...options, ticket: review })
  }
  return freshResult(options, () =>
    prepareTicket({ ...options, reviewId: review })
  )
}

const refreshEnvelope = ({ scope, error }, timVersion) =>
  error === undefined
    ? jsonEnvelope({ ok: true, result: scope, timVersion })
    : jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })

const startText = (started, timVersion) => {
  if (started.mode === 'REFRESH') {
    return `MODE: REFRESH\n\n${JSON.stringify(refreshEnvelope(started, timVersion))}`
  }
  return started.error === undefined
    ? preparedStyleText(started.prepared)
    : null
}

const startJson = (started) => {
  if (started.error !== undefined) throw started.error
  return started.mode === 'REFRESH'
    ? { mode: started.mode, scope: started.scope }
    : { mode: started.mode, meta: started.prepared.meta }
}

const registerStart = (style, { timVersion }) =>
  style
    .command('start')
    .argument('[review]', 'The ticket, or with --local the repo folder')
    .argument('[local-branch]', 'With --local, the branch to review')
    .description(
      'Start a code style review. The first line says MODE: REFRESH when the review already has .style-meta.json: it then pulls the review clones, writes the refresh snapshot and prints the scope as tim style scope --json does. Otherwise it says MODE: FRESH and prepares the review as tim style prepare does. With --local it says MODE: FRESH and runs tim style prepare --local.'
    )
    .option('--local', 'Review <repo> <branch> under repos/ directly')
    .option(
      '--files <list>',
      'With --local, review exactly these comma-separated files'
    )
    .option('--repo <repo>', 'On a refresh, scope only this repo')
    .option('--no-pull', 'On a refresh, use the clones as they are')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style start EUDPA-1234\n  tim style start --local trade-imports-plants-prototype design/1-home'
    )
    .action(
      makeRunAction({
        parseOptions,
        run: async ({ args }, options) => {
          const started = await runStart(args, options)
          if (started.mode === 'FRESH' && started.error !== undefined) {
            throw started.error
          }
          return options.json ? startJson(started) : started
        },
        renderText: (started) => startText(started, timVersion),
        exitCodeForResult: (started) =>
          started.error === undefined ? OK : ERROR,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const registerTopics = (style, { timVersion }) =>
  style
    .command('topics')
    .argument('[path]', "A file's path inside its repo")
    .description(
      'Print the style topics .claude/skills/code-style/assets/routing.json maps a file path to, one per line in the routing order; nothing when it maps to none. With --json the topics are result.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim style topics tests/specs/a.spec.ts\n  tim style topics src/views/page.njk --json'
    )
    .action(
      styleAction({
        run: ([path], options) => styleTopicsOf({ ...options, path }),
        renderText: (topics) =>
          topics.length === 0 ? null : topics.join('\n'),
        timVersion
      })
    )

const registerBundle = (style, { timVersion }) =>
  style
    .command('bundle')
    .argument('[review-id]', 'A ticket key, or local/<repo>/<branch>')
    .argument('[repo]', 'The repo the bundle is for')
    .argument('[topic]', 'A topic in the code-style routing data')
    .argument('[repo-dir]', "The repo's checkout, for its repo-relative files")
    .description(
      "Write workareas/code-style-reviews/<review-id>/style-rules.<repo>.<topic>.md: the topic's best-practice files from .claude/skills/code-style/assets/routing.json, each under its own heading (a missing one is marked missing), then each of its repo-relative files that <repo-dir> holds. Prints the bundle's path."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim style bundle EUDPA-1234 trade-imports-animals-frontend node\n  tim style bundle EUDPA-1234 trade-imports-animals-frontend hapi repos/trade-imports-animals-frontend'
    )
    .action(
      styleAction({
        run: ([reviewId, repo, topic, repoDir], options) =>
          bakeStyleBundle({ ...options, reviewId, repo, topic, repoDir }),
        renderText: ({ path }) => path,
        timVersion
      })
    )

/**
 * `tim style prepare`, `start`, `scope`, `topics` and `bundle`.
 *
 * @param {import('commander').Command} style
 * @param {{timVersion: string}} options
 */
export const registerStartCommands = (style, { timVersion }) => {
  registerStart(style, { timVersion })
  registerPrepare(style, { timVersion })
  registerScope(style, { timVersion })
  registerTopics(style, { timVersion })
  registerBundle(style, { timVersion })
}
