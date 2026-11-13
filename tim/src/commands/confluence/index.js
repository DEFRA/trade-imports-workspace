import { createConfluenceClient } from '../../clients/confluence-client.js'
import { makeClientAction } from '../_client-action.js'

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
}
