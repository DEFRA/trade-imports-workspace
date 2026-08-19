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

    // Only a control's alternatives are variants of a route. A task link or a
    // page link the crawl deferred is a different screen waiting to be mapped,
    // and counting it against the same cap is how a task list with four tasks
    // loses its fourth task for the whole run, under a reason that reads as
    // "you asked for three variants".
    const isVariant = entry.control != null
    const taken = isVariant ? (perRoute.get(entry.routeTemplate) ?? 0) : 0
    if (isVariant) perRoute.set(entry.routeTemplate, taken + 1)

    const cappedVariant =
      entry.capped || (isVariant && taken >= variantsPerRoute)

    let why = null
    if (cappedVariant) why = 'variant-cap'
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
