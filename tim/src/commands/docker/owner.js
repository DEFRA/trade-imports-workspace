import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { defaultLeasePath, stackOwner } from '../../exec/stack-lease.js'
import { isSameWorkspace } from '../../exec/stack.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const ownerResult = async (workspaceRoot) => {
  const { workspace, source } = await stackOwner({
    workspaceRoot,
    leasePath: defaultLeasePath()
  })
  return {
    workspace,
    source,
    thisClone: workspaceRoot,
    ownedHere: Boolean(workspace) && isSameWorkspace(workspace, workspaceRoot)
  }
}

const reportOwner = (result, { json, timVersion }) => {
  if (json) {
    emit(JSON.stringify(jsonEnvelope({ ok: true, result, timVersion })))
  } else if (result.workspace) {
    emit(result.workspace)
  } else {
    emitError('Nobody owns the workspace stack: it is down.')
  }
  process.exit(OK)
}

const reportError = (error, { json, timVersion }) => {
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
 * `tim docker owner`: the clone that owns the workspace stack.
 *
 * @param {import('commander').Command} docker
 * @param {string} timVersion
 */
export const registerOwner = (docker, timVersion) =>
  docker
    .command('owner')
    .description(
      'Print the clone that owns the workspace stack: the clone its running containers were started from, or, while it is starting, the clone that holds its lease. Prints nothing on stdout when the stack is down. Only the owning clone runs local E2E.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim docker owner\n  tim docker owner --json'
    )
    .action(async function action() {
      const globalOpts = this.optsWithGlobals()
      const output = { json: globalOpts.json, timVersion }
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        reportOwner(await ownerResult(workspaceRoot), output)
      } catch (error) {
        reportError(error, output)
      }
    })
