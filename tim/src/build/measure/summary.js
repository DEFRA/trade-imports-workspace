const TOP_CONTAINERS = 5
const OUTCOME_LINE =
  /\d+ (passed|failed|flaky|interrupted|did not run|skipped)|Timed out|Tests run:|BUILD (SUCCESS|FAILURE)/

const round = (value, places = 0) =>
  value === null || value === undefined
    ? null
    : Math.round(value * 10 ** places) / 10 ** places

const present = (values) =>
  values.filter((value) => value !== null && value !== undefined)

const highest = (values) =>
  present(values).length > 0 ? Math.max(...present(values)) : null

const lowest = (values) =>
  present(values).length > 0 ? Math.min(...present(values)) : null

const percentile = (values, share) => {
  const sorted = present(values).toSorted((left, right) => left - right)
  if (sorted.length === 0) return null
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))]
}

const counterRise = (samples, key) => {
  const readings = present(samples.map((sample) => sample[key]))
  return readings.length > 1 ? readings.at(-1) - readings[0] : null
}

const busiestDockerSample = (samples) =>
  samples.reduce(
    (busiest, sample) =>
      (sample.dockerMiB ?? 0) > (busiest?.dockerMiB ?? 0) ? sample : busiest,
    null
  )

const topContainers = (sample) =>
  (sample?.containers ?? [])
    .toSorted((left, right) => right.mib - left.mib)
    .slice(0, TOP_CONTAINERS)
    .map(({ name, mib }) => ({ name, mib: round(mib) }))

/**
 * The last lines of a test or build log that say how it went: Playwright's
 * passed, failed and timed-out counts, or Maven's test totals and result.
 *
 * @param {string} log
 * @returns {string[]}
 */
export const outcomeLines = (log) =>
  log
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => OUTCOME_LINE.test(line))
    .slice(-8)

/**
 * What a measured run did to the machine, from the samples taken while it
 * ran: the peaks, the low point of free memory, how much was swapped out,
 * and how long a shell took to start (a stand-in for how the terminal feels).
 *
 * @param {object[]} samples - Each from takeSample, oldest first
 * @returns {object}
 */
export const summariseSamples = (samples) => {
  const of = (key) => samples.map((sample) => sample[key])
  const busiest = busiestDockerSample(samples)
  return {
    samples: samples.length,
    peakLoad1: highest(of('load1')),
    lowestFreePercent: lowest(of('freePercent')),
    peakHostUsedGiB: round(highest(of('hostUsedGiB')), 2),
    swapStartMiB: round(present(of('swapUsedMiB'))[0] ?? null),
    swapPeakMiB: round(highest(of('swapUsedMiB'))),
    swapoutPages: counterRise(samples, 'swapouts'),
    pageoutPages: counterRise(samples, 'pageouts'),
    peakDockerMiB: round(highest(of('dockerMiB'))),
    peakDockerCpuPercent: round(highest(of('dockerCpuPercent'))),
    dockerAtPeak: topContainers(busiest),
    shellStartMs: {
      median: percentile(of('shellStartMs'), 0.5),
      p95: percentile(of('shellStartMs'), 0.95),
      max: highest(of('shellStartMs'))
    }
  }
}
