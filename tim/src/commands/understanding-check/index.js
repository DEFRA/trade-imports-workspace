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
  DEFAULT_MAX_DIFF_BYTES,
  maxDiffBytesOf,
  prepareCheck
} from '../../understanding-check/prepare.js'
import {
  selectedPullRequestsFor,
  selectedText
} from '../../understanding-check/pull-requests.js'
import { startCheck, startText } from '../../understanding-check/start.js'
import {
  addQuestion,
  QUESTION_CATEGORIES,
  removeQuestion,
  replaceQuestion
} from '../../understanding-check/questions.js'
import {
  renderPreview,
  writeReport,
  writeReportText
} from '../../understanding-check/report.js'
import {
  addScore,
  addScoreText,
  recordAnswer,
  recordAnswerText,
  SCORE_VERDICTS
} from '../../understanding-check/transcript.js'
import { TimError } from '../../errors.js'
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

const optionalTicketAction = (
  timVersion,
  { parseOptions, run, renderText, renderTextError }
) =>
  function optionalTicketCommandAction(ticket, ...rest) {
    return makeRunAction({
      parseOptions: (opts) => ({
        ...parseOptions(opts),
        workspaceRoot: workspaceRootOf(opts),
        ticket: givenTicket(ticket)
      }),
      run: (_context, parsed) => run(parsed),
      renderText,
      renderTextError,
      exitCodeForError: () => ERROR,
      timVersion
    }).call(this, ticket, ...rest)
  }

const requiredTicketAction = (
  timVersion,
  { usage, parseOptions, requiredOptions, run, renderText }
) =>
  function requiredTicketCommandAction(ticket, ...rest) {
    return makeRunAction({
      parseOptions: (opts) => {
        const parsed = {
          ...parseOptions(opts),
          workspaceRoot: workspaceRootOf(opts),
          ticket: requireTicket(ticket, usage)
        }
        if (requiredOptions.some((name) => !parsed[name])) {
          throw new TimError('USAGE', usage)
        }
        return parsed
      },
      run: (_context, parsed) => run(parsed),
      renderText,
      exitCodeForError: () => ERROR,
      timVersion
    }).call(this, ticket, ...rest)
  }

const QUESTION_OPTIONS = [
  ['--category <category>', `One of ${QUESTION_CATEGORIES.join(', ')}`],
  ['--prompt <text>', 'The question, asked plainly'],
  ['--anchor-file <file>', 'The file the question is grounded in'],
  ['--anchor-lines <lines>', 'The lines in that file, such as 42-58'],
  [
    '--expected-concepts <list>',
    'Comma-separated concepts the answer should touch'
  ],
  [
    '--rubric-pass <text>',
    'What a PASS answer does. It must hold names, identifies, explains, describes, cites, distinguishes, contrasts or enumerates.'
  ],
  [
    '--rubric-partial <text>',
    'What a PARTIAL answer does, with one of the same verbs'
  ],
  ['--rubric-fail <text>', 'What a FAIL answer does']
]

const withQuestionOptions = (command) =>
  QUESTION_OPTIONS.reduce(
    (withOptions, [flags, description]) =>
      withOptions.option(flags, description),
    command
  )

const questionOptionsOf = (opts) => ({
  category: opts.category,
  prompt: opts.prompt,
  anchorFile: opts.anchorFile,
  anchorLines: opts.anchorLines,
  expectedConcepts: opts.expectedConcepts,
  rubricPass: opts.rubricPass,
  rubricPartial: opts.rubricPartial,
  rubricFail: opts.rubricFail
})

const QUESTION_EXAMPLE_OPTIONS =
  '    --category implementation --prompt "Why does the retry skip 4xx?" \\\n    --anchor-file src/retry.js --anchor-lines 42-58 \\\n    --expected-concepts "retry budget,idempotency" \\\n    --rubric-pass "Names both reasons" \\\n    --rubric-partial "Names one reason but not the other" \\\n    --rubric-fail "Conflates 4xx with 5xx"'

const registerQuestionAdd = (question, { timVersion }) =>
  withQuestionOptions(
    question
      .command('add')
      .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
      .description(
        "Add a question to the check's questions.json, starting the file when there is none. Prints the new question's id. A check holds at most 12 questions."
      )
  )
    .addHelpText(
      'after',
      `\nExample:\n  tim understanding-check question add EUDPA-123 \\\n${QUESTION_EXAMPLE_OPTIONS}`
    )
    .action(
      optionalTicketAction(timVersion, {
        parseOptions: questionOptionsOf,
        run: (parsed) => addQuestion({ ...parsed, now: stampNow() }),
        renderText: ({ id }) => id
      })
    )

