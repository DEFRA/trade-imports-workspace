import { aggregateFileStyles } from '../../style/aggregate.js'
import {
  addFileStyleTodo,
  initFileStyle,
  setFileStyleVerdict
} from '../../style/file-style.js'
import {
  addStyleItem,
  countStyleItems,
  listedStyleJson,
  listStyleItems,
  markStyleItem,
  renderListedStyleText,
  renderStyleMarkedText,
  renderStyleStatusText,
  setStyleItemStatus
} from '../../style/items-ledger.js'
import { renderStyleItems } from '../../style/items-table.js'
import { reconcileFileStyles } from '../../style/reconcile.js'
import { renderCountsText } from '../../review/items-ledger.js'
import { reconciledJson, renderReconciledText } from '../../review/reconcile.js'
import { reviewAction } from '../review/tools.js'
import { registerStartCommands } from './start.js'

const withReviewId = (command) =>
  command.argument('[review-id]', 'A ticket key, or local/<repo>/<branch>')

const registerItems = (style, { timVersion }) => {
  const items = style
    .command('items')
    .description(
      "Read and change a code style review's items, one items.<repo>.json per repo under workareas/code-style-reviews/<review-id>"
    )
  withReviewId(items.command('list'))
    .description(
      "List a style review's items, one tab-separated line each: repo, id, file, line, rule, severity, issue, fix, disposition, status, notes. Filters narrow the list and combine. --by-file prints the items grouped by repo and file, as JSON. With --json the items, or the groups, are result."
    )
    .option('--repo <repo>', 'Only this repo')
    .option('--file <path>', 'Only the items for this file, matched exactly')
    .option(
      '--filter <disposition>',
      'pending, fix, wont-fix, discuss or auto-resolved'
    )
    .option('--status <status>', 'not-done, done or failed')
    .option('--by-file', 'Group the items by repo and file')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style items list EUDPA-1234 --filter pending --json\n  tim style items list EUDPA-1234 --filter fix --status not-done --by-file --json'
    )
    .action(
      reviewAction({
        run: listStyleItems,
        renderText: renderListedStyleText,
        toJson: listedStyleJson,
        timVersion
      })
    )
  withReviewId(items.command('counts'))
    .description(
      "Count a style review's items by disposition and status, with the total. An item with no disposition counts as Pending."
    )
    .option('--repo <repo>', 'Only this repo')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style items counts EUDPA-1234 --repo trade-imports-stub --json'
    )
    .action(
      reviewAction({
        run: countStyleItems,
        renderText: renderCountsText,
        timVersion
      })
    )
  withReviewId(items.command('add'))
    .description(
      "Append an item to a repo's items.<repo>.json after its highest id, starting the file if the repo has none, and print the new id. Its disposition, status and notes start empty."
    )
    .option('--repo <repo>', 'The repo the file is in')
    .option('--file <path>', "The file's path inside the repo")
    .option('--line <line>', 'The line the finding is on; may be empty')
    .option('--rule <rule>', 'The style guide rule it breaks')
    .option('--severity <severity>', 'FAIL or WARN')
    .option('--category <category>', 'A code-quality or design category')
    .option('--issue <text>', 'What is wrong')
    .option('--fix <text>', 'What to do about it')
    .option('--best-practice <path>', 'The best-practice file it breaks')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style items add EUDPA-1234 --repo trade-imports-stub --file src/a.js --line 4 --rule 6 --severity WARN --issue "Abbreviated name" --fix "Spell it out"'
    )
    .action(
      reviewAction({
        run: addStyleItem,
        renderText: ({ id }) => String(id),
        timVersion
      })
    )
  withReviewId(items.command('mark'))
    .description(
      "Set an item's disposition and the status it implies: Not Done for Fix and Discuss, — for Won't Fix and Auto-Resolved. An empty or missing disposition clears both."
    )
    .option('--repo <repo>', 'The repo whose items file holds the item')
    .option('--item <id>', "The item's id")
    .option(
      '--disposition <disposition>',
      'Fix, "Won\'t Fix", Discuss, Auto-Resolved, or "" to clear'
    )
    .option('--note <text>', 'Replaces the notes; "" clears them')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style items mark EUDPA-1234 --repo trade-imports-stub --item 3 --disposition Fix\n  tim style items mark EUDPA-1234 --repo trade-imports-stub --item 4 --disposition Discuss --note "Ask the designer"'
    )
    .action(
      reviewAction({
        run: markStyleItem,
        renderText: renderStyleMarkedText,
        timVersion
      })
    )
  withReviewId(items.command('status'))
    .description(
      "Set an item's status and leave its disposition. An empty or missing status clears it."
    )
    .option('--repo <repo>', 'The repo whose items file holds the item')
    .option('--item <id>', "The item's id")
    .option('--status <status>', '"Not Done", Done, Failed, —, or "" to clear')
    .option('--note <text>', 'Replaces the notes; "" clears them')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style items status EUDPA-1234 --repo trade-imports-stub --item 3 --status Done --note "abc1234"'
    )
    .action(
      reviewAction({
        run: setStyleItemStatus,
        renderText: renderStyleStatusText,
        timVersion
      })
    )
  withReviewId(items.command('render'))
    .description("Print a repo's style items as the ## Items markdown table.")
    .option('--repo <repo>', 'The repo whose items to render')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style items render EUDPA-1234 --repo trade-imports-stub'
    )
    .action(
      reviewAction({
        run: renderStyleItems,
        renderText: ({ table }) => table,
        timVersion
      })
    )
}

