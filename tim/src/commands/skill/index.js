import { ERROR } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { addAnswer } from '../../skill/answer.js'
import { renderInterview } from '../../skill/render.js'
import { scaffoldSkill } from '../../skill/scaffold.js'
import { renderStartText, startSkillCreator } from '../../skill/start.js'
import { makeRunAction } from '../_run-action.js'

const stampNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

const workspaceRootOf = (opts) =>
  resolveWorkspaceRoot({ explicit: opts.workspace })

const skillAction = (timVersion, { parseOptions, run, renderText }) =>
  makeRunAction({
    parseOptions,
    run,
    renderText,
    exitCodeForError: () => ERROR,
    timVersion
  })

const registerStart = (skill, { timVersion }) =>
  skill
    .command('start')
    .argument('[trigger]', 'The trigger phrase, in quotes')
    .description(
      'Start the skill-creator skill from a trigger phrase. Prints "MODE: CREATE", "MODE: AUDIT_ONE" or "MODE: AUDIT_ALL", then one line of JSON. CREATE refuses a skill that exists and seeds workareas/skill-creator/<name>/decisions.json if it is not there yet.'
    )
    .addHelpText(
      'after',
      '\nTrigger phrases:\n  CREATE:    "scaffold skill <name>" | "skill-create <name>" | "new workspace skill <name>"\n  AUDIT one: "audit skill <name>" | "review skill <name>"\n  AUDIT all: "audit skills" | "audit all skills"\n\nExamples:\n  tim skill start "scaffold skill ticket-notes"\n  tim skill start "audit skills" --json'
    )
    .action(
      skillAction(timVersion, {
        parseOptions: (opts) => ({ workspaceRoot: workspaceRootOf(opts) }),
        run: ({ args: [trigger] }, { workspaceRoot }) => {
          if (!trigger) {
            throw new TimError(
              'USAGE',
              'Usage: tim skill start "<trigger phrase>"'
            )
          }
          return startSkillCreator({ workspaceRoot, trigger, now: stampNow() })
        },
        renderText: renderStartText
      })
    )

const registerAnswer = (skill, { timVersion }) =>
  skill
    .command('answer')
    .description(
      "Write one interview answer into a run's decisions.json. The value is JSON: put strings in double quotes and leave true, false and lists bare. Prints nothing."
    )
    .option('--run-id <name>', 'The skill name the run is for')
    .option(
      '--field <path>',
      'The answer to set, with dots for nesting, such as fanout.enabled'
    )
    .option('--value <json>', 'The answer as JSON')
    .addHelpText(
      'after',
      `\nExamples:\n  tim skill answer --run-id ticket-notes --field purpose --value '"Keep notes on a ticket."'\n  tim skill answer --run-id ticket-notes --field fanout.enabled --value 'true'\n  tim skill answer --run-id ticket-notes --field triggers.phrases --value '["ticket notes"]'`
    )
    .action(
      skillAction(timVersion, {
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          runId: opts.runId,
          field: opts.field,
          valueText: opts.value
        }),
        run: (_context, parsed) => addAnswer(parsed),
        renderText: () => null
      })
    )

const registerRender = (skill, { timVersion }) =>
  skill
    .command('render')
    .description(
      "Print a run's decisions.json as markdown: the eight interview answers, with (not answered) where one is missing."
    )
    .option('--run-id <name>', 'The skill name the run is for')
    .addHelpText(
      'after',
      '\nExamples:\n  tim skill render --run-id ticket-notes\n  tim skill render --run-id ticket-notes --json'
    )
    .action(
      skillAction(timVersion, {
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          runId: opts.runId
        }),
        run: (_context, parsed) => renderInterview(parsed),
        renderText: ({ markdown }) => markdown
      })
    )

const registerScaffold = (skill, { timVersion }) =>
  skill
    .command('scaffold')
    .description(
      "Build a new skill from a run's answers: SKILL.md, worker references, a state schema, helper script stubs and decisions.md, and add its two allowlist entries to .claude/settings.json. Refuses while any answer is missing."
    )
    .option('--run-id <name>', 'The skill name the run is for')
    .option('--dry-run', 'Show what it would write and change nothing')
    .addHelpText(
      'after',
      '\nExamples:\n  tim skill scaffold --run-id ticket-notes --dry-run\n  tim skill scaffold --run-id ticket-notes'
    )
    .action(
      skillAction(timVersion, {
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          runId: opts.runId,
          dryRun: opts.dryRun === true
        }),
        run: (_context, parsed) =>
          scaffoldSkill({ ...parsed, now: stampNow() }),
        renderText: ({ text }) => text
      })
    )

/**
 * `tim skill`: the steps of the skill-creator skill.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const skill = program
    .command('skill')
    .description(
      'Start, answer, render and scaffold a new workspace skill, or start an audit of existing skills'
    )
  registerStart(skill, { timVersion })
  registerAnswer(skill, { timVersion })
  registerRender(skill, { timVersion })
  registerScaffold(skill, { timVersion })
}