const registerQuestionReplace = (question, { timVersion }) =>
  withQuestionOptions(
    question
      .command('replace')
      .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
      .description('Replace a question, keeping its id.')
      .option('--id <id>', 'The question to replace, such as Q3')
  )
    .addHelpText(
      'after',
      `\nExample:\n  tim understanding-check question replace EUDPA-123 --id Q3 \\\n${QUESTION_EXAMPLE_OPTIONS}`
    )
    .action(
      optionalTicketAction(timVersion, {
        parseOptions: (opts) => ({ ...questionOptionsOf(opts), id: opts.id }),
        run: replaceQuestion,
        renderText: ({ id }) => `Replaced ${id}.`
      })
    )

const registerQuestionRemove = (question, { timVersion }) =>
  question
    .command('remove')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      'Remove a question and number the ones after it again, so the ids run Q1, Q2 and on.'
    )
    .option('--id <id>', 'The question to remove, such as Q3')
    .addHelpText(
      'after',
      '\nExample:\n  tim understanding-check question remove EUDPA-123 --id Q3'
    )
    .action(
      requiredTicketAction(timVersion, {
        usage:
          'Usage: tim understanding-check question remove EUDPA-XXXXX --id Q3',
        parseOptions: (opts) => ({ id: opts.id }),
        requiredOptions: ['id'],
        run: removeQuestion,
        renderText: ({ id }) => `Removed ${id}; downstream ids renumbered.`
      })
    )

const registerAnswer = (group, { timVersion }) =>
  group
    .command('answer')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Record the developer's answer to a question in transcript.json, replacing any earlier answer to it. An empty answer file, or --skipped, records a skip."
    )
    .option('--question-id <id>', 'The question answered, such as Q3')
    .option('--answer-file <file>', 'A file holding the answer as typed')
    .option('--skipped', 'The developer skipped the question')
    .addHelpText(
      'after',
      '\nExamples:\n  tim understanding-check answer EUDPA-123 --question-id Q3 --answer-file answer.txt\n  tim understanding-check answer EUDPA-123 --question-id Q4 --skipped'
    )
    .action(
      requiredTicketAction(timVersion, {
        usage:
          'Usage: tim understanding-check answer EUDPA-XXXXX --question-id Q3 --answer-file FILE [--skipped]',
        parseOptions: (opts) => ({
          questionId: opts.questionId,
          answerFile: opts.answerFile,
          skipped: opts.skipped === true
        }),
        requiredOptions: ['questionId'],
        run: (parsed) => recordAnswer({ ...parsed, now: stampNow() }),
        renderText: recordAnswerText
      })
    )

const registerScore = (group, { timVersion }) =>
  group
    .command('score')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Score a question's answer in transcript.json. The rubric match must quote the question's rubric: a match that is empty, <unscorable> or quotes no clause records FAIL as unscorable, warns on stderr and adds a coverage gap."
    )
    .option('--question-id <id>', 'The question scored, such as Q3')
    .option('--verdict <verdict>', `One of ${SCORE_VERDICTS.join(', ')}`)
    .option(
      '--rubric-match <text>',
      'The rubric clause that decided the verdict, quoted'
    )
    .option(
      '--missed-concepts <list>',
      'Comma-separated concepts the answer missed'
    )
    .option(
      '--evidence-cited <list>',
      'Comma-separated file:lines the score rests on'
    )
    .option('--follow-up <text>', 'Something for the developer to read next')
    .addHelpText(
      'after',
      '\nExample:\n  tim understanding-check score EUDPA-123 --question-id Q3 --verdict PARTIAL \\\n    --rubric-match "Names the 4xx-non-transient distinction but not the budget reasoning" \\\n    --missed-concepts "retry budget" --evidence-cited src/retry.js:42-58'
    )
    .action(
      optionalTicketAction(timVersion, {
        parseOptions: (opts) => ({
          questionId: opts.questionId,
          verdict: opts.verdict,
          rubricMatch: opts.rubricMatch,
          missedConcepts: opts.missedConcepts,
          evidenceCited: opts.evidenceCited,
          followUp: opts.followUp
        }),
        run: (parsed) => addScore({ ...parsed, now: stampNow() }),
        renderText: addScoreText,
        renderTextError: ({ warning }) => warning
      })
    )

