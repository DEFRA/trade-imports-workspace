import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { resolveRepoPath } from '../../build/repo-path.js'
import { findPushWorkflows } from '../../build/push-workflows.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const pushWorkflowsOptionsSchema = z.object({
  repo: z.string().trim().min(1),
  commit: z
    .string({
      message: 'Name the commit with --commit, such as a merge commit SHA.'
    })
    .trim()
    .min(1, 'Name the commit with --commit, such as a merge commit SHA.'),
  branch: z.string().trim().min(1, 'Name the branch the commit was pushed to.')
})

const describeWorkflow = ({ file, starts, reason }) =>
  `  ${starts ? 'starts' : 'skips '}  ${file} — ${reason}`

const headline = ({ commit, branch, starts }) => {
  const pushed = `A push of ${commit.slice(0, 12)} to ${branch}`
  if (starts.length === 0) return `${pushed} starts no workflow.`
  return `${pushed} starts ${starts.length === 1 ? '1 workflow' : `${starts.length} workflows`}.`
}

/**
 * The plain-text report of `tim build push-workflows`.
 *
 * @param {{commit: string, branch: string, changedFiles: string[], workflows: object[], starts: string[]}} outcome
 * @returns {string}
 */
export const renderPushWorkflowsText = (outcome) =>
  [
    headline(outcome),
    `Files the commit changes: ${outcome.changedFiles.length}.`,
    ...outcome.workflows.map(describeWorkflow)
  ].join('\n')

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
 * `tim build push-workflows`: the workflows a push of one commit starts.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerPushWorkflows = (build, timVersion) =>
  build
    .command('push-workflows')
    .argument(
      '[repo]',
      'The repo, as a path or a folder under repos/ (default: this folder)',
      '.'
    )
    .option('--commit <sha>', 'The commit that was pushed')
    .option('--branch <name>', 'The branch it was pushed to', 'main')
    .description(
      "Say which GitHub Actions workflows a push of one commit to a branch starts, from the repo's own .github/workflows files at that commit. A workflow starts when it has a push trigger whose branches, branches-ignore and tags filters let the branch through and whose paths or paths-ignore filters match at least one file the commit changes from its first parent. `!` patterns count in order, as GitHub reads them. result.starts names each workflow as GitHub names its runs (the workflowName of `gh run list`): its name, else its file path. It reads local git only: fetch the commit first. A merge commit that starts no workflow has no run to wait for. Exits 0 whatever it finds."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build push-workflows . --commit 4cd37b9c --branch main --json\n  tim build push-workflows trade-imports-ins-tests --commit origin/main'
    )
    .action(async function pushWorkflowsAction(repo, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(pushWorkflowsOptionsSchema, {
          repo,
          commit: opts.commit,
          branch: opts.branch
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await findPushWorkflows({
          repoPath: resolveRepoPath(workspaceRoot, parsed.repo),
          commit: parsed.commit,
          branch: parsed.branch
        })
        emit(
          globalOpts.json
            ? JSON.stringify(
                jsonEnvelope({ ok: true, result: outcome, timVersion })
              )
            : renderPushWorkflowsText(outcome)
        )
        process.exit(OK)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
