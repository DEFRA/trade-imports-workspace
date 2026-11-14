import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import {
  addFinding,
  completeAnalysis,
  completeAnalysisText
} from '../../understanding-check/analysis.js'
import { countCheck, countsText } from '../../understanding-check/counts.js'
import {
  finalizeText,
  finalizeVerdict
} from '../../understanding-check/finalize.js'
import { requireTicket } from '../../understanding-check/paths.js'
import {
  coverageGapsText,
  coverageOkText,
  verifyCoverage
} from '../../understanding-check/verify.js'
import { makeRunAction } from '../_run-action.js'

const stampNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

const workspaceRootOf = (opts) =>
  resolveWorkspaceRoot({ explicit: opts.workspace })

const collect = (value, previous) => [...previous, value]

const usageLine = (command) =>
  `Usage: tim understanding-check ${command} EUDPA-XXXXX [--json]`

const ticketAction = (
  timVersion,
  command,
  { run, renderText, renderTextError, exitCodeForResult }
) =>
  function ticketCommandAction(ticket, ...rest) {
    return makeRunAction({
      parseOptions: (opts) => ({
        workspaceRoot: workspaceRootOf(opts),
        ticket: requireTicket(ticket, usageLine(command))
      }),
      run: (_context, parsed) => run(parsed),
      renderText: (result) => renderText(ticket, result),
      renderTextError,
      exitCodeForResult,
      exitCodeForError: () => ERROR,
      timVersion
    }).call(this, ticket, ...rest)
  }

const givenTicket = (ticket) =>
  ticket === undefined ? undefined : requireTicket(ticket)

const analysisAction = (timVersion, { parseOptions, run, renderText }) =>
  function analysisCommandAction(ticket, ...rest) {
    return makeRunAction({
      parseOptions: (opts) => ({
        ...parseOptions(opts),
        workspaceRoot: workspaceRootOf(opts),
        ticket: givenTicket(ticket)
      }),
      run: (_context, parsed) => run(parsed),
      renderText,
      exitCodeForError: () => ERROR,
      timVersion
    }).call(this, ticket, ...rest)
  }

const registerCounts = (group, { timVersion }) =>
  group
    .command('counts')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Count a check's PASS, PARTIAL, FAIL and PENDING scores, overall and by question category, with its security FAILs and coverage gaps."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim understanding-check counts EUDPA-123\n  tim understanding-check counts EUDPA-123 --json'
    )
    .action(
      ticketAction(timVersion, 'counts', {
        run: countCheck,
        renderText: countsText
      })
    )

const registerFinalize = (group, { timVersion }) =>
  group
    .command('finalize')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      'Apply the counting rule to a check and stamp the verdict, its reason, exit code, counts and completion time onto .interview-meta.json. Exits 0 for pass, 1 for needs-review and 2 for high-risk. A command that cannot run also exits 1 and prints its reason on stderr.'
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim understanding-check finalize EUDPA-123\n  tim understanding-check finalize EUDPA-123 --json'
    )
    .action(
      ticketAction(timVersion, 'finalize', {
        run: ({ workspaceRoot, ticket }) =>
          finalizeVerdict({ workspaceRoot, ticket, now: stampNow() }),
        renderText: finalizeText,
        exitCodeForResult: ({ exit }) => exit
      })
    )

const registerVerify = (group, { timVersion }) =>
  group
    .command('verify')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Check a check is ready for its verdict: every repo's analysis is complete with evidence on each finding, and every question has an answer and a score. Lists the gaps on stderr and exits 1 when there are any."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim understanding-check verify EUDPA-123\n  tim understanding-check verify EUDPA-123 --json'
    )
    .action(
      ticketAction(timVersion, 'verify', {
        run: verifyCoverage,
        renderText: coverageOkText,
        renderTextError: coverageGapsText,
        exitCodeForResult: ({ ok }) => (ok ? 0 : ERROR)
      })
    )

const registerAddFinding = (analysis, { timVersion }) =>
  analysis
    .command('add-finding')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Add a finding to a repo's analysis.<repo>.json, with its evidence. Prints the new finding's id."
    )
    .option('--repo <repo>', 'The repo the finding is in')
    .option(
      '--section <section>',
      'keyDesignDecisions, edgeCases, failureModes, securityRisks, dataOrApiChanges, testCoverageNotes or aiSuspectedRegions'
    )
    .option('--evidence-file <file>', 'The file that shows the finding')
    .option('--evidence-lines <lines>', 'The lines in that file, such as 10-14')
    .option(
      '--field <key=value>',
      "One of the finding's fields. Repeat it for each field.",
      collect,
      []
    )
    .addHelpText(
      'after',
      `\nExample:\n  tim understanding-check analysis add-finding EUDPA-123 \\\n    --repo trade-imports-animals-backend --section edgeCases \\\n    --evidence-file src/main/java/Foo.java --evidence-lines 40-52 \\\n    --field case="Empty list" --field handling="Returns 404"`
    )
    .action(
      analysisAction(timVersion, {
        parseOptions: (opts) => ({
          repo: opts.repo,
          section: opts.section,
          evidenceFile: opts.evidenceFile,
          evidenceLines: opts.evidenceLines,
          fields: opts.field
        }),
        run: addFinding,
        renderText: ({ id }) => String(id)
      })
    )

const registerComplete = (analysis, { timVersion }) =>
  analysis
    .command('complete')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Mark a repo's analysis complete, with what changed and why. Each is at most 300 characters."
    )
    .option('--repo <repo>', 'The repo the analysis is for')
    .option('--change-summary <text>', 'What the change does')
    .option('--why-it-changed <text>', 'Why the change was made')
    .addHelpText(
      'after',
      '\nExample:\n  tim understanding-check analysis complete EUDPA-123 \\\n    --repo trade-imports-animals-backend \\\n    --change-summary "Adds a commodity-code length check on submit." \\\n    --why-it-changed "Short codes were reaching PIMS and being rejected."'
    )
    .action(
      analysisAction(timVersion, {
        parseOptions: (opts) => ({
          repo: opts.repo,
          changeSummary: opts.changeSummary,
          whyItChanged: opts.whyItChanged
        }),
        run: (parsed) => completeAnalysis({ ...parsed, now: stampNow() }),
        renderText: completeAnalysisText
      })
    )

/**
 * `tim understanding-check`: the steps of the understanding-check skill.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const group = program
    .command('understanding-check')
    .description(
      "Count, verify and finalise an understanding check, and write each repo's analysis"
    )
  registerCounts(group, { timVersion })
  registerFinalize(group, { timVersion })
  registerVerify(group, { timVersion })
  const analysis = group
    .command('analysis')
    .description("Write a repo's analysis: add findings, then mark it complete")
  registerAddFinding(analysis, { timVersion })
  registerComplete(analysis, { timVersion })
}
