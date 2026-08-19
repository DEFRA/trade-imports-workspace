import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { TimError } from '../errors.js'

export const CORPORA_FILE = 'tools/parity/corpora.json'

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new TimError('PARSE', `Can't read ${path}: ${error.message}`)
  }
}

const readJsonIfPresent = (path) => (existsSync(path) ? readJson(path) : null)

/**
 * Expand a leading ~ against the current user's home directory. Paths in the
 * corpus profile are written the way a person writes them.
 *
 * @param {string} path
 * @returns {string}
 */
export const expandHome = (path) =>
  path.startsWith('~/') ? join(homedir(), path.slice(2)) : path

/**
 * Resolve which corpus a run belongs to, in the same order as
 * tools/journey-builder/target-profile.sh: an explicit flag, the backlog's own
 * corpus field, .corpus-meta.json, the corpus that declares this run id, then
 * the file's default.
 *
 * The run id is matched against `runId` last but before the default, and that
 * order matters. Falling straight through to the default means a run id with
 * no backlog on disk yet — a comparison being set up, which is exactly when
 * mistakes are cheap to make and expensive to notice — quietly resolves to
 * whichever corpus happens to be default and reports on somebody else's
 * evidence as though it were yours. A named run that no corpus claims is an
 * error, not a default.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId] - Used to find the backlog and meta files
 * @param {string} [args.explicit] - Value of --corpus
 * @returns {{id: string, source: string}}
 * @throws {TimError} NOT_FOUND when a run id belongs to no corpus
 */
export const resolveCorpusId = ({ workspaceRoot, runId, explicit }) => {
  const corporaPath = join(workspaceRoot, CORPORA_FILE)
  if (!existsSync(corporaPath)) {
    throw new TimError('NOT_FOUND', `Can't find ${CORPORA_FILE}.`)
  }
  const corpora = readJson(corporaPath)

  if (explicit) return { id: explicit, source: '--corpus' }

  if (runId) {
    const runDir = join(workspaceRoot, 'workareas', 'journey-builder', runId)
    const backlog = readJsonIfPresent(join(runDir, 'backlog.json'))
    if (backlog?.corpus) return { id: backlog.corpus, source: 'backlog.json' }
    const meta = readJsonIfPresent(join(runDir, '.corpus-meta.json'))
    if (meta?.corpus) return { id: meta.corpus, source: '.corpus-meta.json' }

    const declaring = Object.entries(corpora.corpora ?? {}).find(
      ([, corpus]) => corpus.runId === runId
    )
    if (declaring) return { id: declaring[0], source: 'runId in corpora.json' }

    throw new TimError(
      'NOT_FOUND',
      `No corpus claims the run "${runId}". Nothing under workareas/journey-builder/${runId} names a corpus, and no corpus in ${CORPORA_FILE} declares that runId. Add it, or pass --corpus.`
    )
  }

  return { id: corpora.default, source: 'corpora.json default' }
}

const absolutise = (workspaceRoot, path) => {
  if (!path) return null
  return path.startsWith('~/') || path.startsWith('/')
    ? resolve(expandHome(path))
    : join(workspaceRoot, path)
}

/**
 * Load a corpus profile with every path made absolute, plus the helpers the
 * rest of the generator needs: repo lookup and path-root stripping.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.explicit]
 * @returns {object} The profile, with absolute paths and lookup helpers
 * @throws {TimError} NOT_FOUND when the corpus id is unknown
 */
