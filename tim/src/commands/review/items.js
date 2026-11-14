import { ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import {
  addReviewItem,
  countReviewItems,
  listReviewItems,
  markReviewItem,
  renderCountsText,
  renderItemsTsv,
  renderMarkedText,
  renderStatusText,
  setReviewItemStatus
} from '../../review/items-ledger.js'
import {
  renderRenderedItemsText,
  renderReviewItems
} from '../../review/items-table.js'
import { makeRunAction } from '../_run-action.js'

const itemsAction = ({ run, renderText, timVersion }) =>
  makeRunAction({
    parseOptions: (opts) => ({
      ...opts,
      workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace })
    }),
    run: ({ args: [reviewId] }, parsed) => run({ ...parsed, reviewId }),
    renderText,
    exitCodeForError: () => ERROR,
    timVersion
  })

const withReviewId = (command) =>
  command.argument('[review-id]', 'A ticket key, or local/<repo>/<branch>')

const registerList = (items, { timVersion }) =>
  withReviewId(items.command('list'))
    .description(
      "List a review's items from its items.<repo>.json files, one tab-separated line each: repo, id, file, line, severity, category, issue, fix, disposition, status, notes. Filters narrow the list and combine. With --json the items are result, each with its repo."
    )
    .option('--repo <repo>', 'Only this repo')
    .option('--file <path>', 'Only the items for this file, matched exactly')
    .option(
      '--filter <disposition>',
      'pending, fix, wont-fix, discuss, auto-resolved or merged'
    )
    .option('--status <status>', 'not-done, done or failed')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review items list EUDPA-1234 --filter pending --json\n  tim review items list EUDPA-1234 --filter fix --status not-done --json\n  tim review items list EUDPA-1234 --repo trade-imports-stub --file src/Main.java'
    )
    .action(
      itemsAction({
        run: listReviewItems,
        renderText: renderItemsTsv,
        timVersion
      })
    )

const registerCounts = (items, { timVersion }) =>
  withReviewId(items.command('counts'))
    .description(
      "Count a review's items by disposition and status, with the total. An item with no disposition counts as Pending."
    )
    .option('--repo <repo>', 'Only this repo')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review items counts EUDPA-1234\n  tim review items counts EUDPA-1234 --repo trade-imports-stub --json'
    )
    .action(
      itemsAction({
        run: countReviewItems,
        renderText: renderCountsText,
        timVersion
      })
    )

const registerAdd = (items, { timVersion }) =>
  withReviewId(items.command('add'))
    .description(
      "Append an item to a repo's items.<repo>.json after its highest id, starting the file if the repo has none, and print the new id. Its disposition, status and notes start empty."
    )
    .option('--repo <repo>', 'The repo the file is in')
    .option('--file <path>', "The file's path inside the repo")
    .option('--line <line>', 'The line the finding is on')
    .option('--severity <severity>', 'Critical, Major or Minor')
    .option('--category <category>', 'One of the finding categories')
    .option('--issue <text>', 'What is wrong')
    .option('--fix <text>', 'What to do about it')
    .option('--best-practice <path>', 'The best-practice file it breaks')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review items add EUDPA-1234 --repo trade-imports-stub --file src/Main.java --line 41 --severity Major --category correctness --issue "Returns 200 for a missing id" --fix "Must: return 404."'
    )
    .action(
      itemsAction({
        run: addReviewItem,
        renderText: ({ id }) => String(id),
        timVersion
      })
    )

const registerMark = (items, { timVersion }) =>
  withReviewId(items.command('mark'))
    .description(
      'Set an item\'s disposition and the status it implies: Not Done for Fix and Discuss, — for Won\'t Fix, Auto-Resolved and Merged. An empty or missing disposition clears both. Merged needs --note "merged into #N", naming the owner item.'
    )
    .option('--repo <repo>', 'The repo whose items file holds the item')
    .option('--item <id>', "The item's id")
    .option(
      '--disposition <disposition>',
      'Fix, "Won\'t Fix", Discuss, Auto-Resolved, Merged, or "" to clear'
    )
    .option('--note <text>', 'Replaces the notes; "" clears them')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review items mark EUDPA-1234 --repo trade-imports-stub --item 3 --disposition Fix\n  tim review items mark EUDPA-1234 --repo trade-imports-stub --item 4 --disposition Merged --note "merged into #3"'
    )
    .action(
      itemsAction({
        run: markReviewItem,
        renderText: renderMarkedText,
        timVersion
      })
    )

const registerRender = (items, { timVersion }) =>
  withReviewId(items.command('render'))
    .description(
      "Print a repo's items as the ## Items markdown table. A fix's Must: and One way: parts get a column each. --write puts the table into review.<repo>.md instead: over the items table there, else over the comment that names the renderer, else before the ## Repository Verdict heading."
    )
    .option('--repo <repo>', 'The repo whose items to render')
    .option('--write', 'Put the table into review.<repo>.md')
    .addHelpText(
      'after',
      '\nExamples:\n  tim review items render EUDPA-1234 --repo trade-imports-stub\n  tim review items render EUDPA-1234 --repo trade-imports-stub --write'
    )
    .action(
      itemsAction({
        run: renderReviewItems,
        renderText: renderRenderedItemsText,
        timVersion
      })
    )

const registerStatus = (items, { timVersion }) =>
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
      '\nExamples:\n  tim review items status EUDPA-1234 --repo trade-imports-stub --item 3 --status Done --note "abc1234"\n  tim review items status EUDPA-1234 --repo trade-imports-stub --item 3 --status Failed --note "Tests went red"'
    )
    .action(
      itemsAction({
        run: setReviewItemStatus,
        renderText: renderStatusText,
        timVersion
      })
    )

/**
 * `tim review items`: a review's consolidated items, one items.<repo>.json
 * per repo.
 *
 * @param {import('commander').Command} review
 * @param {{timVersion: string}} options
 */
export const registerItems = (review, { timVersion }) => {
  const items = review
    .command('items')
    .description("Read and change a review's items")
  registerList(items, { timVersion })
  registerCounts(items, { timVersion })
  registerAdd(items, { timVersion })
  registerMark(items, { timVersion })
  registerStatus(items, { timVersion })
  registerRender(items, { timVersion })
}
