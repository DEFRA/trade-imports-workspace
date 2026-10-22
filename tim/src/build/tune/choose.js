const PLATEAU_SHARE = 1.05
const SHELL_START_LIMIT_MS = 100

const isStrained = ({ swapoutPages, shellStartMs }) =>
  (swapoutPages ?? 0) > 0 || (shellStartMs?.max ?? 0) > SHELL_START_LIMIT_MS

const strainOf = ({ swapoutPages, shellStartMs }) =>
  (swapoutPages ?? 0) > 0
    ? `swapped out ${swapoutPages} pages`
    : `took ${shellStartMs.max} ms to start a shell`

const fewestPastWhichTimeStopsFalling = (passed) => {
  const fastest = Math.min(...passed.map(({ wallSeconds }) => wallSeconds))
  return passed.find(
    ({ wallSeconds }) => wallSeconds <= fastest * PLATEAU_SHARE
  )
}

const backedOffFrom = (chosen, passed) => {
  const fewer = passed.filter(({ workers }) => workers < chosen.workers).at(-1)
  return fewer
    ? {
        workers: fewer.workers,
        reason: `${chosen.workers} workers was fastest but ${strainOf(chosen)}, so one fewer: ${fewer.workers} took ${fewer.wallSeconds}s.`
      }
    : {
        workers: chosen.workers,
        reason: `${chosen.workers} workers ${strainOf(chosen)}, and no fewer passed, so it stays at ${chosen.workers}.`
      }
}

/**
 * The worker count for one rung, from timed runs at several counts: the
 * fewest workers past which the time stops falling, then one fewer when that
 * count swapped or kept a shell waiting more than 100 ms.
 *
 * @param {{workers: number, exitCode: number, wallSeconds: number, swapoutPages: number|null, shellStartMs: {max: number|null}}[]} trials
 * @returns {{workers: number|null, reason: string}} workers is null when no count passed
 */
export const chooseWorkers = (trials) => {
  const passed = trials
    .filter(({ exitCode }) => exitCode === 0)
    .toSorted((left, right) => left.workers - right.workers)
  if (passed.length === 0) {
    return {
      workers: null,
      reason:
        "No worker count passed, so this rung keeps its own script's count. Read each run's log."
    }
  }
  const chosen = fewestPastWhichTimeStopsFalling(passed)
  if (isStrained(chosen)) return backedOffFrom(chosen, passed)
  return {
    workers: chosen.workers,
    reason: `${chosen.workers} workers took ${chosen.wallSeconds}s, within 5% of the fastest, with no swapping and quick shell starts.`
  }
}
