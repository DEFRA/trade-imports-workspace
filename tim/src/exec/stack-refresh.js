import { runToLog } from './exec.js'
import { stackScriptPath } from './stack.js'
import {
  recordLeaseContainers,
  recordLeaseFingerprints
} from './stack-lease.js'
import { planRefresh, serviceFingerprints } from './stack-fingerprints.js'

export const DEV_SERVICE_SCRIPT = 'dev-service.sh'

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

/**
 * Bring a dev-mode stack the holder already leases up to date with the
 * working tree, one service at a time, instead of rebuilding all of it. A
 * service whose image inputs changed (or whose fingerprints the lease does
 * not have) is rebuilt and recreated, and the lease records the new
 * container ids. A service whose bind-mounted source alone changed is
 * restarted, keeping its container, and waited on until it is healthy. Any
 * other service is left as it is. The lease then records what each service
 * serves; a service whose rebuild or restart failed is left out, so the
 * next refresh rebuilds it.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.holder
 * @param {string} args.leasePath
 * @param {object} args.lease - The holder's lease, as acquireStack reused it
 * @param {{rebuild: string, restart: string}} args.logPaths - Where each step writes its output
 * @param {object} [args.env] - Extra environment for git, docker and the script
 * @returns {Promise<{ok: boolean, rebuilt: string[], restarted: string[], left: string[], rebuildLog: string|null, restartLog: string|null, reason: string|null}>}
 */
export const refreshLeasedStack = async ({
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
    rebuilt: plan.rebuild,
    restarted: plan.restart,
    left: plan.leave,
    rebuildLog: rebuild.log,
    restartLog: restart.log,
    reason: reasons.length > 0 ? reasons.join(' ') : null
  }
}
