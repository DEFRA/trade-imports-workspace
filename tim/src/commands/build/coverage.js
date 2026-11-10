import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { parseOptions } from '../backlog/shared.js'
import { resolveRepoPath } from '../../build/repo-path.js'
import { DEFAULT_BASE } from '../../build/duplication.js'
import {
  DEFAULT_FLOOR,
  JACOCO_REPORT,
  LCOV_REPORT,
  newCodeCoverage
} from '../../build/coverage.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const coverageOptionsSchema = z.object({
  repo: z.string().trim().min(1),
  base: z.string().trim().min(1, 'Name the base ref, such as origin/main.'),
  floor: z
    .number()
    .min(0, 'The floor is a percentage, from 0 to 100.')
    .max(100, 'The floor is a percentage, from 0 to 100.')
})

const rounded = (percent) => Math.round(percent * 10) / 10

const lineList = (lines) =>
  lines.length > 12
    ? `${lines.slice(0, 12).join(', ')} and ${lines.length - 12} more`
    : lines.join(', ')

const describeFile = ({ file, lines, covered, uncovered }) =>
  `  ${file}: ${covered} of ${lines} added ${lines === 1 ? 'line' : 'lines'} covered, uncovered at ${lineList(uncovered)}`

const coverageSummary = ({ percent, floor, met, toCover }) =>
  `${rounded(percent)}% of the ${toCover} added lines and conditions are covered (${met}), under the floor of ${floor}%`

/**
 * The plain-text report of `tim build coverage`.
 *
 * @param {{base: string, floor: number, percent: number|null, floorMet: boolean, toCover: number, met: number, files: object[]}} outcome
 * @returns {string}
 */
export const renderCoverageText = (outcome) => {
  const { percent, floor, base, files, floorMet, toCover } = outcome
  const read = `Read ${outcome.reports.join(', ')}, written ${outcome.measuredAt}. A narrow test run overwrites it, so this is the whole repo only when the whole suite wrote it.`
  if (percent === null) {
    return `The branch adds no line the coverage report measures, since ${base}.\n${read}`
  }
  if (floorMet) {
    return `${rounded(percent)}% of the ${toCover} added lines and conditions are covered, at or above the floor of ${floor}%, since ${base}.\n${read}`
  }
  return [
    `${coverageSummary(outcome)}:`,
    ...files.filter(({ uncovered }) => uncovered.length > 0).map(describeFile),
    'Test the behaviour those lines carry. A test written only to raise the number is worse than the gap.',
    read
  ].join('\n')
}

const coverageEnvelope = (outcome, timVersion) => ({
  ...jsonEnvelope({ ok: true, result: outcome, timVersion }),
  ok: outcome.floorMet,
  errors: outcome.floorMet
    ? []
    : [
        {
          code: 'COVERAGE_UNDER_FLOOR',
          message: `${coverageSummary(outcome)}.`
        }
      ]
})

const reportError = (error, json, timVersion) => {
  if (json) {
    emit(
      JSON.stringify(
        jsonEnvelope({ ok: false, error: errorPayloadFor(error), timVersion })
      )
    )
  } else {
    emitError(error.message ?? String(error))
  }
  process.exit(exitCodeFor(error))
}

/**
 * `tim build coverage`: how much of what a branch adds its own tests cover.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerCoverage = (build, timVersion) =>
  build
    .command('coverage')
    .argument(
      '[repo]',
      'The repo, as a path or a folder under repos/ (default: this folder)',
      '.'
    )
    .option(
      '--base <ref>',
      'The ref the branch is measured against',
      DEFAULT_BASE
    )
    .option(
      '--floor <percent>',
      'The percentage the added lines and conditions must reach',
      (value) => Number(value),
      DEFAULT_FLOOR
    )
    .description(
      `How much of the code a branch adds its own tests cover, measured the way a SonarCloud new_coverage condition measures it: every line and condition added since --base, committed or not, that the repo's own coverage report knows about, covered over coverable. It reads the report the test suite has already written — ${LCOV_REPORT} for a Node repo, ${JACOCO_REPORT} beside each pom.xml of a Java one — and runs no test itself, so run it after the suite. A changed file the report does not name, such as a test, is left out. Exits 1 below the floor, naming every uncovered line, and exits 1 when no report has been written.`
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim build coverage trade-imports-ins-frontend --json\n  tim build coverage . --base origin/main --floor 90'
    )
    .action(async function coverageAction(repo, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions(coverageOptionsSchema, {
          repo,
          base: opts.base,
          floor: opts.floor
        })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const outcome = await newCodeCoverage({
          repoPath: resolveRepoPath(workspaceRoot, parsed.repo),
          base: parsed.base,
          floor: parsed.floor
        })
        emit(
          globalOpts.json
            ? JSON.stringify(coverageEnvelope(outcome, timVersion))
            : renderCoverageText(outcome)
        )
        process.exit(outcome.floorMet ? OK : ERROR)
      } catch (error) {
        reportError(error, globalOpts.json, timVersion)
      }
    })
