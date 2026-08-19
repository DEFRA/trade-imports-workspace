import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { readJsonFile, writeJsonAtomic } from './io.js'
import { CORPORA_FILE } from './corpus-profile.js'
import { THEME_CSS } from './render/theme.js'
import { esc } from './render/prose.js'

/**
 * Read one side's capture manifest at a given sha.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {object} args.side
 * @param {string} args.sha
 * @returns {object|null}
 */
export const manifestAt = ({ profile, side, sha }) => {
  if (!side.evidenceRoot || !sha) return null
  const dir = join(
    profile.workspaceRoot,
    side.evidenceRoot,
    `${side.id}@${sha}`
  )
  const path = join(dir, 'manifest.json')
  return existsSync(path) ? { dir, ...readJsonFile(path) } : null
}

/**
 * What a repoint would do to each screen, screen by screen.
 *
 * Three answers, and they are different things: a screen whose bytes are
 * identical is not evidence of anything moving, a screen that changed needs
 * looking at, and a screen that exists on only one side of the move is either
 * new coverage or coverage lost — which is the one a silent overwrite hides.
 *
 * @param {object} args
 * @param {object} args.from - The manifest being superseded
 * @param {object} args.to - The manifest superseding it
 * @returns {object[]}
 */
export const compareCaptures = ({ from, to }) => {
  const before = new Map((from?.rows ?? []).map((row) => [row.screen, row]))
  const after = new Map((to?.rows ?? []).map((row) => [row.screen, row]))
  const screens = [...new Set([...before.keys(), ...after.keys()])].sort()
  return screens.map((screen) => {
    const was = before.get(screen) ?? null
    const now = after.get(screen) ?? null
    if (!was) return { screen, verdict: 'gained', was, now }
    if (!now) return { screen, verdict: 'lost', was, now }
    if (was.sha256 === now.sha256)
      return { screen, verdict: 'identical', was, now }
    return { screen, verdict: 'changed', was, now }
  })
}

const VERDICTS = {
  changed: 'The picture moved. Look at both before you accept it.',
  gained: 'New — this screen had no picture at the old capture.',
  lost: 'Gone — the new capture did not reach this screen. Accepting loses it.',
  identical: 'Byte-identical. Nothing to look at.'
}

const columns = ({ row, fromRel, toRel }) => {
  const shot = (side, rel, entry) =>
    entry
      ? `<figure class="shot__figure"><img loading="lazy" src="${esc(join(rel, entry.file))}" alt="${esc(side)} ${esc(row.screen)}">
      <figcaption class="shot__caption">${esc(side)} · ${(entry.bytes / 1024).toFixed(0)} KB${entry.size ? ` · ${entry.size.width}×${entry.size.height}` : ''}</figcaption></figure>`
      : `<div class="shot__missing"><strong>No picture</strong><span>${esc(side)} has nothing for this screen.</span></div>`
  return `<div class="shot">${shot('Superseded', fromRel, row.was)}</div>
  <div class="shot">${shot('Replacing it', toRel, row.now)}</div>`
}

/**
 * The page a person confirms a repoint from.
 *
 * A repoint replaces every picture in a corpus at once. Doing that from a
 * command line means accepting a change nobody has seen, which is the same
 * failure the seal store exists to stop — so the swap gets looked at first,
 * old beside new, at full size.
 *
 * @param {object} args
 * @returns {string}
 */