const fileOptions = (command) =>
  withReviewId(command)
    .option('--repo <repo>', 'The repo the file is in')
    .option('--file <path>', "The file's path inside the repo")

const registerFile = (style, { timVersion }) => {
  const file = style
    .command('file')
    .description(
      "Write one file's style review: its placeholder, its findings and its verdict"
    )
  fileOptions(file.command('init'))
    .description(
      "Write a file's style review placeholder to workareas/code-style-reviews/<review-id>/file-reviews/<repo>/<file>.style.json, replacing any review already there, and print its path. The mode is FRESH, REFRESH or MERGE_RESOLVED; the PR is null without --pr."
    )
    .option('--commit <sha>', 'The commit reviewed')
    .option('--pr <number>', 'The pull request number')
    .option('--mode <mode>', 'FRESH, REFRESH or MERGE_RESOLVED')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style file init EUDPA-1234 --repo trade-imports-stub --file src/Main.java --commit abc1234 --pr 42 --mode FRESH\n  tim style file init local/trade-imports-stub/feat/NO_JIRA-x --repo trade-imports-stub --file src/a.js --commit abc1234 --mode FRESH'
    )
    .action(
      reviewAction({
        run: initFileStyle,
        renderText: ({ path }) => path,
        timVersion
      })
    )
  fileOptions(file.command('add'))
    .description(
      "Append a finding to a file's .style.json as its next todo and print the todo's id. The line is stored as text."
    )
    .option('--line <line>', 'The line the finding is on; may be empty')
    .option('--rule <rule>', 'The style guide rule it breaks')
    .option('--category <category>', 'A code-quality or design category')
    .option('--severity <severity>', 'FAIL or WARN')
    .option('--issue <text>', 'What is wrong')
    .option('--fix <text>', 'What to do about it')
    .option('--best-practice <path>', 'The best-practice file it breaks')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style file add EUDPA-1234 --repo trade-imports-stub --file src/a.js --line 4 --rule 6 --category naming --severity WARN --issue "Abbreviated name" --fix "Spell it out"'
    )
    .action(
      reviewAction({
        run: addFileStyleTodo,
        renderText: ({ id }) => String(id),
        timVersion
      })
    )
  fileOptions(file.command('verdict'))
    .description(
      "Set a file style review's verdict (COMPLIANT, MINOR_ISSUES or NEEDS_WORK) and reason, and stamp reviewed_at. This marks the file as reviewed. Prints nothing."
    )
    .option('--verdict <verdict>', 'COMPLIANT, MINOR_ISSUES or NEEDS_WORK')
    .option('--reason <text>', 'Why, in a sentence')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style file verdict EUDPA-1234 --repo trade-imports-stub --file src/a.js --verdict MINOR_ISSUES --reason "One long line"'
    )
    .action(
      reviewAction({
        run: setFileStyleVerdict,
        renderText: () => null,
        timVersion
      })
    )
}

const registerAggregate = (style, { timVersion }) =>
  withReviewId(style.command('aggregate'))
    .description(
      "Roll up a repo's per-file style reviews: the File Analysis Summary table (each file's verdict and its FAIL and WARN counts), the ## Items table, or both. The items come from items.<repo>.json when there is one, else from the findings. --write-items starts items.<repo>.json afresh from the findings, numbered from 1 with no disposition, status or notes, and stamps reconciled_at on every reviewed file; run it once, when the review is first written. With --json the result is each file's rollup."
    )
    .option('--repo <repo>', 'The repo whose style files to roll up')
    .option('--section <section>', 'file-summary, items or both', 'both')
    .option('--write-items', 'Start items.<repo>.json afresh from the findings')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style aggregate EUDPA-1234 --repo trade-imports-stub --write-items --section file-summary\n  tim style aggregate EUDPA-1234 --repo trade-imports-stub --json'
    )
    .action(
      reviewAction({
        run: aggregateFileStyles,
        renderText: ({ markdown }) => markdown,
        toJson: ({ rollup }) => rollup,
        timVersion
      })
    )

const registerReconcile = (style, { timVersion }) =>
  withReviewId(style.command('reconcile'))
    .description(
      "Fold a refresh's style findings into a repo's items.<repo>.json. Each style file a reviewer ran since it was last reconciled has each finding added as a new item, then gets reconciled_at. It lists the items added, and the items already fixed and done in the refreshed files, to check they have not come back."
    )
    .option('--repo <repo>', 'The repo whose style files to fold in')
    .option('--dry-run', 'Say what would be added, and change nothing')
    .option('--force', 'Fold in every reviewed file, reconciled or not')
    .addHelpText(
      'after',
      '\nExamples:\n  tim style reconcile EUDPA-1234 --repo trade-imports-stub\n  tim style reconcile EUDPA-1234 --repo trade-imports-stub --dry-run --json'
    )
    .action(
      reviewAction({
        run: reconcileFileStyles,
        renderText: renderReconciledText,
        toJson: reconciledJson,
        timVersion
      })
    )

/**
 * `tim style`: the code-style skill's helpers.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const style = program
    .command('style')
    .description("The code-style skill's helpers")
  registerItems(style, { timVersion })
  registerFile(style, { timVersion })
  registerAggregate(style, { timVersion })
  registerReconcile(style, { timVersion })
  registerStartCommands(style, { timVersion })
}
