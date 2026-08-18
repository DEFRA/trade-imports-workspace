import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { PARITY_SCHEMA_VERSION } from './schema.js'
import { runCounts } from './counts.js'

const git = (repoPath, args) => {
  try {
    return execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf8'
    }).trim()
  } catch {
    return null
  }
}

/**
 * Is this commit reachable from a remote branch? A permalink to a commit that
 * was never pushed 404s, so the answer belongs on the page rather than in the
 * reader's browser.
 *
 * @param {string} repoPath
 * @param {string} sha
 * @returns {boolean}
 */
export const isPushed = (repoPath, sha) =>
  Boolean(git(repoPath, ['branch', '-r', '--contains', sha]))

/**
 * Resolve one repo's pin. `ref` is what the pin was asked for — HEAD, a branch,
 * an explicit sha — and `sha` is always the full forty characters, because a
 * short sha in a permalink is a link with a shelf life.
 *
 * @param {object} repo - A repo entry from the corpus profile
 * @param {string} ref
 * @param {string} why - Recorded so the masthead can say why this commit
 * @returns {object|null}
 */
export const resolvePin = (repo, ref, why) => {
  if (!repo.absolutePath || !existsSync(repo.absolutePath)) return null
  const sha = git(repo.absolutePath, ['rev-parse', ref])
  if (!sha) return null
  return {
    repo: `${repo.owner}/${repo.repo}`,
    sha,
    short: sha.slice(0, 8),
    ref,
    why,
    pushed: isPushed(repo.absolutePath, sha),
    subject: git(repo.absolutePath, ['log', '-1', '--format=%s', sha]),
    committedAt: git(repo.absolutePath, ['log', '-1', '--format=%cI', sha])
  }
}

const newestMtime = (dir) => {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir)
  if (files.length === 0) return null
  const newest = files.reduce((max, name) => {
    const time = statSync(`${dir}/${name}`).mtimeMs
    return time > max ? time : max
  }, 0)
  return new Date(newest).toISOString()
}

/**
 * Build .corpus-meta.json. Every masthead fact on the page comes from here and
 * nothing is retyped.
 *
 * Pins and captures are separate on purpose. A pin is the commit the report
 * cites code at; a capture is the commit the pixels were actually taken at.
 * They are equal after a fresh capture and they diverge the moment a repo
 * moves, and saying so is the difference between a stale picture and a lie.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {Record<string, {ref: string, why: string}>} args.pinSpec
 * @param {Record<string, {sha: string, on: string, note: string}>} args.captureSpec
 * @param {string} args.capturedOn
 * @returns {object}
 */
export const buildCorpusMeta = ({
  profile,
  pinSpec,
  captureSpec,
  capturedOn
}) => {
  const pins = {}
  for (const [repoKey, spec] of Object.entries(pinSpec)) {
    const pin = resolvePin(profile.repos[repoKey], spec.ref, spec.why)
    if (pin) pins[repoKey] = pin
  }

  const { counts } = runCounts({ profile })

  const captures = {}
  for (const side of profile.sides) {
    const spec = captureSpec[side.id]
    const models = existsSync(side.modelDir)
      ? readdirSync(side.modelDir).filter((f) => f.endsWith('.json')).length
      : 0
    const screenshots =
      side.screensDir && existsSync(side.screensDir)
        ? readdirSync(side.screensDir).filter((f) => f.endsWith('.png')).length
        : 0
    const pinnedSha = pins[side.repo]?.sha ?? null
    captures[side.id] = {
      repo: side.repo,
      sha: spec?.sha ?? null,
      capturedOn: spec?.on ?? newestMtime(side.modelDir),
      note: spec?.note ?? null,
      models,
      screenshots,
      deviceScaleFactor: spec?.deviceScaleFactor ?? 1,
      // The one comparison that matters: are the pictures of the code the
      // citations point at?
      matchesPin: Boolean(
        pinnedSha && spec?.sha && pinnedSha.startsWith(spec.sha)
      )
    }
  }

  return {
    corpus: profile.id,
    run_id: profile.runId,
    schemaVersion: PARITY_SCHEMA_VERSION,
    capturedOn,
    pins,
    captures,
    counts,
    images: Object.fromEntries(
      profile.sides.map((side) => [
        side.id,
        {
          screenshots: captures[side.id].screenshots,
          models: captures[side.id].models
        }
      ])
    )
  }
}