const registerReport = (group, { timVersion }) =>
  group
    .command('report')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Write the check's full report to report.md, or with --preview print the plan-gate preview: the analysis counts and the question set."
    )
    .option('--preview', 'Print the plan-gate preview instead')
    .addHelpText(
      'after',
      '\nExamples:\n  tim understanding-check report EUDPA-123 --preview\n  tim understanding-check report EUDPA-123'
    )
    .action(
      requiredTicketAction(timVersion, {
        usage: 'Usage: tim understanding-check report EUDPA-XXXXX [--preview]',
        parseOptions: (opts) => ({ preview: opts.preview === true }),
        requiredOptions: [],
        run: (parsed) =>
          parsed.preview ? renderPreview(parsed) : writeReport(parsed),
        renderText: (result) =>
          'preview' in result
            ? result.preview.replace(/\n$/, '')
            : writeReportText(result)
      })
    )

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
      optionalTicketAction(timVersion, {
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
      optionalTicketAction(timVersion, {
        parseOptions: (opts) => ({
          repo: opts.repo,
          changeSummary: opts.changeSummary,
          whyItChanged: opts.whyItChanged
        }),
        run: (parsed) => completeAnalysis({ ...parsed, now: stampNow() }),
        renderText: completeAnalysisText
      })
    )

const writeStdoutLine = (line) => process.stdout.write(`${line}\n`)
const writeStderrLine = (line) => process.stderr.write(`${line}\n`)
const ignoreLine = () => {}

const stdoutFlushed = () =>
  new Promise((resolve) => process.stdout.write('', resolve))

const registerStart = (group, { timVersion }) =>
  group
    .command('start')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Start a check. The first line says MODE: RESUME when the check already has .interview-meta.json, and prints it. Otherwise it says MODE: FRESH and makes the check's raw folder ready for the pull requests gh finds."
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim understanding-check start EUDPA-123\n  tim understanding-check start EUDPA-123 --json'
    )
    .action(
      requiredTicketAction(timVersion, {
        usage: usageLine('start'),
        parseOptions: () => ({}),
        requiredOptions: [],
        run: startCheck,
        renderText: startText
      })
    )

const prepareFromRaw = async (parsed) => {
  const meta = await prepareCheck({ ...parsed, now: stampNow() })
  await stdoutFlushed()
  return meta
}

const registerPrepare = (group, { timVersion }) =>
  group
    .command('prepare')
    .argument('[ticket]', 'The ticket the check is for, such as EUDPA-123')
    .description(
      "Prepare a check from Jira and the pull requests gh saved in its raw folder. With --select, print the pull request to fetch for each repo: an open one over any other, then the newest. Without it, write ticket.md, each diff cut to --max-diff-bytes and redacted, each repo's best-practices bundle and analysis placeholder, and .interview-meta.json, then remove the raw folder. Reads JIRA_USER, JIRA_TOKEN and JIRA_BASE_URL."
    )
    .option('--select', 'Print the pull requests to fetch, one per repo')
    .option(
      '--max-diff-bytes <bytes>',
      `Cut each diff to this many bytes and record a coverage gap (default ${DEFAULT_MAX_DIFF_BYTES})`
    )
    .addHelpText(
      'after',
      '\nExamples:\n  tim understanding-check prepare EUDPA-123 --select\n  tim understanding-check prepare EUDPA-123\n  tim understanding-check prepare EUDPA-123 --max-diff-bytes 100000 --json'
    )
    .action(
      requiredTicketAction(timVersion, {
        usage:
          'Usage: tim understanding-check prepare EUDPA-XXXXX [--select] [--max-diff-bytes N] [--json]',
        parseOptions: (opts) => ({
          select: opts.select === true,
          maxDiffBytes: maxDiffBytesOf(opts.maxDiffBytes),
          log: opts.json ? ignoreLine : writeStdoutLine,
          warn: writeStderrLine
        }),
        requiredOptions: [],
        run: (parsed) =>
          parsed.select
            ? selectedPullRequestsFor(parsed)
            : prepareFromRaw(parsed),
        renderText: (result) =>
          Array.isArray(result) ? selectedText(result) : null
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
      'Start and prepare an understanding check, write its analysis, questions, answers and scores, then count, verify, finalise and report on it'
    )
  registerStart(group, { timVersion })
  registerPrepare(group, { timVersion })
  registerCounts(group, { timVersion })
  registerFinalize(group, { timVersion })
  registerVerify(group, { timVersion })
  const question = group
    .command('question')
    .description("Add, replace or remove a check's questions")
  registerQuestionAdd(question, { timVersion })
  registerQuestionReplace(question, { timVersion })
  registerQuestionRemove(question, { timVersion })
  registerAnswer(group, { timVersion })
  registerScore(group, { timVersion })
  registerReport(group, { timVersion })
  const analysis = group
    .command('analysis')
    .description("Write a repo's analysis: add findings, then mark it complete")
  registerAddFinding(analysis, { timVersion })
  registerComplete(analysis, { timVersion })
}
