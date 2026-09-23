import { runStreamed } from '../exec/exec.js'

// Everything the capture needs is forced on the command line, so the repo's
// own playwright.config.js and its specs are never edited: tracing on for
// every project, artifacts into a folder tim owns rather than the repo's
// test-results/, and the list reporter so no HTML report is written into the
// repo either.
const captureArgs = ({ projects, outputDir }) => [
  '--trace',
  'on',
  '--reporter=list',
  '--output',
  outputDir,
  ...projects.map((project) => `--project=${project}`)
]

/**
 * The exact `npm` argument list the capture runs.
 *
 * @param {{fitScript: string, projects: string[], outputDir: string}} args
 * @returns {string[]}
 */
export const fitArgs = ({ fitScript, projects, outputDir }) => [
  'run',
  fitScript,
  '--',
  ...captureArgs({ projects, outputDir })
]

// The suite streams live, but onto stderr: stdout belongs to the command's
// own report, which in --json mode is one parseable line.
const PARENT_STDERR = 2
const STREAM_TO_STDERR = ['ignore', PARENT_STDERR, PARENT_STDERR]

/**
 * Run the repo's own FIT suite with tracing on. A suite that fails still
 * leaves traces behind, so the exit code is reported rather than thrown.
 *
 * @param {object} args
 * @param {string} args.repoPath
 * @param {string} args.fitScript
 * @param {string[]} args.projects
 * @param {string} args.outputDir
 * @param {Function} [args.run] - The subprocess seam; defaults to runStreamed
 * @returns {Promise<{command: string, exitCode: number, durationMs: number, passed: boolean}>}
 */
export const runFitSuite = async ({
  repoPath,
  fitScript,
  projects,
  outputDir,
  run = runStreamed
}) => {
  const args = fitArgs({ fitScript, projects, outputDir })
  const { exitCode, durationMs } = await run('npm', args, {
    cwd: repoPath,
    stdio: STREAM_TO_STDERR
  })
  return {
    command: `npm ${args.join(' ')}`,
    exitCode,
    durationMs,
    passed: exitCode === 0
  }
}
