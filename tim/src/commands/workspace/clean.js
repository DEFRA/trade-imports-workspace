import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { rosterOf, repoPath } from '../../constants/repos.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, USAGE, ERROR } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'

const SCHEMA_VERSION = 1

export const cleanRepo = (workspaceRoot, repo) => {
  const modulesPath = join(repoPath(workspaceRoot, repo), 'node_modules')
  if (!existsSync(modulesPath)) {
    return { repo, removed: false, path: modulesPath }
  }
  rmSync(modulesPath, { recursive: true, force: true })
  return { repo, removed: true, path: modulesPath }
}

export const cleanAll = (workspaceRoot) =>
  rosterOf(workspaceRoot).nodeRepos.map((repo) =>
    cleanRepo(workspaceRoot, repo)
  )

export const renderText = (results) =>
  results
    .map(({ repo, removed }) =>
      removed
        ? `  ${repo} — removed node_modules`
        : `  ${repo} — (no node_modules)`
    )
    .join('\n')

export const renderJson = (results, timVersion) =>
  JSON.stringify({
    ok: true,
    schema_version: SCHEMA_VERSION,
    tim_version: timVersion,
    result: results,
    errors: [],
    metadata: { ranAt: new Date().toISOString() }
  })

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

export const register = (parent, { timVersion }) => {
  parent
    .command('clean')
    .description('Remove node_modules in every Node.js repo')
    .action(async function cleanAction() {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const results = cleanAll(workspaceRoot)
        if (globalOpts.json) emit(renderJson(results, timVersion))
        else emit(renderText(results))
        process.exit(OK)
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
        process.exit(
          isTimError(error) && error.code === 'USAGE' ? USAGE : ERROR
        )
      }
    })
}
