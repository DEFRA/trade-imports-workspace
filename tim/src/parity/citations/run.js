import { existsSync } from 'node:fs'
import { readJsonFile, writeJsonAtomic } from '../io.js'
import { parseBacklog } from '../schema.js'
import { tokeniseIncrement } from './parse.js'
import {
  listTrackedPaths,
  indexByBasename,
  resolveToken,
  makeLineCounter
} from './resolve.js'

/**
 * A citation that points into a captured page model or a delta file is a real
 * fourth class: it has a path and a line range, but the file lives in the
 * workarea rather than in a repo, so it never gets a permalink.
 *
 * @param {object} profile
 * @param {string} pathAsWritten
 * @returns {object|null}
 */
export const captureRoot = (profile, pathAsWritten) =>
  (profile.captureCitationRoots ?? []).find((root) =>
    pathAsWritten.includes(root.prefix)
  ) ?? null

// A page model is cited as `dr21-dashboard.json:7-11` and an archived DOM as
// `dr21-roles-and-addresses-complete.html:287-300`. Both live in the workarea
// rather than in a repo, so neither ever gets a permalink — and neither is a
// missing source file, which is what "unresolved" would claim.
const isCaptureName = (profile, pathAsWritten) => {
  const name = pathAsWritten.split('/').pop() ?? ''
  if (!/\.(json|html)$/.test(name)) return null
  for (const side of profile.sides) {
    if (name.startsWith(side.screenPrefix)) {
      return { side: side.id, screen: name.replace(/\.(json|html)$/, '') }
    }
  }
  return null
}

/**
 * Build the basename index for every repo the corpus cites, at its pinned
 * commit. Missing clones are skipped rather than fatal: a citation into a repo
 * nobody has cloned resolves to unresolved with a reason, which is information.
 *
 * @param {object} profile
 * @param {object} meta - .corpus-meta.json
 * @returns {Map<string, Map<string, string[]>>}
 */
export const buildIndexes = (profile, meta) => {
  const indexes = new Map()
  for (const [key, repo] of Object.entries(profile.repos)) {
    const sha = meta.pins?.[key]?.sha
    if (!sha || !repo.absolutePath || !existsSync(repo.absolutePath)) continue
    indexes.set(key, indexByBasename(listTrackedPaths(repo.absolutePath, sha)))
  }
  return indexes
}

/**
 * Turn one increment's prose into an ordered citations array, and replace each
 * token with its [[cN]] marker in a copy of the prose.
 *
 * The markers matter for two reasons the plan is explicit about: a copy editor
 * physically cannot mangle a reference while rewording the sentence around it,
 * and the checker can count references exactly.
 *
 * @param {object} args
 * @param {object} args.increment
 * @param {object} args.profile
 * @param {Map} args.indexes
 * @returns {{citations: object[], marked: Record<string, string>, unresolved: object[]}}
 */
const sideOwning = (profile, repoKey) =>
  Object.entries(profile.repoBySideDefault ?? {}).find(
    ([, repo]) => repo === repoKey
  )?.[0] ?? null

export const sideLabelsOf = (profile) =>
  (profile.sides ?? [])
    .filter((side) => side.paragraphLabels?.length)
    .map((side) => ({ id: side.id, labels: side.paragraphLabels }))

/**
 * A reference that exists in two repos borrows the side of its neighbours.
 *
 * A finding's paragraph is its unit of subject: one paragraph is about the
 * frontend, the next about the prototype. Where every unambiguous citation in a
 * paragraph lands in one repo, an ambiguous one in the same paragraph is about
 * that repo too. Where the paragraph disagrees with itself, nothing is inferred
 * and the citation stays queued.
 *
 * @param {Array<{token: object, resolved: object}>} pairs - First-pass results
 * @returns {Map<number, string>} paragraph index to repo key
 */
