import { existsSync } from 'node:fs'
import { readJsonFile, writeJsonAtomic } from '../io.js'
import { parseBacklog } from '../schema.js'
import { permalink, existsAtCommit, blobId } from './github-url.js'
import { readAtCommit, sliceSnippet, citedText, rangesOf } from './snippet.js'
import { classifyAnchors, capturedPageReader } from './anchor-check.js'
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
    for (const form of [citation.asWritten, ...(citation.alsoWritten ?? [])]) {
      if (!byWritten.has(form)) byWritten.set(form, citation.ref)
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

/**
 * The file a citation points at and the text of the lines it cites.
 *
 * Read once per citation and shared across the increment, because the anchor
 * check now asks the finding's other citations whether they hold a string this
 * one does not, and re-shelling out to git for each of those pairs would turn a
 * two-minute command into a twenty-minute one.
 *
 * @param {object} args
 * @returns {{ranges: object[], fileLines: string[]|null, cited: string|null,
 *   file: string|null}}
 */
export const readSource = ({ citation, profile, meta, cache = new Map() }) => {
  const ranges = rangesOf(citation)
  const repo = profile.repos?.[citation.repo]
  const sha = meta.pins?.[citation.repo]?.sha
  if (!repo || !sha || !citation.path) {
    return { ranges, fileLines: null, cited: null, file: null }
  }
  const key = `${citation.repo}:${sha}:${citation.path}`
  if (!cache.has(key)) {
    cache.set(key, readAtCommit(repo.absolutePath, sha, citation.path))
  }
  const fileLines = cache.get(key)
  return {
    ranges,
    fileLines,
    cited: fileLines && ranges.length ? citedText(fileLines, ranges) : null,
    file: fileLines ? fileLines.join('\n') : null
  }
}

/**
 * Resolve one citation to a URL, a blob id and a snippet.
 *
 * @param {object} args
 * @param {object} args.citation
 * @param {object} args.profile
 * @param {object} args.meta
 * @param {Map<string, object>} [args.sources] - readSource by ref, for the
 *   whole increment, so the anchor check can look at the finding's other
 *   citations
 * @param {string[]} [args.pages] - Captured page HTML for this finding
 * @returns {object}
 */
export const resolveCitation = ({
  citation,
  profile,
  meta,
  sources,
  pages = []
}) => {
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
        lines: rangesOf(citation)[0] ?? null
      }),
      why: `${citation.path} does not exist at ${pin.short}. The citation is stale, or the file moved.`
    }
  }

  const source =
    sources?.get(citation.ref) ?? readSource({ citation, profile, meta })
  const { ranges, fileLines } = source
  const snippet =
    ranges.length && fileLines
      ? sliceSnippet({ lines: fileLines, ranges })
      : null

  const anchors = fileLines
    ? classifyAnchors({
        anchors: citation.anchors,
        own: source,
        siblings: [...(sources?.entries() ?? [])]
          .filter(([ref]) => ref !== citation.ref)
          .map(([ref, entry]) => ({ ref, ...entry })),
        pages
      })
    : null

  // GitHub's fragment holds one range, so `url` stays the first of them and the
  // rest are offered beside it. A citation written `fields.js:27,54,68` is
  // three places in one file and a link to the first is a link to a third of
  // what the prose said.
  const urls = ranges.map((range) => ({
    lines: range,
    url: permalink({ repo, sha: pin.sha, path: citation.path, lines: range })
  }))

  return {
    ref: citation.ref,
    state: 'resolved',
    url: urls[0]?.url ?? permalink({ repo, sha: pin.sha, path: citation.path }),
    urls,
    blob: blobId(repo.absolutePath, pin.sha, citation.path),
    sha: pin.sha,
    pushed: pin.pushed,
    fileLines: fileLines?.length ?? null,
    snippet,
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
  const explained = []
  const increments = {}
  const fileCache = new Map()
  const readPages = capturedPageReader(profile.sides ?? [])
  let total = 0
  let resolved = 0
  let truncated = 0

  for (const increment of backlog.increments) {
    const citations = increment.citations ?? []
    if (citations.length === 0) continue
    const sources = new Map(
      citations.map((citation) => [
        citation.ref,
        readSource({ citation, profile, meta, cache: fileCache })
      ])
    )
    const pages = readPages(increment.screens)
    const entries = citations.map((citation) => {
      const result = resolveCitation({
        citation,
        profile,
        meta,
        sources,
        pages
      })
      total += 1
      byState[result.state] = (byState[result.state] ?? 0) + 1
      if (result.state === 'resolved') resolved += 1
      if (result.snippet?.truncated) truncated += 1
      // Two independent facts about one citation. An `else if` here hid the
      // out-of-range anchor on any citation that also had an absent one, which
      // is why this list and check-evidence's — which never had the else —
      // disagreed by three.
      if (result.anchorCheck?.missingFromFile?.length) {
        anchorMisses.push({
          increment: increment.id,
          ref: citation.ref,
          missing: result.anchorCheck.missingFromFile,
          path: citation.path,
          kind: 'absent-from-file'
        })
      }
      if (result.anchorCheck?.outOfRange?.length) {
        outOfRange.push({
          increment: increment.id,
          ref: citation.ref,
          anchors: result.anchorCheck.outOfRange,
          path: citation.path
        })
      }
      const check = result.anchorCheck
      if (
        check?.inSibling.length ||
        check?.interpolated.length ||
        check?.rendered.length
      ) {
        explained.push({
          increment: increment.id,
          ref: citation.ref,
          path: citation.path,
          inSibling: check.inSibling,
          interpolated: check.interpolated,
          rendered: check.rendered
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
    outOfRange,
    explained
  }

  if (write) writeJsonAtomic(profile.paths.evidence, payload)

  return {
    total,
    resolved,
    truncated,
    byState,
    anchorMisses,
    outOfRange,
    explained,
    written: Boolean(write),
    path: profile.paths.evidence
  }
}