export const loadCorpusProfile = ({ workspaceRoot, runId, explicit }) => {
  const corporaPath = join(workspaceRoot, CORPORA_FILE)
  const corpora = readJson(corporaPath)
  const { id, source } = resolveCorpusId({ workspaceRoot, runId, explicit })

  const raw = corpora.corpora?.[id]
  if (!raw) {
    const known = Object.keys(corpora.corpora ?? {}).join(', ')
    throw new TimError(
      'NOT_FOUND',
      `Unknown corpus "${id}" (resolved from ${source}). Known corpora: ${known}.`
    )
  }

  const repos = Object.fromEntries(
    Object.entries(raw.repos).map(([key, repo]) => [
      key,
      {
        ...repo,
        key,
        absolutePath: absolutise(
          workspaceRoot,
          repo.localPath ?? repo.localPathAbsolute
        ),
        // Longest prefix first, so a bare "app/" never wins over a full path.
        pathRoots: [...repo.pathRoots].sort(
          (a, b) => b.prefix.length - a.prefix.length
        )
      }
    ])
  )

  // Capture ids are immutable: a capture at a new commit writes a new
  // directory rather than overwriting the old one, because the old evidence is
  // the record of what a ruling was made against. So the directory name
  // carries a sha — and that sha comes from `captures`, which is the one place
  // it is recorded, rather than being repeated in a path somebody has to
  // remember to edit after every capture.
  const captureSha = (sideId) => raw.captures?.[sideId]?.sha ?? null
  const evidenceDir = (side, leaf) => {
    const sha = captureSha(side.id)
    if (!side.evidenceRoot || !sha) return null
    return join(workspaceRoot, side.evidenceRoot, `${side.id}@${sha}`, leaf)
  }

  const sides = raw.sides.map((side) => ({
    ...side,
    // Where an application is started from is a path like any other in this
    // file, written the way a person writes one. Resolving it here keeps the
    // only place that expands ~ and joins the workspace root in one function.
    app: side.app
      ? { ...side.app, cwd: absolutise(workspaceRoot, side.app.cwd) }
      : (side.app ?? null),
    captureDir: absolutise(workspaceRoot, side.captureDir),
    modelDir: absolutise(workspaceRoot, side.modelDir),
    htmlDir: absolutise(workspaceRoot, side.htmlDir),
    screensDir:
      evidenceDir(side, 'page') ?? absolutise(workspaceRoot, side.screensDir),
    manifest:
      evidenceDir(side, 'manifest.json') ??
      absolutise(workspaceRoot, side.manifest),
    traceDirs: (side.traceDirs ?? []).map((dir) =>
      absolutise(workspaceRoot, dir)
    )
  }))

  return {
    ...raw,
    id,
    resolvedFrom: source,
    workspaceRoot,
    runId: runId ?? raw.runId,
    sides,
    repos,
    sideIds: sides.map((side) => side.id),
    sideById: Object.fromEntries(sides.map((side) => [side.id, side])),
    paths: {
      backlog: absolutise(workspaceRoot, raw.backlog),
      deferred: absolutise(workspaceRoot, raw.deferred),
      meta: absolutise(workspaceRoot, raw.meta),
      evidence: absolutise(workspaceRoot, raw.evidence),
      reportDir: absolutise(workspaceRoot, raw.reportDir),
      workarea: absolutise(workspaceRoot, raw.workarea),
      seals: absolutise(
        workspaceRoot,
        raw.seals ?? `${raw.workarea}/evidence/seals.json`
      ),
      pairingModule: absolutise(workspaceRoot, raw.pairingModule),
      enumeratorModule: absolutise(workspaceRoot, raw.enumeratorModule),
      deltasDir: absolutise(workspaceRoot, raw.deltasDir),
      upstreamFindings: absolutise(workspaceRoot, raw.upstreamFindings)
    }
  }
}

/**
 * Turn a path as written in a finding into a repo-relative path plus the repo
 * it belongs to. Returns null when no root matches, which is a signal to queue
 * the citation rather than to guess.
 *
 * @param {object} profile - A loaded corpus profile
 * @param {string} written - The path exactly as the prose wrote it
 * @param {string} [preferredRepo] - Try this repo's roots first
 * @returns {{repo: string, path: string}|null}
 */
export const stripPathRoot = (profile, written, preferredRepo) => {
  const order = preferredRepo
    ? [
        preferredRepo,
        ...Object.keys(profile.repos).filter((key) => key !== preferredRepo)
      ]
    : Object.keys(profile.repos)

  const candidates = []
  for (const repoKey of order) {
    for (const root of profile.repos[repoKey].pathRoots) {
      if (!written.startsWith(root.prefix)) continue
      const stripped = root.impliedPrefix
        ? written
        : written.slice(root.prefix.length)
      candidates.push({
        repo: repoKey,
        path: stripped,
        length: root.prefix.length,
        implied: Boolean(root.impliedPrefix)
      })
    }
  }
  if (candidates.length === 0) return null

  // An explicit root always beats an implied one, and a longer explicit root
  // beats a shorter one. Order of repos only breaks a genuine tie.
  candidates.sort((a, b) => {
    if (a.implied !== b.implied) return a.implied ? 1 : -1
    return b.length - a.length
  })
  const [best] = candidates
  return { repo: best.repo, path: best.path }
}