export const renderRepoint = ({ side, from, to, rows, fromRel, toRel }) => {
  const counts = rows.reduce((acc, row) => {
    acc[row.verdict] = (acc[row.verdict] ?? 0) + 1
    return acc
  }, {})
  const worth = rows.filter((row) => row.verdict !== 'identical')

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Repoint ${esc(side)} — ${esc(from?.appSha?.slice(0, 8) ?? 'nothing')} to ${esc(to?.appSha?.slice(0, 8) ?? '')}</title>
<style>${THEME_CSS}</style>
</head>
<body>
<div class="page">
  <header class="masthead">
    <p class="masthead__eyebrow">Repoint preview</p>
    <h1>${esc(side)}: ${esc(from?.appSha?.slice(0, 8) ?? 'nothing')} → ${esc(to?.appSha?.slice(0, 8) ?? '')}</h1>
    <p class="masthead__blurb">Nothing has been changed. This page is what accepting would do, screen by screen, old on the left and new on the right. ${counts.identical ?? 0} screens are byte-identical and are not shown.</p>
    <div class="figures">
      ${['changed', 'gained', 'lost', 'identical']
        .map(
          (verdict) =>
            `<div class="figure"><span class="figure__n">${counts[verdict] ?? 0}</span><span class="figure__label">${verdict}</span></div>`
        )
        .join('')}
    </div>
  </header>

  ${
    counts.lost
      ? `<div class="drift"><strong>${counts.lost} screens have no picture in the new capture.</strong>
  <p>Accepting this repoint loses them. If that is not what you meant, fix the capture run first — a screen the harness could not reach is a gap to record, not a picture to drop.</p></div>`
      : ''
  }

  ${worth
    .map(
      (row) => `<section class="card" id="${esc(row.screen)}">
    <div class="card__head">
      <h2 class="card__title"><code>${esc(row.screen)}</code></h2>
      <p class="card__meta">${esc(VERDICTS[row.verdict])}</p>
    </div>
    <div class="card__shots">${columns({ row, fromRel, toRel })}</div>
  </section>`
    )
    .join('\n')}

  <footer class="footer">
    <span>Accept with <code>tim parity repoint &lt;runId&gt; --side ${esc(side)} --to ${esc(to?.appSha?.slice(0, 8) ?? '')} --accept</code>. It writes the new sha into corpora.json and nothing else: the seals still hold the old pictures, so the next report render lists every screen that moved in its drift panel.</span>
  </footer>
</div>
</body>
</html>`
}

/**
 * Build the repoint preview, and optionally accept it.
 *
 * The preview is always written. `--accept` additionally points the corpus at
 * the new capture, and does nothing else: see acceptRepoint for why the seals
 * are deliberately left alone.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.side
 * @param {string} args.to - The sha to repoint to
 * @param {boolean} [args.accept]
 * @returns {object}
 */
export const runRepoint = ({ profile, side: sideId, to, accept }) => {
  const side = profile.sideById[sideId]
  if (!side) {
    throw new Error(
      `Unknown side "${sideId}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }
  const fromSha = profile.captures?.[sideId]?.sha ?? null
  const from = manifestAt({ profile, side, sha: fromSha })
  const target = manifestAt({ profile, side, sha: to })
  if (!target) {
    throw new Error(
      `No capture at ${sideId}@${to}. Capture it first: ${side.captureCommand ?? '(no command recorded for this side)'}`
    )
  }

  const rows = compareCaptures({ from, to: target })
  const outDir = join(profile.paths.reportDir, 'repoint')
  mkdirSync(outDir, { recursive: true })
  const path = join(outDir, `${sideId}.html`)

  writeFileSync(
    path,
    renderRepoint({
      side: sideId,
      from,
      to: target,
      rows,
      fromRel: from ? relativeToOut(outDir, from.dir) : '',
      toRel: relativeToOut(outDir, target.dir)
    }),
    'utf8'
  )

  const movedScreens = rows
    .filter((row) => row.verdict !== 'identical')
    .map((row) => row.screen)

  const written = accept ? acceptRepoint({ profile, sideId, to }) : []

  return {
    side: sideId,
    from: fromSha,
    to,
    path,
    counts: rows.reduce((acc, row) => {
      acc[row.verdict] = (acc[row.verdict] ?? 0) + 1
      return acc
    }, {}),
    movedScreens,
    accepted: Boolean(accept),
    written
  }
}

/**
 * Point the corpus at the new capture.
 *
 * One write, and deliberately only one. The seals are left exactly as they
 * are: they still hold the superseded pictures, so the next report render
 * diffs the new capture against them and lists every screen that moved in the
 * drift panel. Clearing them here would make the repoint adopt itself, which
 * is the silent swap this whole path exists to prevent.
 *
 * The superseded pictures stay on disk too — superseding should be reversible
 * for as long as they are there — and no finding is touched, because a repoint
 * changes the evidence, never the claim.
 *
 * @param {object} args
 * @returns {string[]} The files written
 */
export const acceptRepoint = ({ profile, sideId, to }) => {
  const corporaPath = join(profile.workspaceRoot, CORPORA_FILE)
  const corpora = readJsonFile(corporaPath)
  const corpus = corpora.corpora?.[profile.id]
  if (!corpus?.captures?.[sideId]) {
    throw new Error(
      `${CORPORA_FILE} has no captures.${sideId} for corpus "${profile.id}", so there is nothing to repoint.`
    )
  }
  corpus.captures[sideId] = {
    ...corpus.captures[sideId],
    sha: to,
    on: new Date().toISOString().slice(0, 10)
  }
  writeJsonAtomic(corporaPath, corpora)
  return [corporaPath]
}

// Relative, so the preview reads the capture directories in place rather than
// copying two full sets of screenshots to look at a swap — and so it keeps
// working if the workspace is cloned somewhere else.
const relativeToOut = (outDir, dir) => relative(outDir, dir)
