import { writeFileSync } from 'node:fs'
import { ERROR, USAGE } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { isTimError } from '../../errors.js'
import { deriveTheme } from '../../theme-ticket/derive.js'
import { pushDescription, renderPushText } from '../../theme-ticket/push.js'
import { checkStaleTickets, renderStaleText } from '../../theme-ticket/stale.js'
import { renderStartText, startThemeTicket } from '../../theme-ticket/start.js'
import { makeRunAction } from '../_run-action.js'

const workspaceRootOf = (opts) =>
  resolveWorkspaceRoot({ explicit: opts.workspace })

const exitCodeForError = (error) =>
  isTimError(error) && error.code === 'USAGE' ? USAGE : ERROR

const themeTicketAction = (timVersion, { parseOptions, run, renderText }) =>
  makeRunAction({
    parseOptions,
    run,
    renderText,
    exitCodeForError,
    timVersion
  })

const registerStart = (themeTicket, { timVersion }) =>
  themeTicket
    .command('start')
    .argument('[trigger]', 'The trigger phrase, in quotes')
    .description(
      "Start the theme-ticket skill. Prints MODE: STUB, START, WRITE, MERGE or STALE, then JSON with the workarea's paths, the branch and every ticket folder with the Jira key it produced. Makes the workarea's tickets folder if it is missing."
    )
    .option('--workarea <path>', 'The workarea, as a path under workareas/')
    .option('--theme <id>', 'The theme. Every mode but STALE needs it')
    .option(
      '--mode <name>',
      'STUB, START, WRITE, MERGE or STALE. An automated caller should set it rather than rely on the trigger phrase'
    )
    .addHelpText(
      'after',
      [
        '',
        'Without --mode, the trigger phrase picks it: "stale" or "out of date" is STALE, "stub" or "split ... off" is STUB, "merge" is MERGE, "loop is starting", "build is starting" or "starting on" is START, and anything else is WRITE.',
        '',
        'Examples:',
        '  tim theme-ticket start --workarea shared/design-release-2-1 --theme origin-page --mode WRITE',
        '  tim theme-ticket start "which theme tickets are stale" --workarea shared/design-release-2-1'
      ].join('\n')
    )
    .action(
      themeTicketAction(timVersion, {
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          workarea: opts.workarea,
          theme: opts.theme,
          mode: opts.mode
        }),
        run: ({ args: [trigger] }, parsed) =>
          startThemeTicket({ ...parsed, trigger: trigger ?? '' }),
        renderText: renderStartText
      })
    )

const deriveAndWrite = async (parsed) => {
  const derived = await deriveTheme(parsed)
  if (parsed.out) {
    writeFileSync(parsed.out, `${JSON.stringify(derived, null, 2)}\n`)
  }
  return { derived, out: parsed.out }
}

const registerDerive = (themeTicket, { timVersion }) =>
  themeTicket
    .command('derive')
    .description(
      "Derive a theme's scenarios, spec files and rows, split by domain, as JSON. Fails, with the reason, when no commits match the theme, when a spec area has no domain, or when the per-domain scenario counts do not sum to the theme total."
    )
    .option('--workarea <path>', 'The workarea, as a path under workareas/')
    .option('--theme <id>', 'The theme')
    .option(
      '--branch <name>',
      'The branch the spec links point at. Defaults to the checked-out branch'
    )
    .option(
      '--commits-from <ref>',
      "Where the theme's row commits are read. Defaults to --branch. Pass the theme branch after a squash merge"
    )
    .option(
      '--out <file>',
      'Write the JSON to this file and print "Wrote <file>"'
    )
    .addHelpText(
      'after',
      [
        '',
        'A backlog whose rows carry no theme is one theme: every row is read. A scenario the theme added and a later commit renamed keeps its id and counts, read as it is now. One whose id no current spec holds was removed: it is named in warnings, not counted.',
        '',
        'Examples:',
        '  tim theme-ticket derive --workarea shared/design-release-2-1 --theme journey-foundation',
        '  tim theme-ticket derive --workarea shared/design-release-2-1 --theme origin-page --branch main --out derived.json'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          workarea: opts.workarea,
          theme: opts.theme,
          branch: opts.branch,
          commitsFrom: opts.commitsFrom,
          out: opts.out
        }),
        run: (_context, parsed) => deriveAndWrite(parsed),
        renderText: ({ derived, out }) =>
          out ? `Wrote ${out}` : JSON.stringify(derived, null, 2),
        exitCodeForError,
        timVersion
      })
    )

const registerStale = (themeTicket, { timVersion }) =>
  themeTicket
    .command('stale')
    .description(
      "Report which of a workarea's theme tickets openspec has moved on from: a ticket is stale when a spec file its description links to changed on the branch after the Jira ticket was last updated. Reads only."
    )
    .option('--workarea <path>', 'The workarea, as a path under workareas/')
    .option(
      '--branch <name>',
      'The branch the spec changes are read from. Defaults to the checked-out branch'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim theme-ticket stale --workarea shared/design-release-2-1',
        '  tim theme-ticket stale --workarea shared/eudpa-774 --branch main --json'
      ].join('\n')
    )
    .action(
      themeTicketAction(timVersion, {
        parseOptions: (opts) => ({
          workspaceRoot: workspaceRootOf(opts),
          workarea: opts.workarea,
          branch: opts.branch
        }),
        run: (_context, parsed) => checkStaleTickets(parsed),
        renderText: renderStaleText
      })
    )

const registerPush = (themeTicket, { timVersion }) =>
  themeTicket
    .command('push')
    .argument('[folder]', 'The ticket folder')
    .description(
      "Post a ticket folder's description.txt and the summary from its ticket.json to Jira in one update. Refuses a hard-wrapped description or one using {expand}. Dry run by default; --confirm sends it and checks it landed."
    )
    .option(
      '--key <key>',
      'The Jira key, for a folder with no ticket.created.json'
    )
    .option('--confirm', 'Send it for real (the default is a dry run)')
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim theme-ticket push workareas/shared/design-release-2-1/tickets/animals-journey',
        '  tim theme-ticket push workareas/shared/design-release-2-1/tickets/animals-journey --confirm'
      ].join('\n')
    )
    .action(
      themeTicketAction(timVersion, {
        parseOptions: (opts) => ({
          key: opts.key,
          confirm: opts.confirm === true
        }),
        run: ({ args: [folder] }, parsed) =>
          pushDescription({ ...parsed, folder }),
        renderText: renderPushText
      })
    )

/**
 * `tim theme-ticket`: the steps of the theme-ticket skill.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const themeTicket = program
    .command('theme-ticket')
    .description(
      "Start the theme-ticket skill, derive a theme's scenarios by domain, report stale theme tickets and post a ticket's description to Jira"
    )
  registerStart(themeTicket, { timVersion })
  registerDerive(themeTicket, { timVersion })
  registerStale(themeTicket, { timVersion })
  registerPush(themeTicket, { timVersion })
}
