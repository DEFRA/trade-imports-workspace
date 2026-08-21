import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { loadCorpus } from '../load.js'
import { runCounts } from '../counts.js'
import { sha256File } from '../io.js'
import { renderPage, CONTROLS_SCRIPT, ASSET_CSS, ASSET_JS } from './page.js'
import { THEME_CSS } from './theme.js'

/**
 * What the run has to say on stdout beyond having written the page.
 *
 * A warning is only worth printing where the reader could act on it. The
 * unmatched-findings warning is the example that made this its own function:
 * it fired on every render of a corpus whose findings were authored directly,
 * where there is no upstream file to match against and never will be, so it
 * said something true about a thing that is not a problem.
 *
 * @param {object} args
 * @param {boolean} args.upstream - Whether the corpus declares an upstream file
 * @param {object} args.joinReport - From loadCorpus
 * @returns {string[]}
 */
export const reportWarnings = ({ upstream, joinReport }) => {
  const warnings = []
  if (upstream && joinReport.unmatchedIncrements.length) {
    warnings.push(
      `${joinReport.unmatchedIncrements.length} increments matched no upstream finding, so their audit record is missing.`
    )
  }
  return warnings
}

/**
 * Build the report.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} [args.target] - local or artifact
 * @param {boolean} [args.open]
 * @returns {object}
 */
export const runReport = ({ profile, target = 'local', open }) => {
  const corpus = loadCorpus({ profile })
  const { counts } = runCounts({ profile })
  const upstream = Boolean(profile.paths.upstreamFindings)

  const outDir = profile.paths.reportDir
  mkdirSync(outDir, { recursive: true })

  const artifact = target === 'artifact'
  const backlogStat = statSync(profile.paths.backlog)
  const html = renderPage({
    corpus: profile.id,
    bands: profile.bands,
    meta: corpus.meta,
    counts,
    findings: corpus.findings,
    withdrawn: corpus.withdrawn,
    candidates: corpus.candidates,
    joinReport: upstream ? corpus.joinReport : null,
    sides: profile.sides,
    runId: profile.runId,
    target,
    stamp: {
      timVersion: process.env.npm_package_version ?? 'dev',
      backlogSha: sha256File(profile.paths.backlog),
      backlogMtime: backlogStat.mtime.toISOString(),
      generatedAt: new Date().toISOString()
    }
  })

  const path = join(outDir, artifact ? 'artifact.html' : 'index.html')
  writeFileSync(path, html, 'utf8')

  // The local build is a static app rather than one HTML blob: its stylesheet
  // and script are their own files beside the page. Both are ordinary link and
  // script tags, never modules and never fetched, so the page opens straight
  // off the filesystem with no server in front of it.
  if (!artifact) {
    writeFileSync(join(outDir, ASSET_CSS), THEME_CSS, 'utf8')
    writeFileSync(join(outDir, ASSET_JS), CONTROLS_SCRIPT, 'utf8')
  }

  const warnings = reportWarnings({ upstream, joinReport: corpus.joinReport })

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
    warnings
  }
}