export const repoByParagraph = (pairs) => {
  const byParagraph = new Map()
  for (const { token, resolved } of pairs) {
    if (!resolved?.repo || token.field !== 'detail') continue
    const seen = byParagraph.get(token.paragraph) ?? new Set()
    seen.add(resolved.repo)
    byParagraph.set(token.paragraph, seen)
  }
  return new Map(
    [...byParagraph]
      .filter(([, repos]) => repos.size === 1)
      .map(([paragraph, repos]) => [paragraph, [...repos][0]])
  )
}

export const citeIncrement = ({ increment, profile, indexes, lineCount }) => {
  const tokens = tokeniseIncrement(increment, sideLabelsOf(profile))

  // Two passes, because a cross-repo ambiguity is settled by what its
  // neighbours resolved to, which is not known until they have.
  const firstPass = tokens.map((token) => ({
    token,
    resolved:
      captureRoot(profile, token.pathAsWritten ?? '') ||
      isCaptureName(profile, token.pathAsWritten ?? '')
        ? null
        : resolveToken({ token, profile, indexes, increment, lineCount })
  }))
  const paragraphRepo = repoByParagraph(firstPass)

  const citations = []
  const unresolved = []
  const byField = new Map()

  // One citation per distinct target, so a file cited three times in a finding
  // carries one marker number, not three.
  const keyOf = (resolved, token) =>
    resolved.path
      ? `${resolved.repo}:${resolved.path}:${token.lines.map((l) => `${l.start}-${l.end}`).join(',')}`
      : `unresolved:${token.field}:${token.offset}`

  const seen = new Map()

  for (const token of tokens) {
    const capture = captureRoot(profile, token.pathAsWritten ?? '')
    const model = capture
      ? null
      : isCaptureName(profile, token.pathAsWritten ?? '')

    let resolved =
      capture || model
        ? {
            repo: null,
            path: token.pathAsWritten,
            resolution: 'explicit'
          }
        : resolveToken({ token, profile, increment, indexes, lineCount })

    if (resolved.ambiguousRepos) {
      const borrowed = paragraphRepo.get(token.paragraph)
      if (borrowed && resolved.ambiguousRepos.includes(borrowed)) {
        resolved = resolveToken({
          token: { ...token, sideHint: sideOwning(profile, borrowed) },
          profile,
          increment,
          indexes,
          lineCount
        })
        if (resolved.repo) {
          resolved = {
            ...resolved,
            why: `Repo taken from the rest of this paragraph, every other citation in which is ${borrowed}.`
          }
        }
      }
    }

    const key = keyOf(resolved, token)
    let ref = seen.get(key)
    if (!ref) {
      ref = `c${citations.length + 1}`
      seen.set(key, ref)
      const citation = {
        ref,
        kind: capture || model ? 'capture' : 'code',
        side: token.sideHint ?? capture?.side ?? model?.side ?? null,
        repo: resolved.repo,
        path: resolved.path,
        lines: token.lines.length === 1 ? token.lines[0] : null,
        ranges: token.lines,
        asWritten: token.asWritten,
        anchors: anchorsNear(token),
        resolution: resolved.resolution,
        field: token.field,
        // Every field the same target was cited from. The evidence pointer and
        // a bare mention in the prose routinely dedupe to one citation, and
        // the report shows a column's evidence pointer separately, so one
        // field name is not enough to say where a citation came from.
        fields: [token.field]
      }
      if (model) citation.screen = model.screen
      if (resolved.why) citation.why = resolved.why
      if (resolved.candidates) citation.candidates = resolved.candidates
      if (resolved.resolution === 'unresolved') {
        citation.needsHuman = true
        unresolved.push({
          increment: increment.id,
          ref,
          asWritten: token.asWritten,
          field: token.field,
          why: resolved.why,
          candidates: resolved.candidates ?? [],
          sentence: token.sentence
        })
      }
      citations.push(citation)
    } else {
      // The same target written a second way — a bare basename in the prose and
      // the full path in the evidence field. Both forms have to be recorded or
      // invariant I3, which asks whether every token in the frozen detail is
      // covered by some citation, reports the second one as uncited.
      const citation = citations.find((entry) => entry.ref === ref)
      if (!citation.fields.includes(token.field)) {
        citation.fields.push(token.field)
      }
      if (citation.asWritten !== token.asWritten) {
        citation.alsoWritten = [
          ...new Set([...(citation.alsoWritten ?? []), token.asWritten])
        ]
      }
      citation.anchors = [
        ...new Set([...(citation.anchors ?? []), ...anchorsNear(token)])
      ]
    }

    if (!byField.has(token.field)) byField.set(token.field, [])
    byField.get(token.field).push({ ...token, ref })
  }

  return { citations, unresolved, marked: markFields(increment, byField) }
}

