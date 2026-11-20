import { OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { readJsonFile } from '../../backlog/io.js'
import { readEnvelopeRepos } from '../../build/envelope-repos.js'
import { loadPrScope } from '../../build/pr-scope.js'
import {
  stackPlanFor,
  stackPlanLines,
  tagDomainsIn,
  tagsIn
} from '../../build/stack-domains.js'
import { backlogPathFor } from '../backlog/rows.js'
import { errorPayloadFor, exitCodeFor, jsonEnvelope } from '../envelope.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const BUILDABLE = new Set(['todo', 'blocked', 'in-progress'])

/**
 * What stack a run over this backlog needs: the domains its unbuilt rows put
 * in play, and the services that starts.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} opts.workarea - A path under workareas/
 * @param {boolean} [opts.everyRow=false] - Count rows already built too
 * @returns {object} As stackPlanFor, with the backlog it read
 * @throws {TimError} NOT_FOUND, PARSE or USAGE from the reads
 */
export const stackPlanForWorkarea = ({
  workspaceRoot,
  workarea,
  everyRow = false
}) => {
  const backlogPath = backlogPathFor(workspaceRoot, workarea)
  const { increments = [] } = readJsonFile(backlogPath)
  const rows = everyRow
    ? increments
    : increments.filter(({ status }) => !status || BUILDABLE.has(status))
  const repos = readEnvelopeRepos(workspaceRoot, workarea)
  const folderOfKey = Object.fromEntries(
    repos.map(({ key, folder }) => [key, folder])
  )
  const scope = loadPrScope(workspaceRoot)
  const tagDomains = tagDomainsIn(workspaceRoot, tagsIn(scope))
  return {
    backlog: backlogPath,
    rowsRead: rows.length,
    ...stackPlanFor({ rows, folderOfKey, scope, tagDomains })
  }
}

const reportError = (error, json, timVersion) => {
  if (json) {
    emit(
      JSON.stringify(
        jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })
      )
    )
  } else {
    emitError(error.message ?? String(error))
  }
  process.exit(exitCodeFor(error))
}

/**
 * `tim build stack-plan`: say which stack a run over a backlog needs, and
 * why, so a person can choose between the whole stack and a narrowed one.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerStackPlan = (build, timVersion) =>
  build
    .command('stack-plan')
    .description(
      'Say which services a run over this backlog needs, and why, row by row. The loop holds one stack for a whole run, so this reads every row it has left to build and unions what they put in play. A row that changes no service repo needs no stack: the workspace and the tests repo say nothing about which domain a row is for. A row that builds the performance suite, or a repo with no entry in the scope file, needs the whole stack. Read before a run whose gate gets its end-to-end proof locally; a run that leaves it to CI starts no stack whatever this says.'
    )
    .argument('<workarea>', 'A path under workareas/, such as shared/my-theme')
    .option('--every-row', 'Count rows already built, not only the ones left')
    .addHelpText(
      'after',
      '\nExamples:\n  tim build stack-plan shared/dr21-parity\n  tim build stack-plan shared/dr21-parity --json'
    )
    .action(function stackPlanAction(workarea, options) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = stackPlanForWorkarea({
          workspaceRoot,
          workarea,
          everyRow: Boolean(options.everyRow)
        })
        if (globalOpts.json) {
          emit(JSON.stringify(jsonEnvelope({ ok: true, result, timVersion })))
        } else {
          for (const line of stackPlanLines(result)) emit(line)
        }
        process.exit(OK)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
