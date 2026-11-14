import {
  createConfluenceClient,
  pageIdFrom
} from '../../clients/confluence-client.js'
import { DEFAULT_ROOT_ID, syncConfluence } from '../../confluence/sync.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { makeClientAction } from '../_client-action.js'
import { ERROR } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'
import { exitCodeFor } from '../envelope.js'
import { makeRunAction } from '../_run-action.js'
import { writeLine } from '../_write-line.js'

const shown = (value) => String(value ?? null)

export const renderPage = (page) =>
  [
    `=== Page ${page.id} ===`,
    `Title: ${shown(page.title)}`,
    `Space: ${shown(page.space)}`,
    `Version: ${shown(page.version)} (Updated: ${shown(page.updated)})`,
    `Updated by: ${shown(page.updatedBy)}`,
    `URL: ${page.url}`,
    '',
    '=== Labels ===',
    ...page.labels,
    '',
    '=== Body (HTML) ===',
    page.bodyView ?? 'No content'
  ].join('\n')

const renderPageOutput = (result, options) =>
  options.raw ? JSON.stringify(result) : renderPage(result)

export const register = (program, { timVersion }) => {
  const conf = program
    .command('confluence')
    .description('Read Confluence pages')

  conf
    .command('page <id-or-url>')
    .description(
      'Fetch a Confluence page by id or URL: its details, labels and HTML body'
    )
    .option('--raw', "print Confluence's own JSON response for the page")
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim confluence page 6619005520',
        '  tim confluence page https://example.atlassian.net/wiki/spaces/EUDP/pages/6619005520/Title --raw'
      ].join('\n')
    )
    .action(
      makeClientAction({
        client: () => createConfluenceClient(),
        call: (client, [input], options) =>
          options.raw ? client.getPageView(input) : client.getPage(input),
        renderText: renderPageOutput,
        timVersion
      })
    )

  registerSync(conf, { timVersion })
}

const progressWriter = ({ json }) =>
  json ? async () => {} : (line) => writeLine(process.stdout, line)

const registerSync = (conf, { timVersion }) =>
  conf
    .command('sync')
    .description(
      'Mirror a Confluence folder tree as Markdown under docs/confluence in this workspace. Running it again overwrites the files it wrote.'
    )
    .option(
      '--root-id <id>',
      'the Confluence folder or page the tree starts at',
      DEFAULT_ROOT_ID
    )
    .option(
      '--page-id <id>',
      'refresh only this page, in place, and stop. The page must have been synced once so its file is known'
    )
    .option('--dry-run', 'say what would be synced without writing files')
    .option(
      '--clean',
      'remove docs/confluence first, so pages deleted in Confluence go too'
    )
    .addHelpText(
      'after',
      [
        '',
        'Examples:',
        '  tim confluence sync',
        '  tim confluence sync --clean',
        '  tim confluence sync --page-id 6468764101',
        '  tim confluence sync --root-id 6447269328 --dry-run'
      ].join('\n')
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          client: createConfluenceClient(),
          baseUrl: process.env.JIRA_BASE_URL,
          workspaceRoot: resolveWorkspaceRoot({ explicit: opts.workspace }),
          rootId: pageIdFrom(opts.rootId),
          pageId: opts.pageId === undefined ? null : pageIdFrom(opts.pageId),
          dryRun: opts.dryRun === true,
          clean: opts.clean === true,
          log: progressWriter(opts)
        }),
        run: (_, parsed) => syncConfluence(parsed),
        renderText: () => null,
        exitCodeForError: (error) =>
          isTimError(error) && error.code === 'NOT_FOUND'
            ? ERROR
            : exitCodeFor(error),
        timVersion
      })
    )
