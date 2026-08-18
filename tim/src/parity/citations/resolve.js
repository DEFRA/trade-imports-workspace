import { execFileSync } from 'node:child_process'
import { basename, dirname } from 'node:path'
import { TimError } from '../../errors.js'
import { stripPathRoot } from '../corpus-profile.js'

/**
 * Every tracked path in a repo at one commit. Read from git rather than from
 * the working tree: repos/ checkouts are routinely mid-spike, and a citation
 * must resolve against the code the finding was written about.
 *
 * @param {string} repoPath - Absolute path to the local clone
 * @param {string} sha
 * @returns {string[]}
 */
export const listTrackedPaths = (repoPath, sha) => {
  try {
    return execFileSync(
      'git',
      ['-C', repoPath, 'ls-tree', '-r', '--name-only', sha],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    )
      .split('\n')
      .filter(Boolean)
  } catch (error) {
    throw new TimError(
      'NOT_FOUND',
      `Can't list files in ${repoPath} at ${sha}: ${error.message}`
    )
  }
}

/**
 * How many lines a file has at a commit, cached. Used to rule out a candidate
 * that is too short to hold the cited line.
 *
 * @param {object} profile
 * @param {object} meta - .corpus-meta.json
 * @returns {(repoKey: string, path: string) => number|null}
 */
