import { existsSync } from 'node:fs'
import { readJsonFile, writeJsonAtomic } from '../io.js'
import { parseBacklog } from '../schema.js'
import { permalink, existsAtCommit, blobId } from './github-url.js'
import { readAtCommit, sliceSnippet, checkAnchors } from './snippet.js'
import { tokeniseIncrement } from './parse.js'

/**
 * Re-derive the [[cN]]-marked prose for one increment from its stored
 * citations. Pure function of detail plus citations, which is why it lives in
 * evidence.json rather than doubling the backlog.
 *
 * @param {object} increment
 * @returns {Record<string, string>}
 */
export const markedProse = (increment) => {
  const citations = increment.citations ?? []
  if (citations.length === 0) return {}
  const byWritten = new Map()
  for (const citation of citations) {
    if (!byWritten.has(citation.asWritten)) {
      byWritten.set(citation.asWritten, citation.ref)
    }
  }

  const tokens = tokeniseIncrement(increment)
  const byField = new Map()
  for (const token of tokens) {
    const ref = byWritten.get(token.asWritten)
    if (!ref) continue
    if (!byField.has(token.field)) byField.set(token.field, [])
    byField.get(token.field).push({ ...token, ref })
  }

  const out = {}
  for (const [field, list] of byField) {
    const text = sourceText(increment, field)
    if (typeof text !== 'string') continue
    let marked = ''
    let cursor = 0
    for (const token of list.sort((a, b) => a.offset - b.offset)) {
      marked += text.slice(cursor, token.offset)
      marked += `[[${token.ref}]]`
      cursor = token.end
    }
    out[field] = marked + text.slice(cursor)
  }
  return out
}

const sourceText = (increment, field) => {
  if (field === 'detail') return increment.detail
  if (field.startsWith('evidence.')) {
    return increment.evidence?.[field.slice('evidence.'.length)]
  }
  const note = field.match(/^notes\[(\d+)\]$/)
  if (note) return increment.notes?.[Number(note[1])]?.note
  if (field === 'decision') return increment.decision?.note
  return null
}

const rangeOf = (citation) => citation.lines ?? citation.ranges?.[0] ?? null

/**
 * Resolve one citation to a URL, a blob id and a snippet.
 *
 * @param {object} args
 * @param {object} args.citation
 * @param {object} args.profile
 * @param {object} args.meta
 * @returns {object}
 */
export const resolveCitation = ({ citation, profile, meta }) => {
  if (citation.kind === 'capture') {
    return {
      ref: citation.ref,
      state: 'capture',
      url: null,
      note: 'Captured page model — lives in the workarea, so it has no permalink.',
      path: citation.path
    }
  }
  if (!citation.repo || !citation.path) {
    return { ref: citation.ref, state: 'unresolved', why: citation.why ?? null }
  }

  const repo = profile.repos[citation.repo]
  const pin = meta.pins?.[citation.repo]
  if (!repo || !pin) {
    return {
      ref: citation.ref,
      state: 'unpinned',
      why: `No pin recorded for repo "${citation.repo}".`
    }
  }

  const exists = existsAtCommit(repo.absolutePath, pin.sha, citation.path)
  if (!exists) {
    return {
      ref: citation.ref,
      state: 'dead',
      url: permalink({
        repo,
        sha: pin.sha,
        path: citation.path,
        lines: rangeOf(citation)
      }),
      why: `${citation.path} does not exist at ${pin.short}. The citation is stale, or the file moved.`
    }
  }

  const range = rangeOf(citation)
  const fileLines = readAtCommit(repo.absolutePath, pin.sha, citation.path)
  const snippet =
    range && fileLines ? sliceSnippet({ lines: fileLines, range }) : null

  // Two different answers, and conflating them wastes the check. An anchor
  // present in the file but outside the cited lines is a range that drifted —
  // widen it. An anchor absent from the whole file is the finding's premise
  // having moved, which is a finding about the finding.
  const inSnippet = snippet
    ? checkAnchors({ anchors: citation.anchors, lines: snippet.lines })
    : null
  const inFile = fileLines
    ? checkAnchors({
        anchors: inSnippet?.missing ?? citation.anchors,
        lines: fileLines.map((text, i) => ({ n: i + 1, text }))
      })
    : null
  const anchors = inSnippet
    ? {
        ok: inSnippet.ok,
        missing: inSnippet.missing,
        missingFromFile: inFile?.missing ?? [],
        outOfRange: (inSnippet.missing ?? []).filter(
          (anchor) => !(inFile?.missing ?? []).includes(anchor)
        )
      }
    : null

  return {
    ref: citation.ref,
    state: snippet?.state === 'too-long' ? 'too-long' : 'resolved',
    url: permalink({ repo, sha: pin.sha, path: citation.path, lines: range }),
    blob: blobId(repo.absolutePath, pin.sha, citation.path),
    sha: pin.sha,
    pushed: pin.pushed,
    fileLines: fileLines?.length ?? null,
    snippet: snippet?.state === 'too-long' ? null : snippet,
    anchorCheck: anchors
  }
}

/**
 * Build evidence.json: one entry per increment holding the resolved citations
 * and the marked-up prose.
 *
 * Both files are tracked and each has one job. `git diff backlog.json` stays a
 * clean prose review; `git diff evidence.json` after a re-pin shows exactly
 * which citations moved and which changed content.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {boolean} [args.write]
 * @returns {object}
 */
export const runEvidence = ({ profile, write }) => {
  const backlog = parseBacklog(readJsonFile(profile.paths.backlog))
  const meta = existsSync(profile.paths.meta)
    ? readJsonFile(profile.paths.meta)
    : { pins: {} }

  const byState = {}
  const anchorMisses = []
  const outOfRange = []
  const increments = {}
  let total = 0
  let resolved = 0

  for (const increment of backlog.increments) {
    const citations = increment.citations ?? []
    if (citations.length === 0) continue
    const entries = citations.map((citation) => {
      const result = resolveCitation({ citation, profile, meta })
      total += 1
      byState[result.state] = (byState[result.state] ?? 0) + 1
      if (result.state === 'resolved') resolved += 1
      if (result.anchorCheck?.missingFromFile?.length) {
        anchorMisses.push({
          increment: increment.id,
          ref: citation.ref,
          missing: result.anchorCheck.missingFromFile,
          path: citation.path,
          kind: 'absent-from-file'
        })
      } else if (result.anchorCheck?.outOfRange?.length) {
        outOfRange.push({
          increment: increment.id,
          ref: citation.ref,
          anchors: result.anchorCheck.outOfRange,
          path: citation.path
        })
      }
      return result
    })
    increments[increment.id] = {
      citations: entries,
      prose: markedProse(increment)
    }
  }

  const payload = {
    corpus: profile.id,
    run_id: profile.runId,
    generatedFrom: {
      pins: Object.fromEntries(
        Object.entries(meta.pins ?? {}).map(([key, pin]) => [key, pin.sha])
      )
    },
    increments,
    unresolved: Object.entries(increments).flatMap(([id, entry]) =>
      entry.citations
        .filter((citation) => citation.state === 'unresolved')
        .map((citation) => ({ increment: id, ...citation }))
    ),
    anchorMisses,
    outOfRange
  }

  if (write) writeJsonAtomic(profile.paths.evidence, payload)

  return {
    total,
    resolved,
    byState,
    anchorMisses,
    outOfRange,
    written: Boolean(write),
    path: profile.paths.evidence
  }
}
