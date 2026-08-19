import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runStreamed } from '../../exec/exec.js'
import { TimError } from '../../errors.js'
import { loadRoutePlan, plannedScreens } from './route-plan.js'

const here = dirname(fileURLToPath(import.meta.url))

/** tim's package root, which is where its own Playwright lives. */
export const timRoot = resolve(here, '..', '..', '..')

/** The file Playwright runs. Not `*.spec.js`: it is not a test, and vitest collects that name. */
export const WALK_FILE = 'walk.pw.js'

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
 * @returns {{side: string, captureDir: string, modelDir: string, anchorsPath: string, routePlanPath: string, appRoot: string|null}}
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
    routePlanPath: join(
      profile.paths.workarea,
      'cartography',
      `${side}.routes.json`
    ),
    appRoot: profile.repos[sideProfile.repo]?.absolutePath ?? null
  }
}

/**
 * The Playwright config for one capture run.
 *
 * Generated rather than checked in, because the corpus profile is the source
 * of truth for where the evidence goes and the route plan is the source of
 * truth for how the application is served. A committed config is a second
 * place to keep those in step.
 *
 * @param {object} args
 * @param {object} args.plan - The route plan
 * @param {string} args.contextPath - File holding the capture context
 * @param {string} args.outputDir - Where Playwright puts its own artefacts
 * @param {number} args.deviceScaleFactor
 * @param {{width: number, height: number}} args.viewport
 * @param {boolean} [args.headed]
 * @returns {string} Config source
 */
export const playwrightConfigSource = ({
  plan,
  contextPath,
  outputDir,
  deviceScaleFactor,
  viewport,
  headed
}) => {
  const server = plan.app.server
    ? `
  webServer: {
    command: ${JSON.stringify(plan.app.server.command)},
    cwd: ${JSON.stringify(plan.app.server.cwd ?? process.cwd())},
    env: ${JSON.stringify({
      PORT: String(plan.app.server.port),
      ...(plan.app.server.env ?? {})
    })},
    port: ${plan.app.server.port},
    reuseExistingServer: true,
    timeout: 180_000
  },`
    : ''

  return `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: ${JSON.stringify(here)},
  testMatch: ${JSON.stringify(WALK_FILE)},
  // One journey, walked end to end. Parallelism interleaves two walks into one
  // session, and these applications keep journey state in the session.
  workers: 1,
  timeout: 1_800_000,
  expect: { timeout: 15_000 },
  outputDir: ${JSON.stringify(outputDir)},
  reporter: [['list']],
  use: {
    baseURL: ${JSON.stringify(plan.app.baseURL)},
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
  projects: [{ name: ${JSON.stringify(plan.side)}, use: { ...devices['Desktop Chrome'] } }],${server}
  metadata: { captureContext: ${JSON.stringify(contextPath)} }
})
`
}

/**
 * The Playwright runner tim uses.
 *
 * @param {string} [root]
 * @returns {string} Path to the binary
 * @throws {TimError} MISSING_DEP when it has not been installed
 */
export const playwrightBin = (root = timRoot) => {
  const bin = join(root, 'node_modules', '.bin', 'playwright')
  if (!existsSync(bin)) {
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
 * Reads the route plan the discovery stage produced, writes the capture
 * context and a Playwright config into a temporary directory, and drives the
 * runner. The context file is how the walk learns where to write: the profile
 * decides, not the environment.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.workspaceRoot
 * @param {string} args.side
 * @param {boolean} [args.headed]
 * @param {string} [args.plan] - Override the route plan path
 * @returns {Promise<object>}
 */
export const runCapture = async ({
  profile,
  workspaceRoot,
  side,
  headed,
  plan: planOverride
}) => {
  const sideProfile = profile.sideById[side]
  if (!sideProfile) {
    throw new TimError(
      'NOT_FOUND',
      `Unknown side "${side}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }

  const paths = resolveCapturePaths({ profile, side, sha: 'pending' })
  const routePlanPath = planOverride ?? paths.routePlanPath
  if (!existsSync(routePlanPath)) {
    throw new TimError(
      'NOT_FOUND',
      `No route plan at ${routePlanPath}. Map the application first — nothing can be captured until something has worked out which screens it has and how to reach them.`
    )
  }
  const plan = loadRoutePlan(routePlanPath)

  const appRoot = paths.appRoot
  const sha = appRoot ? appSha(appRoot) : 'unknown'
  const resolved = resolveCapturePaths({ profile, side, sha })

  const context = {
    side,
    captureDir: resolved.captureDir,
    modelDir: resolved.modelDir,
    anchorsPath: resolved.anchorsPath,
    routePlanPath,
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
      plan,
      contextPath,
      outputDir: join(runDir, 'test-results'),
      deviceScaleFactor: context.deviceScaleFactor,
      viewport: context.viewport,
      headed
    }),
    'utf8'
  )

  const { exitCode } = await runStreamed(
    playwrightBin(),
    ['test', '--config', configPath],
    { cwd: timRoot, env: { ...process.env, TIM_CAPTURE_CONTEXT: contextPath } }
  )

  return {
    side,
    sha,
    screens: plannedScreens(plan).length,
    captureDir: context.captureDir,
    modelDir: context.modelDir,
    routePlan: routePlanPath,
    config: configPath,
    exitNonZero: exitCode !== 0
  }
}
