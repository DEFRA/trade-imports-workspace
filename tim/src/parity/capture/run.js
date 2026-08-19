import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runStreamed } from '../../exec/exec.js'
import { TimError } from '../../errors.js'
import { ensureApp } from './app-server.js'

const here = dirname(fileURLToPath(import.meta.url))

/** tim's package root, which is where its own Playwright lives. */
export const timRoot = resolve(here, '..', '..', '..')

/**
 * What a capture spec is called.
 *
 * `.pw.js` rather than `.spec.js` for two reasons: these are not tests —
 * nothing in them asserts that an application is correct — and tim's own vitest
 * run collects `**\/*.spec.js`, so a spec named that way would be run as a unit
 * test on every commit.
 */
export const SPEC_GLOB = '*.pw.js'

/**
 * The specs a side has, in the order Playwright will run them.
 *
 * @param {string} specDir
 * @returns {string[]} File names, sorted
 */
export const specsIn = (specDir) =>
  existsSync(specDir)
    ? readdirSync(specDir)
        .filter((name) => name.endsWith('.pw.js'))
        .sort()
    : []

/**
 * The commit an application is at.
 *
 * The last commit that touched `src`, not HEAD. The capture directory is named
 * after it, so naming it after HEAD would orphan every picture each time this
 * harness itself was edited — and the pixels would be identical.
 *
 * An empty answer is treated as no answer: `git log` exits zero and prints
 * nothing when a pathspec matches no commit, and a blank sha would name the
 * capture directory `frontend@` without anything failing.
 *
 * @param {string} repoPath
 * @returns {string} Full forty-character sha, or 'unknown'
 */
