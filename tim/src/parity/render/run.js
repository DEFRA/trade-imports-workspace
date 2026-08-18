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
import { sha256File } from '../io.js'
import { loadPairs, indexPairs, screenPairsFor } from '../assets/pairs.js'
import { resolveRow, imageCoverage } from '../assets/resolve.js'
import { renderPage } from './page.js'

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

const attachAssets = ({ items, sides, pairIndex, assetDir }) => {
  for (const item of items) {
    const rows = screenPairsFor({ screens: item.screens, pairIndex, sides })
    const frames = item.visual.length ? item.visual : [null]
    item.assets = rows.flatMap((row) =>
      frames.map((frame) => {
        const resolved = resolveRow({ sides, row, frame })
        for (const side of sides) {
          const asset = resolved[side.id]
          if (
            asset.path &&
            (asset.state === 'crop' || asset.state === 'page')
          ) {
            asset.href = `${ASSET_DIR}/${placeAsset(asset.path, assetDir)}`
            const curated = frame?.curatedAgainst?.[side.id]
            if (curated) {
              const current = sha256File(asset.path)
              asset.drifted = curated !== current
              asset.sha256 = current
            }
          }
        }
        return resolved
      })
    )
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
 * @returns {object}
 */
export const runReport = ({
  profile,
  target = 'local',
  open,
  requireImages
}) => {
  const corpus = loadCorpus({ profile })
  const { counts } = runCounts({ profile })

  const pairIndex = indexPairs(loadPairs(profile.paths.pairingModule))
  const outDir = profile.paths.reportDir
  const assetDir = join(outDir, ASSET_DIR)
  mkdirSync(assetDir, { recursive: true })

  const renderable = [...corpus.findings, ...corpus.withdrawn]
  attachAssets({ items: renderable, sides: profile.sides, pairIndex, assetDir })

  const coverage = imageCoverage(renderable, profile.sides)

  const backlogStat = statSync(profile.paths.backlog)
  const html = renderPage({
    corpus: profile.id,
    meta: corpus.meta,
    counts,
    findings: corpus.findings,
    withdrawn: corpus.withdrawn,
    candidates: corpus.candidates,
    joinReport: corpus.joinReport,
    sides: profile.sides,
    runId: profile.runId,
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
    warnings,
    exitNonZero: Boolean(requireImages && gap.length)
  }
}

export const relativeTo = (from, to) => relative(from, to)