// The identifiers and quoted strings sitting next to a citation are what
// invariant I7 checks the resolved snippet actually contains. A wrong anchor
// surfaces as a warning on the card rather than as a silently widened line
// range — so what goes in has to be something that could literally appear in
// the file. A backticked fragment the analyst used to describe a shape
// (`packagingFields: []`, `{% if %}`) is a description, not a string.
const BACKTICKED = /`([^`]+)`/g
const QUOTED = /["“]([^"”]{5,})["”]/g

const LITERAL_IDENTIFIER = /^[A-Za-z_$][\w$.-]*(\(\))?$/

export const isCheckableAnchor = (value) =>
  LITERAL_IDENTIFIER.test(value) ||
  (value.includes(' ') && !/[`{}<>[\]]/.test(value))

const anchorsNear = (token) => {
  const anchors = new Set()
  const window = token.window ?? token.sentence ?? ''
  for (const match of window.matchAll(BACKTICKED)) anchors.add(match[1])
  for (const match of window.matchAll(QUOTED)) anchors.add(match[1])
  return [...anchors].filter(isCheckableAnchor)
}

const markFields = (increment, byField) => {
  const marked = {}
  for (const [field, tokens] of byField) {
    const text = fieldText(increment, field)
    if (typeof text !== 'string') continue
    let out = ''
    let cursor = 0
    for (const token of [...tokens].sort((a, b) => a.offset - b.offset)) {
      out += text.slice(cursor, token.offset)
      out += `[[${token.ref}]]`
      cursor = token.end
    }
    marked[field] = out + text.slice(cursor)
  }
  return marked
}

const fieldText = (increment, field) => {
  if (field === 'detail') return increment.detail
  if (field.startsWith('evidence.')) {
    return increment.evidence?.[field.slice('evidence.'.length)]
  }
  const noteMatch = field.match(/^notes\[(\d+)\]$/)
  if (noteMatch) return increment.notes?.[Number(noteMatch[1])]?.note
  if (field === 'decision') return increment.decision?.note
  return null
}

/**
 * Extract citations across the whole corpus.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {boolean} [args.write]
 * @returns {object}
 */
export const runCitations = ({ profile, write }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const meta = readJsonFile(profile.paths.meta)
  const indexes = buildIndexes(profile, meta)
  const lineCount = makeLineCounter(profile, meta)

  const unresolved = []
  const byResolution = {}
  let total = 0
  let withCitations = 0

  const increments = backlog.increments.map((increment) => {
    const result = citeIncrement({ increment, profile, indexes, lineCount })
    total += result.citations.length
    if (result.citations.length) withCitations += 1
    for (const citation of result.citations) {
      byResolution[citation.resolution] =
        (byResolution[citation.resolution] ?? 0) + 1
    }
    unresolved.push(...result.unresolved)
    // citations[] is judgement and belongs in the backlog. The marked-up prose
    // is a pure function of detail plus citations, so it goes to evidence.json
    // — baking it here would double the file and show every prose diff twice.
    return result.citations.length
      ? { ...increment, citations: result.citations }
      : increment
  })

  if (write) {
    writeJsonAtomic(profile.paths.backlog, { ...backlog, increments })
  }

  return {
    total,
    increments: withCitations,
    byResolution,
    unresolved,
    written: Boolean(write),
    path: profile.paths.backlog
  }
}
