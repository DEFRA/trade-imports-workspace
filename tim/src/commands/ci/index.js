import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { TimError } from '../../errors.js'
import {
  normaliseSuites,
  normaliseTags,
  resolveScope,
  SCOPE_PATH,
  scopeNote,
  scopeOutputLines
} from '../../ci/e2e-scope.js'
import { errorPayloadFor, exitCodeFor, jsonEnvelope } from '../envelope.js'
import { writeLine } from '../_write-line.js'

const requiredVariable = (env, name) => {
  const value = env[name]
  if (value === undefined) {
    throw new TimError(
      'PARSE',
      `Set the ${name} environment variable. It can be empty.`
    )
  }
  return value
}

const readScopeConfig = (workspace) => () => {
  const workspaceRoot = resolveWorkspaceRoot({ explicit: workspace })
  try {
    return JSON.parse(readFileSync(join(workspaceRoot, SCOPE_PATH), 'utf8'))
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Cannot read ${SCOPE_PATH}: ${error.message}`,
      error
    )
  }
}

const scopeOf = (env, { workspace }) => {
  const manual = env.MANUAL === 'true'
  return resolveScope({
    repository: env.REPOSITORY ?? '',
    manual,
    suites: manual ? requiredVariable(env, 'SUITES') : undefined,
    tags: manual ? requiredVariable(env, 'TAGS') : undefined,
    readScopeConfig: readScopeConfig(workspace)
  })
}

const linesOf = (list) => (list.length === 0 ? null : list.join('\n'))

const makeCiAction = ({
  run,
  renderText,
  renderNote = () => null,
  timVersion
}) =>
  async function ciAction() {
    const opts = this.optsWithGlobals()
    try {
      const result = run(process.env, opts)
      if (opts.json) {
        await writeLine(
          process.stdout,
          JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
        )
      } else {
        const note = renderNote(result)
        if (note !== null) await writeLine(process.stderr, note)
        const text = renderText(result)
        if (text !== null) await writeLine(process.stdout, text)
      }
      process.exit(OK)
    } catch (error) {
      if (opts.json) {
        await writeLine(
          process.stdout,
          JSON.stringify(
            jsonEnvelope({
              ok: false,
              error: errorPayloadFor(error),
              timVersion
            })
          )
        )
      } else {
        await writeLine(process.stderr, `::error::${error.message}`)
      }
      process.exit(exitCodeFor(error))
    }
  }

const registerScope = (ci, { timVersion }) =>
  ci
    .command('scope')
    .description(
      `Work out which suites and tags an e2e run covers, and print them as suites= and tags= lines for $GITHUB_OUTPUT. A direct manual run (MANUAL=true) takes SUITES and TAGS; any other run takes the entry for the repo in REPOSITORY (owner/name) from ${SCOPE_PATH}, or its default entry. "all" runs every suite and stands alone.`
    )
    .addHelpText(
      'after',
      '\nExamples:\n  REPOSITORY=DEFRA/trade-imports-ins-backend tim ci scope >> "$GITHUB_OUTPUT"\n  MANUAL=true REPOSITORY=DEFRA/trade-imports-workspace SUITES=tests/ins/ TAGS=@smoke tim ci scope --json'
    )
    .action(
      makeCiAction({
        run: scopeOf,
        renderText: scopeOutputLines,
        renderNote: scopeNote,
        timVersion
      })
    )

const registerSuites = (ci, { timVersion }) =>
  ci
    .command('suites')
    .description(
      "Turn SUITES (space- or comma-separated paths under tests/) into one Playwright path per line. A folder gets a trailing slash, so tests/animals cannot also select tests/animals-admin/. A path outside tests/, or with '..' or other characters, fails the run. Empty SUITES prints nothing."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  SUITES="tests/ins tests/animals" tim ci suites\n  SUITES=tests/plants/ tim ci suites --json'
    )
    .action(
      makeCiAction({
        run: (env) => ({ suites: normaliseSuites(env.SUITES ?? '') }),
        renderText: ({ suites }) => linesOf(suites),
        timVersion
      })
    )

const registerTags = (ci, { timVersion }) =>
  ci
    .command('tags')
    .description(
      "Turn TAGS (space- or comma-separated) into one Playwright --grep pattern, the tags joined by |. A tag that is not @ followed by letters, digits, '_' or '-' fails the run. Empty TAGS prints nothing."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  TAGS="@ins-backend @gateway" tim ci tags\n  TAGS=@smoke tim ci tags --json'
    )
    .action(
      makeCiAction({
        run: (env) => normaliseTags(env.TAGS ?? ''),
        renderText: ({ pattern }) => (pattern === '' ? null : pattern),
        timVersion
      })
    )

/**
 * `tim ci`: the e2e workflow's scope and its Playwright arguments.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const ci = program
    .command('ci')
    .description(
      "The e2e workflow's test scope, and the Playwright arguments it runs with"
    )
  registerScope(ci, { timVersion })
  registerSuites(ci, { timVersion })
  registerTags(ci, { timVersion })
  return ci
}
