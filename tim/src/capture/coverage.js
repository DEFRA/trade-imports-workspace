import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { run as execRun } from '../exec/exec.js'

const SLUG_TOKEN = '{slug}'
const ANY_SEGMENT = '[^/]+'
const PLACEHOLDER = /(\{[A-Za-z][A-Za-z0-9]*\})/

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const substitutePlaceholders = (template) =>
  template
    .split(PLACEHOLDER)
    .map((part) => (PLACEHOLDER.test(part) ? ANY_SEGMENT : escapeRegex(part)))
    .join('')

/**
 * The regular expression that matches one page's URL and no other. Every
 * placeholder in the app's page path stands for a single path segment — an id
 * the app made up at run time — and the slug is pinned to the end, so
 * "commodities" does not also match "commodities/identification". A trailing
 * slash and a query string are both allowed.
 *
 * @param {{pagePath: string, slug: string}} args
 * @returns {string}
 */
export const pageUrlPattern = ({ pagePath, slug }) => {
  const prefix = pagePath.slice(0, -SLUG_TOKEN.length).replace(/\/+$/, '')
  const tail = slug === '' ? '' : `/${escapeRegex(slug)}`
  return `${substitutePlaceholders(prefix)}${tail}/?(\\?|$)`
}

const ROW = /^\s*\d+\.\s/

/**
 * How many requests the trace CLI listed. Its table prints a numbered row per
 * request under two heading lines, and "No network requests" when nothing
 * matched.
 *
 * @param {string} stdout
 * @returns {number}
 */
export const countRequestRows = (stdout) =>
  stdout.split('\n').filter((line) => ROW.test(line)).length

const traceCliPath = () =>
  join(
    dirname(createRequire(import.meta.url).resolve('playwright/package.json')),
    'cli.js'
  )

const requestArgs = (pattern) => [
  'trace',
  'requests',
  '--method',
  'GET',
  '--status',
  '200',
  '--grep',
  pattern
]

/**
 * Which of the journey's pages one trace reached. The trace CLI keeps its
 * extracted trace in `.playwright-cli/` under the folder it runs in, so it is
 * always run in a folder the caller owns, and always closed again.
 *
 * @param {object} args
 * @param {string} args.tracePath
 * @param {Array<{id: string, slug: string}>} args.pages
 * @param {string} args.pagePath
 * @param {string} args.workDir - A folder the trace CLI may write into
 * @param {Function} [args.run] - The subprocess seam; defaults to exec's run
 * @returns {Promise<string[]>} The ids of the pages this trace reached
 */
export const readTraceCoverage = async ({
  tracePath,
  pages,
  pagePath,
  workDir,
  run = execRun
}) => {
  const cli = (args) =>
    run(process.execPath, [traceCliPath(), ...args], { cwd: workDir })
  await cli(['trace', 'open', tracePath])
  try {
    const reached = []
    for (const page of pages) {
      const { stdout } = await cli(
        requestArgs(pageUrlPattern({ pagePath, slug: page.slug }))
      )
      if (countRequestRows(stdout) > 0) reached.push(page.id)
    }
    return reached
  } finally {
    await cli(['trace', 'close'])
  }
}

/**
 * The inventory with each page marked reached or not, and the traces that
 * reached it. The unreached list is what says which specs still need writing.
 *
 * @param {object} args
 * @param {Array<{section: string, id: string, slug: string, order: number}>} args.inventory
 * @param {Array<{file: string, reached: string[]}>} args.perTrace
 * @returns {{pages: object[], gaps: object[], reachedCount: number, pageCount: number}}
 */
export const coverageFor = ({ inventory, perTrace }) => {
  const pages = inventory.map((page) => {
    const reachedBy = perTrace
      .filter(({ reached }) => reached.includes(page.id))
      .map(({ file }) => file)
    return { ...page, reached: reachedBy.length > 0, reachedBy }
  })
  const gaps = pages.filter(({ reached }) => !reached)
  return {
    pages,
    gaps,
    reachedCount: pages.length - gaps.length,
    pageCount: pages.length
  }
}
