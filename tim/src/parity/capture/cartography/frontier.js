/**
 * The identity of a choice, so the same choice found twice is one entry.
 *
 * @param {object} entry
 * @returns {string}
 */
export const frontierKey = (entry) =>
  [
    entry.routeTemplate,
    entry.kind,
    entry.control ?? '',
    entry.value ?? entry.label ?? ''
  ].join('|')

const DEFERRED_LAST = new Set(['destructive-deferred'])

/**
 * The queue of choices the crawl has seen and not taken.
 *
 * This is an output, not a log. Every unexplored option is kept with the route
 * that reaches it and a typed reason it is still unexplored, so coverage is
 * countable and a partial map cannot pass for a complete one. A frontier that
 * only ever held work would let the map say nothing about what it skipped.
 *
 * @param {object} args
 * @param {{variantsPerRoute?: number, replayDepth?: number}} [args.caps]
 * @returns {object}
 */
export const makeFrontier = ({ caps = {} } = {}) => {
  const { variantsPerRoute = 3, replayDepth = 30 } = caps
  const entries = []
  const seen = new Set()
  const perRoute = new Map()

  const push = (entry) => {
    const key = frontierKey(entry)
    if (seen.has(key)) return null
    seen.add(key)

    const taken = perRoute.get(entry.routeTemplate) ?? 0
    perRoute.set(entry.routeTemplate, taken + 1)

    let why = null
    if (entry.capped || taken >= variantsPerRoute) why = 'variant-cap'
    else if ((entry.prefix?.length ?? 0) > replayDepth) why = 'replay-depth'
    else if (entry.class === 'destructive') why = 'destructive-deferred'

    const stored = { ...entry, key, why, explored: false }
    entries.push(stored)
    return stored
  }

  const explorable = () =>
    entries.filter(
      (entry) =>
        !entry.explored && (entry.why === null || DEFERRED_LAST.has(entry.why))
    )

  const take = () => {
    const ready = explorable()
    const next =
      ready.find((entry) => entry.why === null) ??
      ready.find((entry) => DEFERRED_LAST.has(entry.why)) ??
      null
    if (next) next.explored = true
    return next
  }

  const closeOut = (why) => {
    for (const entry of entries) {
      if (!entry.explored && entry.why === null) entry.why = why
    }
  }

  const remaining = () =>
    entries
      .filter((entry) => !entry.explored)
      .map(({ prefix, ...rest }) => ({
        ...rest,
        via: (prefix ?? []).length,
        why: rest.why ?? 'unexplored'
      }))

  return {
    push,
    take,
    closeOut,
    remaining,
    get size() {
      return entries.length
    },
    get pending() {
      return explorable().length
    }
  }
}
