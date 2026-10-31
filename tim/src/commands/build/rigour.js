import { OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { loadBacklogSchema, rigoursOf } from '../../backlog/backlog-schema.js'
import { readJsonFile } from '../../backlog/io.js'
import { backlogPathFor } from '../backlog/rows.js'
import { proposeRigour } from '../../build/rigour.js'
import { TimError } from '../../errors.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const refuseUnknownPresets = (rows, rigours) => {
  const unknown = rows.filter((entry) => !rigours.includes(entry.rigour))
  if (unknown.length === 0) return
  throw new TimError(
    'LINT',
    unknown
      .map(
        (entry) =>
          `${entry.id} sets rigour "${entry.rigour}". Use one of: ${rigours.join(', ')}.`
      )
      .join('\n')
  )
}

/**
 * A rigour preset for every increment still to build, for the launch to show.
 *
 * @param {string} workspaceRoot
 * @param {string} workarea - A path under workareas/
 * @returns {{path: string, rows: {id: string, title: string, rigour: string, source: 'row'|'derived', reason: string}[]}}
 * @throws {TimError} USAGE for a workarea outside workareas/, NOT_FOUND or PARSE from the read, LINT for a row whose own rigour is not a preset
 */
export const rigourProposal = (workspaceRoot, workarea) => {
  const path = backlogPathFor(workspaceRoot, workarea)
  const rows = proposeRigour(readJsonFile(path))
  refuseUnknownPresets(rows, rigoursOf(loadBacklogSchema(workspaceRoot)))
  return { path, rows }
}

/**
 * The plain-text report of `tim build rigour`, one row a line.
 *
 * @param {{path: string, rows: {id: string, rigour: string, reason: string}[]}} result
 * @returns {string}
 */
export const renderRigourText = ({ rows }) => {
  const presetWidth = 8
  return rows.length === 0
    ? 'Every increment is built out: there is nothing to propose a rigour for.'
    : rows
        .map(
          (entry) =>
            `${entry.id}  ${entry.rigour.padEnd(presetWidth)}  ${entry.reason}`
        )
        .join('\n')
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
 * `tim build rigour`: propose how much of the pipeline each increment still to
 * build should get, for the BUILD intake to show before a launch.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerRigour = (build, timVersion) =>
  build
    .command('rigour <workarea>')
    .description(
      'Propose a rigour preset for every increment still to build — full, standard or fast — from the row and nothing else: its repos, its kind and what the gate runs for it. A row that sets its own rigour keeps it. The reason beside each row says what the proposal keyed on; what a row is really worth is in the code it changes, which this cannot read, so the launch shows these and the operator decides. Change one with `tim backlog set <workarea> <id> --rigour <preset>`.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build rigour shared/my-programme\n  tim build rigour shared/my-programme --json'
    )
    .action(function rigourAction(workarea) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = rigourProposal(workspaceRoot, workarea)
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderRigourText(result)
        )
        process.exit(OK)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
