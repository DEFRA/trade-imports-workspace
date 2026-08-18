import { expandHome } from './corpus-profile.js'

/**
 * Every path prefix the corpus knows about, longest first, with the value it
 * normalises to. A prefix carrying impliedPrefix is already repo-relative and
 * is not rewritten — it is here so the resolver can recognise it, not so the
 * normaliser can strip it.
 *
 * @param {object} profile - A loaded corpus profile
 * @returns {Array<{prefix: string, repo: string}>}
 */
export const rewritablePrefixes = (profile) => {
  const prefixes = []
  for (const [repoKey, repo] of Object.entries(profile.repos)) {
    for (const root of repo.pathRoots) {
      if (root.impliedPrefix) continue
      prefixes.push({ prefix: root.prefix, repo: repoKey })
      // A finding written on a machine where ~ was already expanded, or the
      // other way round. Both forms appear in this corpus.
      if (root.prefix.startsWith('~/')) {
        prefixes.push({ prefix: expandHome(root.prefix), repo: repoKey })
      }
    }
  }
  return prefixes.sort((a, b) => b.prefix.length - a.prefix.length)
}

/**
 * Rewrite every path root occurring anywhere in a string to repo-relative.
 * Operates on the whole string rather than on a parsed citation, because
 * evidence values carry semicolon-joined citations and parenthetical prose
 * around them, and the prose must survive untouched.
 *
 * @param {string} text
 * @param {Array<{prefix: string}>} prefixes - From rewritablePrefixes
 * @returns {string}
 */
export const rewritePathRoots = (text, prefixes) => {
  if (typeof text !== 'string') return text
  let out = text
  for (const { prefix } of prefixes) {
    if (!out.includes(prefix)) continue
    out = out.split(prefix).join('')
  }
  return out
}

/**
 * Split a screens entry that names both sides of a pair in one slash-joined
 * string. Anything without the separator is returned as itself.
 *
 * @param {string} screen
 * @returns {string[]}
 */
export const splitScreen = (screen) =>
  screen.includes(' / ')
    ? screen
        .split(' / ')
        .map((part) => part.trim())
        .filter(Boolean)
    : [screen]

const uniqueInOrder = (values) => {
  const seen = new Set()
  return values.filter((value) => {
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

/**
 * Pass 0. Normalise path roots and slash-joined screens, and stamp the corpus
 * id, without touching anything the build loop keys on.
 *
 * Returns a new backlog plus a per-increment change record, so --write can be
 * an atomic write of a value the caller has already been able to inspect.
 *
 * @param {object} backlog - The parsed backlog
 * @param {object} profile - A loaded corpus profile
 * @returns {{backlog: object, changes: object[]}}
 */
export const normaliseBacklog = (backlog, profile) => {
  const prefixes = rewritablePrefixes(profile)
  const changes = []

  const increments = backlog.increments.map((increment) => {
    const change = { id: increment.id, evidence: [], screens: [] }

    const evidence = Object.fromEntries(
      Object.entries(increment.evidence ?? {}).map(([side, value]) => {
        const rewritten = rewritePathRoots(value, prefixes)
        if (rewritten !== value) change.evidence.push(side)
        return [side, rewritten]
      })
    )

    const screens = uniqueInOrder(
      (increment.screens ?? []).flatMap((screen) => {
        const parts = splitScreen(screen)
        if (parts.length > 1) change.screens.push(screen)
        return parts
      })
    )

    if (change.evidence.length || change.screens.length) changes.push(change)
    return { ...increment, evidence, screens }
  })

  return {
    backlog: { ...backlog, corpus: profile.id, increments },
    changes
  }
}
