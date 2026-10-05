import { runToLog } from './exec.js'
import { runStackScriptToLog, stackScriptPath } from './stack.js'
import {
  RUN_STACK_ARGS,
  recordLeaseContainers,
  recordLeaseFingerprints
} from './stack-lease.js'
import {
  planRefresh,
  serviceFingerprints,
  stackFilesFingerprint
} from './stack-fingerprints.js'

export const DEV_SERVICE_SCRIPT = 'dev-service.sh'

const RUN_STACK_SCRIPT = 'run-stack.sh'

const NOT_RUN = { exitCode: 0, log: null }

const ACTION_WORDS = { rebuild: 'Rebuilding', restart: 'Restarting' }

// Run through bash, so the script works whether or not git kept its
// execute bit.
const runDevService = async (
  { workspaceRoot, env },
  action,
  services,
  logPath
) =>
  services.length === 0
    ? NOT_RUN
    : runToLog(
        'bash',
        [
          stackScriptPath(workspaceRoot, DEV_SERVICE_SCRIPT),
          action,
          ...services
        ],
        { cwd: workspaceRoot, env, logPath }
      )

const failureOf = (action, services, result) =>
  result.exitCode === 0
    ? null
    : `${ACTION_WORDS[action]} ${services.join(', ')} failed (${DEV_SERVICE_SCRIPT} exited ${result.exitCode}). Read ${result.log}.`

const fingerprintsOf = (services, current) =>
  Object.fromEntries(services.map((service) => [service, current[service]]))

// A lease written before tim kept the stack files' fingerprint cannot say
// what they were, so it is treated as changed. A workspace git cannot read
// gives no fingerprint at all, and nothing to compare.
const stackFilesChanged = (recorded, current) =>
  current !== null && recorded !== current

// The stack files themselves changed (a compose overlay, an env file, a
// stack script): no single service's refresh can apply that, so the stack
// is started again under the same lease, the way it was first started, and
// compose recreates whatever the new files change.
const startAgain = async (
  { workspaceRoot, holder, leasePath, lease, logPaths, env },
  stackFiles
) => {
  const upRun = await runStackScriptToLog({
    workspaceRoot,
    script: RUN_STACK_SCRIPT,
    args: RUN_STACK_ARGS[lease.mode] ?? RUN_STACK_ARGS.dev,
    logPath: logPaths.restack,
    env
  })
  await recordLeaseContainers({ holder, leasePath, env })
  const outcome = {
    restacked: true,
    restackLog: upRun.log,
    rebuilt: [],
    restarted: [],
    left: [],
    rebuildLog: null,
    restartLog: null
  }
  if (upRun.exitCode !== 0) {
    return {
      ...outcome,
      ok: false,
      reason: `The workspace's stack files changed since the stack was started, and starting it again failed (${RUN_STACK_SCRIPT} exited ${upRun.exitCode}). Read ${upRun.log}.`
    }
  }
  const services =
    lease.mode === 'dev' ? await serviceFingerprints(workspaceRoot) : {}
  recordLeaseFingerprints({
    holder,
    leasePath,
    fingerprints: services,
    stackFiles
  })
  return { ...outcome, ok: true, reason: null }
}

const refreshServices = async ({
  workspaceRoot,
  holder,
  leasePath,
  lease,
  logPaths,
  env
}) => {
  const current = await serviceFingerprints(workspaceRoot)
  const plan = planRefresh(lease.fingerprints, current)
  const context = { workspaceRoot, env }
  const rebuild = await runDevService(
    context,
    'rebuild',
    plan.rebuild,
    logPaths.rebuild
  )
  if (plan.rebuild.length > 0) {
    await recordLeaseContainers({ holder, leasePath, env })
  }
  const restart = await runDevService(
    context,
    'restart',
    plan.restart,
    logPaths.restart
  )
  const settled = [
    ...plan.leave,
    ...(rebuild.exitCode === 0 ? plan.rebuild : []),
    ...(restart.exitCode === 0 ? plan.restart : [])
  ]
  recordLeaseFingerprints({
    holder,
    leasePath,
    fingerprints: fingerprintsOf(settled, current)
  })
  const reasons = [
    failureOf('rebuild', plan.rebuild, rebuild),
    failureOf('restart', plan.restart, restart)
  ].filter(Boolean)
  return {
    ok: reasons.length === 0,
    restacked: false,
    restackLog: null,
    rebuilt: plan.rebuild,
    restarted: plan.restart,
    left: plan.leave,
    rebuildLog: rebuild.log,
    restartLog: restart.log,
    reason: reasons.length > 0 ? reasons.join(' ') : null
  }
}

/**
 * Bring a stack the holder already leases up to date with the working tree.
 *
 * stackFilesKnown is false when the workspace is not a git checkout, so tim
 * cannot tell whether its stack files changed and never starts it again.
 *
 * When the workspace's own stack files (docker/stack, scripts/stack) changed
 * since the lease recorded them, the whole stack is started again with
 * run-stack.sh, in the lease's mode, and the lease records its new
 * containers, what every service serves and the stack files it was started
 * from. A start that fails records the containers but not the stack files,
 * so the next refresh starts it again.
 *
 * Otherwise each dev service is brought up to date on its own, instead of
 * rebuilding all of it. A service whose image inputs changed (or whose
 * fingerprints the lease does not have) is rebuilt and recreated, and the
 * lease records the new container ids. A service whose bind-mounted source
 * alone changed is restarted, keeping its container, and waited on until it
 * is healthy. Any other service is left as it is. The lease then records
 * what each service serves; a service whose rebuild or restart failed is
 * left out, so the next refresh rebuilds it.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.holder
 * @param {string} args.leasePath
 * @param {object} args.lease - The holder's lease, as acquireStack reused it
 * @param {{rebuild: string, restart: string, restack: string}} args.logPaths - Where each step writes its output
 * @param {object} [args.env] - Extra environment for git, docker and the scripts
 * @returns {Promise<{ok: boolean, restacked: boolean, stackFilesKnown: boolean, rebuilt: string[], restarted: string[], left: string[], restackLog: string|null, rebuildLog: string|null, restartLog: string|null, reason: string|null}>}
 */
export const refreshLeasedStack = async (args) => {
  const stackFiles = await stackFilesFingerprint(args.workspaceRoot)
  const outcome = stackFilesChanged(args.lease.stackFiles, stackFiles)
    ? await startAgain(args, stackFiles)
    : await refreshServices(args)
  return { ...outcome, stackFilesKnown: stackFiles !== null }
}