export const appSha = (repoPath) => {
  try {
    const out = execFileSync(
      'git',
      ['-C', repoPath, 'log', '-1', '--format=%H', '--', ':/src'],
      { encoding: 'utf8' }
    ).trim()
    return out || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * The commit the workspace — and so this harness — is at.
 *
 * @param {string} workspaceRoot
 * @returns {string}
 */
export const harnessSha = (workspaceRoot) => {
  try {
    return (
      execFileSync('git', ['-C', workspaceRoot, 'rev-parse', 'HEAD'], {
        encoding: 'utf8'
      }).trim() || 'unknown'
    )
  } catch {
    return 'unknown'
  }
}

/**
 * Where this side's capture lands, worked out from the corpus profile.
 *
 * Every path comes from the profile. None has a default: a guess files this
 * comparison's evidence under a different comparison, which is exactly how a
 * report ends up showing evidence of the wrong thing.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {string} args.side - Side id
 * @param {string} args.sha - The commit the application is at
 * @returns {{side: string, captureDir: string, modelDir: string, anchorsPath: string, specDir: string, appRoot: string|null}}
 * @throws {TimError} NOT_FOUND for an unknown side, USAGE for a side the corpus never gave paths
 */
export const resolveCapturePaths = ({ profile, side, sha }) => {
  const sideProfile = profile.sideById[side]
  if (!sideProfile) {
    throw new TimError(
      'NOT_FOUND',
      `Unknown side "${side}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }
  if (!sideProfile.evidenceRoot) {
    throw new TimError(
      'USAGE',
      `Side "${side}" names no evidenceRoot in tools/parity/corpora.json, so there is nowhere to put the pictures.`
    )
  }
  if (!sideProfile.modelDir) {
    throw new TimError(
      'USAGE',
      `Side "${side}" names no modelDir in tools/parity/corpora.json, so there is nowhere to put the page models.`
    )
  }
  const evidenceRoot = join(profile.workspaceRoot, sideProfile.evidenceRoot)
  return {
    side,
    evidenceRoot,
    captureDir: join(evidenceRoot, `${side}@${sha.slice(0, 8)}`),
    modelDir: sideProfile.modelDir,
    anchorsPath: join(evidenceRoot, `anchors.${side}.json`),
    specDir: join(profile.paths.workarea, 'specs', side),
    appRoot: profile.repos[sideProfile.repo]?.absolutePath ?? null
  }
}

/**
 * The Playwright config for one capture run.
 *
 * Generated rather than checked in, because the corpus profile is the source
 * of truth for where the evidence goes and for how the application is served.
 * A committed config is a second place to keep those in step.
 *
 * There is no `webServer` block. tim starts the application itself, before
 * Playwright runs, so that a stopped one is reported as a stopped application
 * rather than as a connection refused on somebody's first goto.
 *
 * @param {object} args
 * @param {string} args.specDir - Where this side's specs live
 * @param {string} args.side
 * @param {string} args.baseURL
 * @param {string} args.contextPath - File holding the capture context
 * @param {string} args.outputDir - Where Playwright puts its own artefacts
 * @param {number} args.deviceScaleFactor
 * @param {{width: number, height: number}} args.viewport
 * @param {boolean} [args.headed]
 * @returns {string} Config source
 */
export const playwrightConfigSource = ({
  specDir,
  side,
  baseURL,
  contextPath,
  outputDir,
  deviceScaleFactor,
  viewport,
  headed
}) => {
  return `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: ${JSON.stringify(specDir)},
  testMatch: ${JSON.stringify(SPEC_GLOB)},
  // These applications keep journey state in the session, so two specs running
  // at once interleave into one session and photograph each other's pages.
  workers: 1,
  timeout: 1_800_000,
  expect: { timeout: 15_000 },
  outputDir: ${JSON.stringify(outputDir)},
  reporter: [['list']],
  use: {
    baseURL: ${JSON.stringify(baseURL)},
    headless: ${headed ? 'false' : 'true'},
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Everything below is about two runs at the same commit producing the same
    // bytes, which is what makes a changed hash mean the application changed.
    viewport: ${JSON.stringify(viewport)},
    deviceScaleFactor: ${deviceScaleFactor},
    reducedMotion: 'reduce',
    video: 'off',
    trace: 'retain-on-failure'
  },
  projects: [{ name: ${JSON.stringify(side)}, use: { ...devices['Desktop Chrome'] } }],
  metadata: { captureContext: ${JSON.stringify(contextPath)} }
})
`
}

/**
 * The Playwright runner tim uses.
 *
 * Two things have to be there, not one. The `playwright` package supplies the
 * binary; `playwright test` is implemented by `@playwright/test`. Checking only
 * the binary passes on an install that has one and not the other, and the run
 * then dies inside Playwright with a message about a missing config rather than
 * with the one sentence that says what to install.
 *
 * @param {string} [root]
 * @returns {string} Path to the binary
 * @throws {TimError} MISSING_DEP when either half has not been installed
 */
export const playwrightBin = (root = timRoot) => {
  const bin = join(root, 'node_modules', '.bin', 'playwright')
  const runner = join(
    root,
    'node_modules',
    '@playwright',
    'test',
    'package.json'
  )
  if (!existsSync(bin) || !existsSync(runner)) {
    throw new TimError(
      'MISSING_DEP',
      'Playwright is not installed in tim. Run "npm install" in tim, then "npx playwright install chromium".'
    )
  }
  return bin
}

/**
 * Capture one side of a comparison.
 *
 * Runs this side's capture specs, having written the capture context and a
 * Playwright config into a temporary directory. The context file is how a spec
 * learns where to write: the profile decides, not the environment.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.workspaceRoot
 * @param {string} args.side
 * @param {boolean} [args.headed]
 * @param {string} [args.specs] - Run specs from somewhere other than the corpus
 * @param {Function} [args.ensure] - App starter, injected by the tests
 * @param {(line: string) => void} [args.log] - Progress, on stderr by default
 * @returns {Promise<object>}
 */
export const runCapture = async ({
  profile,
  workspaceRoot,
  side,
  headed,
  specs: specDirOverride,
  ensure = ensureApp,
  log = (line) => process.stderr.write(`${line}\n`)
}) => {
  const sideProfile = profile.sideById[side]
  if (!sideProfile) {
    throw new TimError(
      'NOT_FOUND',
      `Unknown side "${side}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }

  const paths = resolveCapturePaths({ profile, side, sha: 'pending' })
  const specDir = specDirOverride ?? paths.specDir
  const specs = specsIn(specDir)
  if (specs.length === 0) {
    throw new TimError(
      'NOT_FOUND',
      `No capture specs at ${specDir}. A spec drives the application to the screens it names and records each one; write one there — ${SPEC_GLOB}, not .spec.js — before capturing.`
    )
  }

  if (!sideProfile.app?.baseURL) {
    throw new TimError(
      'USAGE',
      `Side "${side}" names no app.baseURL in tools/parity/corpora.json, so there is nowhere for the specs to point a browser.`
    )
  }

  const appRoot = paths.appRoot
  const sha = appRoot ? appSha(appRoot) : 'unknown'
  const resolved = resolveCapturePaths({ profile, side, sha })

  const context = {
    side,
    captureDir: resolved.captureDir,
    modelDir: resolved.modelDir,
    anchorsPath: resolved.anchorsPath,
    specDir,
    appSha: sha,
    harnessSha: harnessSha(workspaceRoot),
    deviceScaleFactor: profile.captures?.[side]?.deviceScaleFactor ?? 2,
    viewport: { width: 1280, height: 1200 }
  }

  const runDir = mkdtempSync(join(tmpdir(), `tim-parity-capture-${side}-`))
  const contextPath = join(runDir, 'context.json')
  const configPath = join(runDir, 'playwright.config.js')
  writeFileSync(contextPath, `${JSON.stringify(context, null, 2)}\n`, 'utf8')
  writeFileSync(
    configPath,
    playwrightConfigSource({
      specDir,
      side,
      baseURL: sideProfile.app.baseURL,
      contextPath,
      outputDir: join(runDir, 'test-results'),
      deviceScaleFactor: context.deviceScaleFactor,
      viewport: context.viewport,
      headed
    }),
    'utf8'
  )

  // The specs photograph a running application. Left to Playwright, a stopped
  // one arrives as ERR_CONNECTION_REFUSED on the first goto, which names
  // neither the application nor how to serve it.
  const app = await ensure({
    app: sideProfile.app,
    baseUrl: sideProfile.app.baseURL,
    label: side,
    log
  })

  let exitCode
  try {
    ;({ exitCode } = await runStreamed(
      playwrightBin(),
      ['test', '--config', configPath],
      {
        cwd: timRoot,
        env: { ...process.env, TIM_CAPTURE_CONTEXT: contextPath }
      }
    ))
  } finally {
    await app.stop()
  }

  return {
    side,
    sha,
    specs,
    specDir,
    captureDir: context.captureDir,
    modelDir: context.modelDir,
    config: configPath,
    exitNonZero: exitCode !== 0
  }
}
