import { resolve } from 'node:path'
import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { makeRunAction } from '../_run-action.js'
import { parseOptions } from '../backlog/shared.js'
import { resolveRepoPath } from '../../build/repo-path.js'
import { judgeRunJobs } from '../../build/run-jobs.js'

const runJobsOptionsSchema = z.object({
  commit: z
    .string({ message: "Name the run's commit with --commit." })
    .trim()
    .min(1, "Name the run's commit with --commit."),
  workflow: z
    .string({
      message:
        'Name the workflow file with --workflow, such as .github/workflows/publish.yml.'
    })
    .trim()
    .min(1, 'Name the workflow file with --workflow.'),
  jobs: z
    .string({
      message:
        'Name the saved jobs answer with --jobs: the output of gh api repos/<owner>/<repo>/actions/runs/<id>/jobs?filter=latest.'
    })
    .trim()
    .min(1, 'Name the saved jobs answer with --jobs.'),
  workspace: z.string().optional()
})

const listOrNone = (items) => (items.length > 0 ? items.join('; ') : 'none')

/**
 * The plain-text report of `tim build run-jobs`.
 *
 * @param {{workflow: string, green: boolean, missing: string[], notPassed: string[], jobs: string[]}} verdict
 * @returns {string}
 */
export const renderRunJobsText = ({
  workflow,
  green,
  missing,
  notPassed,
  jobs
}) =>
  [
    green
      ? `Every job of ${workflow} has passed.`
      : `Not every job of ${workflow} has passed.`,
    `Defined jobs with no job in the run: ${listOrNone(missing)}.`,
    `Jobs not passed: ${listOrNone(notPassed)}.`,
    ...jobs.map((job) => `  ${job}`)
  ].join('\n')

/**
 * `tim build run-jobs`: whether every job of one workflow run has passed.
 *
 * @param {import('commander').Command} build
 * @param {string} timVersion
 */
export const registerRunJobs = (build, timVersion) =>
  build
    .command('run-jobs')
    .argument(
      '[repo]',
      'The repo, as a path or a folder under repos/ (default: this folder)',
      '.'
    )
    .option('--commit <sha>', "The run's commit, such as a merge commit SHA")
    .option(
      '--workflow <file>',
      "The run's workflow file, such as .github/workflows/publish.yml"
    )
    .option(
      '--jobs <file>',
      'The saved answer of gh api repos/<owner>/<repo>/actions/runs/<id>/jobs?filter=latest'
    )
    .description(
      "Say whether every job of one GitHub Actions run has passed, from the jobs the run reports (a file you save with gh) and the jobs its workflow file defines at the run's commit. A job passes when it is completed with success or skipped. Every job the workflow defines must have a job in the run: its name, or its name and a matrix suffix. A job that calls a reusable workflow needs a job named '<its name> / …', or every job of that workflow when it is in the same repo, or one skipped job of its own name. result.green is true only when no defined job is missing and every job has passed. Use it when a run's own status stays in progress after its jobs have finished. It reads local git and the file only: fetch the commit first. Exits 0 whatever it finds."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  gh api repos/DEFRA/trade-imports-plants-frontend/actions/runs/123/jobs?filter=latest > jobs.json\n  tim build run-jobs trade-imports-plants-frontend --commit 4cd37b9c --workflow .github/workflows/publish.yml --jobs jobs.json --json'
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => parseOptions(runJobsOptionsSchema, opts),
        run: ({ args: [repo] }, parsed) =>
          judgeRunJobs({
            repoPath: resolveRepoPath(
              resolveWorkspaceRoot({ explicit: parsed.workspace }),
              repo
            ),
            commit: parsed.commit,
            workflow: parsed.workflow,
            jobsFile: resolve(parsed.jobs)
          }),
        renderText: renderRunJobsText,
        timVersion
      })
    )
