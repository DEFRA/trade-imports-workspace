import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { rosterOf, repoPath } from '../../constants/repos.js'
import { run } from '../../exec/exec.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, USAGE } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'

const SCHEMA_VERSION = 1

export const parseBranch = (firstLine = '') => {
  // git status -sb first line: "## branch...origin/branch [ahead 2, behind 1]"
  const match = firstLine.match(/^## ([^.\s]+)(?:\.\.\.(\S+))?(?: \[(.+)\])?/)
  if (!match) return { branch: null, upstream: null, ahead: 0, behind: 0 }
  const [, branch, upstream, counts] = match
  const aheadMatch = counts?.match(/ahead (\d+)/)
  const behindMatch = counts?.match(/behind (\d+)/)
  return {
    branch: branch ?? null,
    upstream: upstream ?? null,
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0
  }
}

const countDirtyEntries = (lines = []) =>
  lines.filter((line) => line.trim().length > 0).length

const collectStatus = async (workspaceRoot, repo) => {
  const path = repoPath(workspaceRoot, repo)
  const cloned = existsSync(join(path, '.git'))
  if (!cloned) {
    return {
      repo,
      cloned: false,
      branch: null,
      ahead: 0,
      behind: 0,
      dirty: 0,
      raw: ''
    }
  }
  const result = await run('git', ['-C', path, 'status', '-sb'])
  const lines = result.stdout.split('\n')
  const branchInfo = parseBranch(lines[0])
  return {
    repo,
    cloned: true,
    ...branchInfo,
    dirty: countDirtyEntries(lines.slice(1)),
    raw: result.stdout
  }
}

export const collectStatuses = (workspaceRoot) =>
  Promise.all(
    rosterOf(workspaceRoot).repos.map((repo) =>
      collectStatus(workspaceRoot, repo)
    )
  )

export const renderText = (statuses) =>
  statuses
    .map(({ repo, cloned, raw }) =>
      cloned
        ? `\n=== ${repo} ===\n${raw}`.trimEnd()
        : `\n=== ${repo} === (not cloned)`
    )
    .join('\n')

export const renderJson = (statuses, timVersion) =>
  JSON.stringify({
    ok: true,
    schema_version: SCHEMA_VERSION,
    tim_version: timVersion,
    result: statuses,
    errors: [],
    metadata: { ranAt: new Date().toISOString() }
  })

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

export const register = (parent, { timVersion }) => {
  parent
    .command('status')
    .description('Show git status for every repo in the workspace')
    .action(async function statusAction() {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const statuses = await collectStatuses(workspaceRoot)
        if (globalOpts.json) emit(renderJson(statuses, timVersion))
        else emit(renderText(statuses))
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
        process.exit(isTimError(error) && error.code === 'USAGE' ? USAGE : 1)
      }
    })
}
