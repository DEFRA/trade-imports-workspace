import { z } from 'zod'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { zodOptionsParser } from '../_parse-options.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import {
  countPatternHits,
  evidenceRepoPath
} from '../../deps/evidence/count.js'
import {
  evidenceRowsVerdict,
  loadEvidenceRows
} from '../../deps/evidence/row.js'
import {
  evidenceVerdictText,
  renderEvidenceTable
} from '../../deps/evidence/render.js'
import { makeRunAction } from '../_run-action.js'

const workspaceOptionsSchema = z.object({ workspace: z.string().optional() })

const fileOptionsSchema = z.object({
  file: z
    .string({ error: 'Give the evidence rows file with --file.' })
    .min(1, 'Give the evidence rows file with --file.'),
  workspace: z.string().optional()
})

const exitCodeForClean = ({ allClean }) => (allClean ? OK : ERROR)

const ROWS_FILE_HELP =
  '\nThe file holds a JSON list of rows. Each row has item, outcome (applied, not-applicable or needs-a-person) and reason, and can have pattern, hitsBefore and hitsAfter.\n'

const registerCount = (evidence, { timVersion }) => {
  evidence
    .command('count <repo> <pattern>')
    .description(
      "Count the lines of a repo's tracked files that contain a pattern. The pattern is a fixed string, not a regular expression. Uncommitted edits count. Untracked files, binary files and package-lock.json do not."
    )
    .addHelpText(
      'after',
      "\nThe repo is a clone under repos/, or tim for the workspace's own tim folder.\n" +
        '\nExamples:\n' +
        '  tim deps evidence count trade-imports-animals-frontend govuk-header__link--service-name\n' +
        '  tim deps evidence count tim "from \'vitest\'" --json'
    )
    .action(
      makeRunAction({
        parseOptions: zodOptionsParser(workspaceOptionsSchema),
        run: async ({ args: [repo, pattern] }, { workspace }) => {
          const repoPath = evidenceRepoPath(
            resolveWorkspaceRoot({ explicit: workspace }),
            repo
          )
          return {
            repo,
            pattern,
            hits: await countPatternHits(repoPath, pattern)
          }
        },
        renderText: ({ hits }) => String(hits),
        timVersion
      })
    )
}

const registerCheck = (evidence, { timVersion }) => {
  evidence
    .command('check')
    .description(
      'Check that every evidence row in a file is clean. Exits 0 when every row is clean and 1 when any row is not, or the file holds no rows.'
    )
    .option('--file <path>', 'The JSON file of evidence rows')
    .addHelpText(
      'after',
      ROWS_FILE_HELP +
        'An applied row is clean when its pattern has 0 hits after the change. A not-applicable row is clean when it has a reason and its pattern, if any, still has 0 hits. A needs-a-person row is never clean.\n' +
        '\nExamples:\n' +
        '  tim deps evidence check --file rows.json\n' +
        '  tim deps evidence check --file rows.json --json'
    )
    .action(
      makeRunAction({
        parseOptions: zodOptionsParser(fileOptionsSchema),
        run: async (_context, { file }) =>
          evidenceRowsVerdict(loadEvidenceRows(file)),
        renderText: (verdict) => evidenceVerdictText(verdict, 'in the file'),
        exitCodeForResult: exitCodeForClean,
        timVersion
      })
    )
}

const registerRender = (evidence, { timVersion }) => {
  evidence
    .command('render')
    .description(
      'Print the evidence rows in a file as the markdown table for a pull request description, with columns Changelog item, Outcome and Evidence, and a line saying whether every row is clean.'
    )
    .option('--file <path>', 'The JSON file of evidence rows')
    .addHelpText(
      'after',
      ROWS_FILE_HELP +
        '\nExamples:\n' +
        '  tim deps evidence render --file rows.json\n' +
        '  tim deps evidence render --file rows.json --json'
    )
    .action(
      makeRunAction({
        parseOptions: zodOptionsParser(fileOptionsSchema),
        run: async (_context, { file }) =>
          renderEvidenceTable(loadEvidenceRows(file)),
        renderText: ({ markdown }) => markdown,
        timVersion
      })
    )
}

export const register = (program, { timVersion }) => {
  const evidence = program
    .command('evidence')
    .description(
      'Changelog evidence for an upgrade: count a pattern in a repo, check that evidence rows are clean, and render them as a pull request table'
    )
  registerCount(evidence, { timVersion })
  registerCheck(evidence, { timVersion })
  registerRender(evidence, { timVersion })
}
