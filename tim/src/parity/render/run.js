import {
  mkdirSync,
  writeFileSync,
  existsSync,
  statSync,
  linkSync,
  copyFileSync,
  rmSync
} from 'node:fs'
import { join, relative, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { loadCorpus } from '../load.js'
import { runCounts } from '../counts.js'
import { sha256File, readJsonFile } from '../io.js'
import { loadPairs, indexPairs, screenPairsFor } from '../assets/pairs.js'
import { resolveRow, imageCoverage, anchorsNamedIn } from '../assets/resolve.js'
import { sealsFrom, diffSeals, readSeals, writeSeals } from '../seals.js'
import { inlineAssets } from './artifact.js'
import { renderPage, CONTROLS_SCRIPT, ASSET_CSS, ASSET_JS } from './page.js'
import { THEME_CSS } from './theme.js'

const ASSET_DIR = 'assets'

/**
 * Put an image where the page can reach it. Hardlink where the filesystem
 * allows and copy otherwise, so 16 MB of prototype screenshots is not
 * duplicated on every rebuild.
 *
 * @param {string} from
 * @param {string} toDir
 * @returns {string} The filename inside the asset directory
 */
export const placeAsset = (from, toDir) => {
  const name = basename(from)
  const to = join(toDir, name)
  if (existsSync(to)) rmSync(to)
  try {
    linkSync(from, to)
  } catch {
    copyFileSync(from, to)
  }
  return name
}

const proseOf = (item) =>
  [
    item.sections.frontend?.text,
    item.sections.prototype?.text,
    item.sections.difference?.text,
    item.sections.body?.text,
    item.detail
  ]
    .filter(Boolean)
    .join('\n')

const attachAssets = ({
  items,
  sides,
  pairIndex,
  assetDir,
  anchors,
  inline
}) => {
  for (const item of items) {
    const rows = screenPairsFor({ screens: item.screens, pairIndex, sides })
    const frames = item.visual.length ? item.visual : [null]
    const prose = proseOf(item)
    item.assets = rows.flatMap((row) =>
      frames.map((frame) => {
        const anchorKeys = Object.fromEntries(
          sides.map((side) => [
            side.id,
            anchorsNamedIn({
              anchors: anchors[side.id]?.[row[side.id]?.screen] ?? [],
              prose
            })
          ])
        )
        // Only offered where the finding's own prose named nothing on this
        // side, which is the side that has nothing to show — asking "where
        // would this go" about a control that is present is noise.
        const insertionKeys = Object.fromEntries(
          sides.map((side) => [
            side.id,
            anchorKeys[side.id].length
              ? []
              : (anchors[side.id]?.[row[side.id]?.screen] ?? [])
                  .filter((anchor) => anchor.insertions?.length)
                  .map((anchor) => anchor.key)
          ])
        )
        const resolved = resolveRow({
          sides,
          row,
          frame,
          anchorKeys,
          insertionKeys
        })
        for (const side of sides) {
          const asset = resolved[side.id]
          const anchor = (anchors[side.id]?.[asset.screen] ?? []).find(
            (entry) => entry.key === asset.anchorKey
          )
          if (anchor?.insertions?.length) asset.insertions = anchor.insertions
          if (
            asset.path &&
            (asset.state === 'crop' || asset.state === 'page')
          ) {
            // The artifact target inlines the crops afterwards and leaves the
            // page shots behind, so it never wants a copied asset directory.
            if (!inline) {
              asset.href = `${ASSET_DIR}/${placeAsset(asset.path, assetDir)}`
            }
            // Hashed unconditionally, because the seal store compares every
            // picture on every rebuild, not only hand-curated ones.
            asset.sha256 = sha256File(asset.path)
            const curated = frame?.curatedAgainst?.[side.id]
            if (curated) asset.drifted = curated !== asset.sha256
          }
        }
        return resolved
      })
    )
  }
}

/**
 * Stamp the drift the seal store found onto the assets it belongs to, so the
 * ribbon sits on the picture that moved rather than on the whole card.
 *
 * @param {object} args
 * @param {object[]} args.items
 * @param {object[]} args.drift
 */
export const markDrift = ({ items, drift }) => {
  const byId = new Map(items.map((item) => [item.id, item]))
  for (const entry of drift) {
    const asset = byId.get(entry.id)?.assets?.[entry.row]?.[entry.side]
    if (!asset) continue
    asset.drifted = true
    asset.driftedFrom = entry.was
    asset.driftKind = entry.kind
  }
}

/**
 * Build the report.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} [args.target] - local or artifact
 * @param {boolean} [args.open]
 * @param {boolean} [args.requireImages]
 * @param {boolean} [args.reseal] - Accept every moved picture as the new seal
 * @returns {object}
 */
export const runReport = ({
  profile,
  target = 'local',
  open,
  requireImages,
  reseal
}) => {
  const corpus = loadCorpus({ profile })
  const { counts } = runCounts({ profile })

  const pairIndex = indexPairs(loadPairs(profile.paths.pairingModule))
  const outDir = profile.paths.reportDir
  const assetDir = join(outDir, ASSET_DIR)
  mkdirSync(assetDir, { recursive: true })

  const renderable = [...corpus.findings, ...corpus.withdrawn]
  const anchors = Object.fromEntries(
    profile.sides.map((side) => {
      const path = side.evidenceRoot
        ? join(
            profile.workspaceRoot,
            side.evidenceRoot,
            `anchors.${side.id}.json`
          )
        : null
      return [
        side.id,
        path && existsSync(path) ? (readJsonFile(path).screens ?? {}) : {}
      ]
    })
  )

  const artifact = target === 'artifact'

  attachAssets({
    items: renderable,
    sides: profile.sides,
    pairIndex,
    assetDir,
    anchors,
    inline: artifact
  })

  const coverage = imageCoverage(renderable, profile.sides)

  // Drift is settled before the page is built, so a moved picture carries its
  // ribbon in the same render that reports it in the panel. Sealed against the
  // resolved assets rather than the emitted ones, so the two targets agree
  // about what the reader has seen.
  const current = sealsFrom(renderable, profile.sides)
  const sealed = readSeals(profile.paths.seals)
  const found = diffSeals({ sealed, current })
  // --reseal means accepted, so the page it produces is the clean one. The
  // count still goes to stdout: accepting silently would be its own way of
  // swapping a picture without saying so.
  const drift = reseal ? [] : found
  markDrift({ items: renderable, drift })
  // The artifact is a second emitter of the same report, not a second report:
  // shipping a copy must not change what the local build says you have seen.
  if (!artifact) {
    writeSeals({ path: profile.paths.seals, sealed, current, reseal })
  }

  const inlining = artifact
    ? inlineAssets({ items: renderable, sides: profile.sides })
    : null

  const backlogStat = statSync(profile.paths.backlog)
  const html = renderPage({
    corpus: profile.id,
    bands: profile.bands,
    meta: corpus.meta,
    counts,
    findings: corpus.findings,
    withdrawn: corpus.withdrawn,
    candidates: corpus.candidates,
    joinReport: corpus.joinReport,
    sides: profile.sides,
    runId: profile.runId,
    drift,
    target,
    inlining,
    stamp: {
      timVersion: process.env.npm_package_version ?? 'dev',
      backlogSha: sha256File(profile.paths.backlog),
      backlogMtime: backlogStat.mtime.toISOString(),
      generatedAt: new Date().toISOString(),
      coverage
    }
  })

  const path = join(
    outDir,
    target === 'artifact' ? 'artifact.html' : 'index.html'
  )
  writeFileSync(path, html, 'utf8')

  // The local build is a static app rather than one HTML blob: its stylesheet
  // and script are their own files beside the page. Both are ordinary link and
  // script tags, never modules and never fetched, so the page opens straight
  // off the filesystem with no server in front of it.
  if (!artifact) {
    writeFileSync(join(outDir, ASSET_CSS), THEME_CSS, 'utf8')
    writeFileSync(join(outDir, ASSET_JS), CONTROLS_SCRIPT, 'utf8')
  }

  const warnings = []
  if (corpus.joinReport.unmatchedIncrements.length) {
    warnings.push(
      `${corpus.joinReport.unmatchedIncrements.length} increments matched no upstream finding, so their audit record is missing.`
    )
  }
  const gap = coverage.filter((c) => c.have < c.want)
  if (gap.length) {
    warnings.push(
      `image gaps: ${gap.map((c) => `${c.side} ${c.want - c.have} screens with no picture`).join('; ')}`
    )
  }
  if (found.length) {
    const findings = new Set(found.map((entry) => entry.id)).size
    warnings.push(
      reseal
        ? `accepted ${found.length} moved pictures across ${findings} findings as the new seal.`
        : `${found.length} pictures moved since they were last shown, across ${findings} findings. They carry a ribbon and are listed at the top of the page. Accept them with --reseal.`
    )
  }

  if (open) {
    execFile('open', [path], () => {})
  }

  return {
    path,
    bytes: Buffer.byteLength(html),
    items: {
      increments: corpus.findings.length,
      candidates: corpus.candidates.length,
      withdrawn: corpus.withdrawn.length
    },
    imageCoverage: coverage,
    inlining,
    drift: found,
    warnings,
    exitNonZero: Boolean(requireImages && gap.length)
  }
}

export const relativeTo = (from, to) => relative(from, to)
