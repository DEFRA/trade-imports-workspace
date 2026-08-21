import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { TimError } from '../errors.js'
import { readJsonFile } from './io.js'
import { loadCorpus } from './load.js'
import { loadJourney, groupByJourney, declaresJourney } from './journey.js'

/**
 * The formatting a JSON file already carries, read off the file itself.
 *
 * The backlog is hand-authored canonical data. Rewriting it in whatever shape
 * `JSON.stringify` happens to default to would put a whole-file diff under a
 * change that only moves array entries, and nobody could then see what moved.
 *
 * @param {string} text - The file exactly as it is on disk
 * @returns {{indent: string, trailingNewline: boolean}}
 */
export const formatOf = (text) => ({
  indent: /^[{[]\r?\n([ \t]+)\S/.exec(text)?.[1] ?? '',
  trailingNewline: text.endsWith('\n')
})

/**
 * Write a value out in the formatting a file was read in.
 *
 * @param {any} value
 * @param {{indent: string, trailingNewline: boolean}} format
 * @returns {string}
 */
export const serialiseLike = (value, { indent, trailingNewline }) =>
  `${JSON.stringify(value, null, indent)}${trailingNewline ? '\n' : ''}`

const writeAtomic = (path, body) => {
  const tmp = join(dirname(path), `.${basename(path)}.tmp`)
  writeFileSync(tmp, body, 'utf8')
  renameSync(tmp, path)
}

/**
 * Every finding id in the order the report presents it, read straight off the
 * groups the renderer is given. Section order, page order within a section and
 * card order within a page all come from `groupByJourney`, so this file never
 * has an opinion about any of them.
 *
 * @param {object[]} groups - From groupByJourney
 * @returns {string[]}
 */
const idsInReportOrder = (groups) =>
  groups.flatMap((group) =>
    group.pages.flatMap((page) => page.items.map((item) => item.id))
  )

const noJourney = ({ profile }) =>
  declaresJourney({ profile })
    ? new TimError(
        'USAGE',
        `The corpus "${profile.id}" declares a journey but tim cannot read it, so there is no order to put the backlog in. Check that the repo the journey names is checked out and that its flow file is where the corpus says.`
      )
    : new TimError(
        'USAGE',
        `The corpus "${profile.id}" declares no journey, so its findings have no journey order and its backlog cannot be reordered. Only a corpus comparing a service against a design declares one.`
      )

/**
 * Rewrite the backlog's increments into the order the report presents them.
 *
 * Nothing but the order of that one array changes. The file is round-tripped
 * first and refused if it does not come back byte for byte, so a formatting
 * difference stops the run rather than landing silently on 1.4 MB of canonical
 * data.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {boolean} [args.check] - Report what would move and write nothing
 * @returns {Promise<object>}
 * @throws {TimError} USAGE when the corpus has no journey to order by
 */
export const runReorder = async ({ profile, check = false }) => {
  const path = profile.paths.backlog
  const raw = readJsonFile(path)

  const loaded = await loadJourney({ profile })
  if (!loaded) throw noJourney({ profile })

  const corpus = loadCorpus({ profile })
  const { groups, warnings } = groupByJourney({
    findings: corpus.findings,
    ...loaded
  })

  const rankOfId = new Map(
    idsInReportOrder(groups).map((id, position) => [id, position])
  )

  const before = raw.increments
  // Withdrawn findings and anything else the report does not put in a page
  // group keep their own order and sit below the work, exactly as the page
  // puts them below its sections.
  const shown = before
    .filter((entry) => rankOfId.has(entry.id))
    .sort((a, b) => rankOfId.get(a.id) - rankOfId.get(b.id))
  const notShown = before.filter((entry) => !rankOfId.has(entry.id))
  const after = [...shown, ...notShown]

  const moved = after.filter(
    (entry, position) => before[position].id !== entry.id
  )

  const text = readFileSync(path, 'utf8')
  const format = formatOf(text)
  if (serialiseLike(raw, format) !== text) {
    throw new TimError(
      'PARSE',
      `tim cannot rewrite ${path} without reformatting it, so it has left the file alone. Reformat the file to one shape first, then run this again.`
    )
  }

  if (!check) {
    writeAtomic(path, serialiseLike({ ...raw, increments: after }, format))
  }

  return {
    path,
    total: before.length,
    moved: moved.length,
    stayed: before.length - moved.length,
    inOrder: moved.length === 0,
    order: after.map((entry) => entry.id),
    notShown: notShown.map((entry) => entry.id),
    warnings,
    checked: check,
    written: !check,
    exitNonZero: check && moved.length > 0
  }
}