export const makeLineCounter = (profile, meta) => {
  const cache = new Map()
  return (repoKey, path) => {
    const key = `${repoKey}:${path}`
    if (cache.has(key)) return cache.get(key)
    const repo = profile.repos[repoKey]
    const sha = meta?.pins?.[repoKey]?.sha
    let count = null
    if (repo?.absolutePath && sha) {
      try {
        count = execFileSync(
          'git',
          ['-C', repo.absolutePath, 'show', `${sha}:${path}`],
          { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
        ).split('\n').length
      } catch {
        count = null
      }
    }
    cache.set(key, count)
    return count
  }
}

/**
 * Build a basename index for one repo so a bare reference can find every
 * candidate at once.
 *
 * @param {string[]} paths
 * @returns {Map<string, string[]>}
 */
export const indexByBasename = (paths) => {
  const index = new Map()
  for (const path of paths) {
    const name = basename(path)
    if (!index.has(name)) index.set(name, [])
    index.get(name).push(path)
  }
  return index
}

/**
 * Narrow a basename's candidates by the directory segments the prose actually
 * wrote. `consignment-details/fields.js` names one of the four files called
 * fields.js outright; treating it as a bare basename throws that away and
 * queues a citation that was never ambiguous.
 *
 * @param {string[]} candidates - Repo-relative paths sharing the basename
 * @param {string} written - The path exactly as the prose wrote it
 * @returns {string[]}
 */
export const narrowBySuffix = (candidates, written) => {
  if (!written.includes('/')) return candidates
  const suffix = written.replace(/^\/+/, '')
  const matched = candidates.filter(
    (path) => path === suffix || path.endsWith(`/${suffix}`)
  )
  return matched.length ? matched : candidates
}

const sharedPrefixLength = (a, b) => {
  const left = a.split('/')
  const right = b.split('/')
  let n = 0
  while (n < left.length && n < right.length && left[n] === right[n]) n += 1
  return n
}

/**
 * Rank candidates for a bare basename. The evidence path for the same side is
 * the strongest signal — the analyst wrote it — then the increment's domain
 * appearing in the path, then how deep in the tree the file sits, on the
 * argument that a shallower file is the more likely subject of a bare
 * reference.
 *
 * @param {object} args
 * @param {string[]} args.candidates - Repo-relative paths sharing the basename
 * @param {string|null} args.evidencePath - The evidence path for the same side
 * @param {string|null} args.domain
 * @returns {Array<{path: string, score: number[]}>} Best first
 */
export const rankCandidates = ({ candidates, evidencePath, domain }) => {
  const evidenceDir = evidencePath ? dirname(evidencePath) : null
  return candidates
    .map((path) => ({
      path,
      score: [
        evidenceDir ? sharedPrefixLength(evidenceDir, dirname(path)) : 0,
        domain && path.includes(`/${domain}/`) ? 1 : 0,
        -path.split('/').length
      ]
    }))
    .sort((a, b) => {
      for (let i = 0; i < a.score.length; i += 1) {
        if (a.score[i] !== b.score[i]) return b.score[i] - a.score[i]
      }
      return a.path.localeCompare(b.path)
    })
}

/**
 * Resolve one token to a repo and a repo-relative path, or refuse.
 *
 * A confidently wrong permalink is worse than the inert <code> the current
 * page renders, so anything the ranking cannot separate is queued rather than
 * guessed: the winner must beat the runner-up outright.
 *
 * @param {object} args
 * @param {object} args.token - From the tokeniser
 * @param {object} args.profile - A loaded corpus profile
 * @param {object} args.increment - The increment the token came from
 * @param {Map<string, Map<string, string[]>>} args.indexes - repo key to basename index
 * @returns {{repo: string, path: string, resolution: string, why?: string, candidates?: string[]}}
 */
export const resolveToken = ({
  token,
  profile,
  increment,
  indexes,
  lineCount
}) => {
  if (token.needsHuman || !token.pathAsWritten) {
    return {
      repo: null,
      path: null,
      resolution: 'unresolved',
      why:
        token.form === 'continuation'
          ? `Bare ":${token.lines[0]?.start}" in a sentence that names files on both sides — proximity is not evidence here.`
          : 'No path to resolve.'
    }
  }

  const side = token.sideHint ?? sideForToken({ token, profile, increment })
  const preferredRepo = side ? profile.repoBySideDefault?.[side] : undefined

  // An explicit path root settles it outright: the analyst wrote the repo in.
  const stripped = token.pathAsWritten.includes('/')
    ? stripPathRoot(profile, token.pathAsWritten, preferredRepo)
    : null
  if (stripped) {
    const tracked = indexes.get(stripped.repo)?.get(basename(stripped.path))
    // An explicit root that names a file the repo does not have is a stale
    // pointer, not a resolution. Fall through and let the suffix narrowing
    // find where the file moved to.
    if (!tracked || tracked.includes(stripped.path)) {
      return { ...stripped, resolution: 'explicit' }
    }
  }

  const name = basename(token.pathAsWritten)
  const repoOrder = preferredRepo
    ? [
        preferredRepo,
        ...Object.keys(profile.repos).filter((r) => r !== preferredRepo)
      ]
    : Object.keys(profile.repos)

  // `routes.js` is a file in both codebases. With no side to go on, taking the
  // first repo in the list is not a resolution, it is the order of a JSON
  // object deciding which side a finding is about.
  if (!preferredRepo) {
    let reposHolding = repoOrder.filter(
      (repoKey) =>
        narrowBySuffix(
          indexes.get(repoKey)?.get(name) ?? [],
          token.pathAsWritten
        ).length > 0
    )
    // A candidate whose file is shorter than the cited line is not a candidate.
    // The frontend's routes.js is 76 lines and the prototype's is 10,997, so
    // `routes.js:10303` has exactly one possible home. This is arithmetic, not
    // a preference.
    if (reposHolding.length > 1 && lineCount && token.lines.length) {
      const highest = Math.max(...token.lines.map((line) => line.end))
      const longEnough = reposHolding.filter((repoKey) =>
        narrowBySuffix(
          indexes.get(repoKey)?.get(name) ?? [],
          token.pathAsWritten
        ).some((path) => (lineCount(repoKey, path) ?? Infinity) >= highest)
      )
      if (longEnough.length > 0) reposHolding = longEnough
    }
    if (reposHolding.length === 1) {
      return resolveWithin({
        repoKey: reposHolding[0],
        token,
        profile,
        increment,
        indexes,
        name,
        why: `Only ${reposHolding[0]} has a ${name} long enough to have the cited line.`
      })
    }
    if (reposHolding.length > 1) {
      return {
        repo: null,
        path: null,
        resolution: 'unresolved',
        ambiguousRepos: reposHolding,
        why: `"${token.pathAsWritten}" exists in ${reposHolding.join(' and ')}, and nothing in this finding says which side it means.`,
        candidates: reposHolding.flatMap((repoKey) =>
          narrowBySuffix(
            indexes.get(repoKey)?.get(name) ?? [],
            token.pathAsWritten
          ).map((path) => `${repoKey}:${path}`)
        )
      }
    }
  }

  for (const repoKey of repoOrder) {
    if ((indexes.get(repoKey)?.get(name) ?? []).length === 0) continue
    return resolveWithin({
      repoKey,
      token,
      profile,
      increment,
      indexes,
      name,
      side
    })
  }

  return {
    repo: null,
    path: null,
    resolution: 'unresolved',
    why: `"${name}" is not a tracked file in any repo this corpus cites.`
  }
}

/**
 * Pick one file inside one repo, or refuse.
 *
 * @param {object} args
 * @returns {object}
 */
const resolveWithin = ({
  repoKey,
  token,
  profile,
  increment,
  indexes,
  name,
  side,
  why
}) => {
  const candidates = narrowBySuffix(
    indexes.get(repoKey)?.get(name) ?? [],
    token.pathAsWritten
  )
  // The evidence path to rank against is the one for the side that owns this
  // repo, not the one the sentence hinted at: we are searching the prototype
  // repo, so the prototype evidence is what the analyst pointed at.
  const evidenceSide = sideOwning(profile, repoKey) ?? side
  const ranked = rankCandidates({
    candidates,
    evidencePath: evidencePathFor({
      increment,
      side: evidenceSide,
      profile,
      repoKey
    }),
    domain: increment.domain
  })
  const resolution =
    token.form === 'continuation' ? 'continuation' : 'basename-resolved'

  if (ranked.length === 1) {
    return { repo: repoKey, path: ranked[0].path, resolution, why }
  }
  const [best, next] = ranked
  if (best.score.some((value, i) => value !== next.score[i])) {
    return { repo: repoKey, path: best.path, resolution, why }
  }
  return {
    repo: null,
    path: null,
    resolution: 'unresolved',
    why: `"${name}" matches ${candidates.length} files in ${repoKey} and nothing separates the top two.`,
    candidates: ranked.slice(0, 6).map((c) => c.path)
  }
}

const sideOwning = (profile, repoKey) =>
  Object.entries(profile.repoBySideDefault ?? {}).find(
    ([, repo]) => repo === repoKey
  )?.[0] ?? null

const sideForToken = ({ token, profile, increment }) => {
  if (token.sideHint) return token.sideHint
  // A screen prefix in the sentence is the only side signal a detail sentence
  // reliably carries. Absent one, leave it unattributed.
  for (const side of profile.sides) {
    if (token.sentence?.includes(side.screenPrefix)) return side.id
  }
  return increment.screens?.length === 0 ? null : null
}

const evidencePathFor = ({ increment, side, profile, repoKey }) => {
  const raw = side ? increment.evidence?.[side] : null
  if (typeof raw !== 'string') return null
  const first = raw.split(':')[0].trim()
  const stripped = stripPathRoot(profile, first, repoKey)
  return stripped?.repo === repoKey ? stripped.path : null
}
