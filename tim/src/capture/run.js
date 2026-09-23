import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run as execRun } from '../exec/exec.js'
import { TimError } from '../errors.js'
import {
  appNamed,
  captureDirFor,
  readCaptureConfig,
  workareaPathFor
} from './config.js'
import { readInventory } from './inventory.js'
import { runFitSuite } from './fit-run.js'
import { coverageFor, readTraceCoverage } from './coverage.js'
import {
  COVERAGE_FILE,
  MANIFEST_FILE,
  copyTraces,
  findTraces,
  refuseExistingCapture,
  writeCaptureFile
} from './traces.js'

const headSha = async (repoPath, run) => {
  const { exitCode, stdout } = await run('git', [
    '-C',
    repoPath,
    'rev-parse',
    'HEAD'
  ])
  if (exitCode !== 0 || stdout.trim() === '') {
    throw new TimError(
      'USAGE',
      `Can't read the commit ${repoPath} is on. Check it is a git checkout with at least one commit.`
    )
  }
  return stdout.trim()
}

const repoPathFor = (workspaceRoot, repo) => {
  const path = join(workspaceRoot, repo)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find the repo at ${path}. Check the "repo" path in capture.json.`
    )
  }
  return path
}

const coverageOfTraces = async ({
  traces,
  captureDir,
  inventory,
  pagePath,
  readTrace
}) => {
  const workDir = mkdtempSync(join(tmpdir(), 'tim-capture-trace-'))
  try {
    const perTrace = []
    for (const { file } of traces) {
      perTrace.push({
        file,
        reached: await readTrace({
          tracePath: join(captureDir, file),
          pages: inventory,
          pagePath,
          workDir
        })
      })
    }
    return coverageFor({ inventory, perTrace })
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

/**
 * Run an app's own FIT suite with tracing on, keep the traces under the
 * workarea, and say which of the journey's pages the suite reached. The
 * inventory is read before the suite runs, so a capture.json that names the
 * wrong flow module is refused in a second rather than after a browser run.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {string} args.app
 * @param {Function} [args.runFit] - The FIT-suite seam
 * @param {Function} [args.readTrace] - The trace-reading seam
 * @param {Function} [args.run] - The subprocess seam used for git
 * @returns {Promise<object>}
 * @throws {TimError} USAGE, NOT_FOUND or PARSE
 */
export const runCapture = async ({
  workspaceRoot,
  workarea,
  app,
  runFit = runFitSuite,
  readTrace = readTraceCoverage,
  run = execRun
}) => {
  const workareaPath = workareaPathFor(workspaceRoot, workarea)
  const config = appNamed(readCaptureConfig(workspaceRoot, workarea), app)
  const repoPath = repoPathFor(workspaceRoot, config.repo)
  const sha = await headSha(repoPath, run)
  const captureDir = captureDirFor(workareaPath, app, sha)
  refuseExistingCapture(captureDir, sha)
  const inventory = await readInventory({ repoPath, flow: config.flow })

  const outputDir = mkdtempSync(join(tmpdir(), 'tim-capture-run-'))
  let suite
  let traces
  try {
    suite = await runFit({
      repoPath,
      fitScript: config.fitScript,
      projects: config.projects,
      outputDir
    })
    traces = copyTraces({ traces: findTraces(outputDir), captureDir })
  } finally {
    rmSync(outputDir, { recursive: true, force: true })
  }

  const capturedAt = new Date().toISOString()
  writeCaptureFile({
    captureDir,
    name: MANIFEST_FILE,
    content: {
      app,
      repo: config.repo,
      sha,
      capturedAt,
      command: suite.command,
      suite: {
        exitCode: suite.exitCode,
        passed: suite.passed,
        durationMs: suite.durationMs
      },
      traces
    }
  })

  const coverage = await coverageOfTraces({
    traces,
    captureDir,
    inventory,
    pagePath: config.pagePath,
    readTrace
  })
  writeCaptureFile({
    captureDir,
    name: COVERAGE_FILE,
    content: { app, sha, capturedAt, ...coverage }
  })

  return {
    app,
    workarea,
    repo: config.repo,
    sha,
    captureDir,
    capturedAt,
    suite: { ...suite },
    traces,
    ...coverage
  }
}
