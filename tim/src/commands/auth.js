import { createJiraClient } from '../clients/jira-client.js'
import { createConfluenceClient } from '../clients/confluence-client.js'
import { OK, ERROR, MISSING_DEP } from '../constants/exitCodes.js'
import { isTimError } from '../errors.js'

const SCHEMA_VERSION = 1

/**
 * Probe each external integration via its client's whoami(). Returns a
 * record per service with the authenticated user or a structured error.
 *
 * Factory overrides are for tests — production callers should rely on
 * the defaults.
 */
export const probeAll = async ({ jiraFactory, confluenceFactory } = {}) => {
  const services = [
    { label: 'jira', factory: jiraFactory ?? (() => createJiraClient()) },
    {
      label: 'confluence',
      factory: confluenceFactory ?? (() => createConfluenceClient())
    }
  ]

  return Promise.all(
    services.map(async ({ label, factory }) => {
      try {
        const client = await factory()
        const who = await client.whoami()
        return { service: label, ok: true, user: who }
      } catch (error) {
        return {
          service: label,
          ok: false,
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message ?? String(error)
          }
        }
      }
    })
  )
}

const renderText = (results) =>
  results
    .map((r) =>
      r.ok
        ? `${r.service}: OK — ${r.user.displayName ?? r.user.user ?? '(unknown user)'}`
        : `${r.service}: FAILED — ${r.error.code}: ${r.error.message}`
    )
    .join('\n')

const renderJson = (results, timVersion) =>
  JSON.stringify({
    ok: results.every((r) => r.ok),
    schema_version: SCHEMA_VERSION,
    tim_version: timVersion,
    result: results.reduce((acc, r) => {
      acc[r.service] = r.ok
        ? { ok: true, user: r.user }
        : { ok: false, error: r.error }
      return acc
    }, {}),
    errors: results
      .filter((r) => !r.ok)
      .map((r) => ({
        code: r.error.code,
        message: `${r.service}: ${r.error.message}`
      })),
    metadata: { ranAt: new Date().toISOString() }
  })

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

export const register = (program, { timVersion }) => {
  program
    .command('auth')
    .description(
      'Check authentication against Jira and Confluence. For GitHub, run gh auth status'
    )
    .action(async function authAction() {
      const globalOpts = this.optsWithGlobals()
      try {
        const results = await probeAll()
        if (globalOpts.json) emit(renderJson(results, timVersion))
        else emit(renderText(results))
        const allOk = results.every((r) => r.ok)
        process.exit(allOk ? OK : MISSING_DEP)
      } catch (error) {
        if (isTimError(error) && globalOpts.json) {
          emit(
            JSON.stringify({
              ok: false,
              schema_version: SCHEMA_VERSION,
              tim_version: timVersion,
              result: null,
              errors: [{ code: error.code, message: error.message }]
            })
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(ERROR)
      }
    })
}
