const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const idsIn = (list) =>
  (Array.isArray(list) ? list.filter(isObject) : [])
    .map((item) => item.id)
    .filter(isText)

const heldIdsOf = (entry) =>
  new Set(
    (entry.verify?.verdicts ?? [])
      .filter((verdict) => verdict.holds === true)
      .map((verdict) => verdict.id)
  )

const standingOf = (verified, held, claimId) => {
  if (!verified) return 'unverified'
  return held.has(claimId) ? 'held' : 'refuted'
}

/**
 * Where every claim id in the workarea stands: held or missed (in the
 * working set), refuted, or in a source not verified yet. Each standing
 * carries its source's state and the reason for it, so a problem can say
 * what the source needs.
 *
 * @param {object[]} entries - From `inspectSources`
 * @returns {Map<string, {source: string, state: string, reason: string, standing: 'held'|'missed'|'refuted'|'unverified'}>}
 */
export const claimStandings = (entries) => {
  const standings = new Map()
  for (const entry of entries) {
    const held = heldIdsOf(entry)
    const verified = entry.report.state === 'verified'
    const origin = {
      source: entry.source.id,
      state: entry.report.state,
      reason: entry.report.reason
    }
    for (const claimId of idsIn(entry.raw.extract?.claims)) {
      standings.set(claimId, {
        ...origin,
        standing: standingOf(verified, held, claimId)
      })
    }
    for (const claimId of idsIn(entry.raw.verify?.missed)) {
      standings.set(claimId, {
        ...origin,
        standing: verified ? 'missed' : 'unverified'
      })
    }
  }
  return standings
}
