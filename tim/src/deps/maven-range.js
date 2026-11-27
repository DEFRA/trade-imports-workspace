import semver from 'semver'

const BOUND = String.raw`[^,[\]()\s]*`
const INTERVAL = new RegExp(String.raw`^([[(])(${BOUND}),(${BOUND})([\])])$`)
const EXACT = new RegExp(String.raw`^\[(${BOUND})\]$`)

const versionOf = (text) => semver.coerce(text)

const intervalOf = (range) => {
  const exact = EXACT.exec(range)
  if (exact) {
    return { lower: exact[1], upper: exact[1], lowerIn: true, upperIn: true }
  }
  const interval = INTERVAL.exec(range)
  if (!interval) return null
  const [, open, lower, upper, close] = interval
  return { lower, upper, lowerIn: open === '[', upperIn: close === ']' }
}

const boundsReadable = ({ lower, upper, lowerIn, upperIn }) =>
  (lower === '' ? !lowerIn : versionOf(lower) !== null) &&
  (upper === '' ? !upperIn : versionOf(upper) !== null) &&
  (lower !== '' || upper !== '')

const boundsInOrder = ({ lower, upper }) =>
  lower === '' || upper === '' || semver.lte(versionOf(lower), versionOf(upper))

/**
 * Whether the text is one Maven version range: an interval such as
 * `[3.0.0,4.0.0)` or `[3.0.0,)`, or one version such as `[3.0.0]`. A
 * union of intervals is not accepted.
 *
 * @param {string} range
 * @returns {boolean}
 */
export const isMavenRange = (range) => {
  const interval = intervalOf(range)
  return (
    interval !== null && boundsReadable(interval) && boundsInOrder(interval)
  )
}

const aboveLower = (version, { lower, lowerIn }) => {
  if (lower === '') return true
  const order = semver.compare(version, versionOf(lower))
  return lowerIn ? order >= 0 : order > 0
}

const belowUpper = (version, { upper, upperIn }) => {
  if (upper === '') return true
  const order = semver.compare(version, versionOf(upper))
  return upperIn ? order <= 0 : order < 0
}

/**
 * Whether a version falls in a Maven version range. Each version is read
 * by its numbers only, so `3.0.0-M1` counts as `3.0.0`.
 *
 * @param {string} range - One that {@link isMavenRange} accepts
 * @param {string} version
 * @returns {boolean} False when the range or the version can't be read
 */
export const mavenRangeIncludes = (range, version) => {
  const interval = intervalOf(range)
  const candidate = versionOf(version)
  if (!interval || !candidate || !boundsReadable(interval)) return false
  return aboveLower(candidate, interval) && belowUpper(candidate, interval)
}
