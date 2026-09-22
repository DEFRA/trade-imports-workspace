import { existsSync, readFileSync } from 'node:fs'
import { readJsonFile } from './io.js'
import { TimError } from '../errors.js'
import {
  checkLedger,
  isAwaitingRuling,
  defaultInForce,
  blockingIncrementIds
} from './profiles/requirements-v2.ledger.js'

const METADATA_LINE = /^`(q-[a-z0-9-]+)`\s*·/
const HEADING_LINE = /^###\s+(.*\S)\s*$/
const DEFAULT_SEGMENT = /^default in force:\s*([A-Z])\s*\((d-\d{3,})\)$/
const BLOCKS_SEGMENT = /^blocks\s+(inc-\d{3,}(?:,\s*inc-\d{3,})*)$/
const NO_BLOCKS_TEXT = 'blocks nothing today'

/**
 * Parse the hand-written decisions page's question metadata lines (DESIGN
 * 9.2). One entry per `` `q-<slug>` · ... `` line, with the headline taken
 * from the nearest `###` heading above it.
 *
 * @param {string} markdown
 * @returns {{id: string, headline: string|null, defaultInForce: {option: string, decision: string}|null, blocks: string[], line: number}[]}
 */
export const parseDecisionsPage = (markdown) => {
  const lines = markdown.split('\n')
  let headline = null
  const entries = []

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim()
    const heading = HEADING_LINE.exec(line)
    if (heading) {
      headline = heading[1]
      return
    }

    if (!METADATA_LINE.test(line)) return
    const segments = line.split('·').map((segment) => segment.trim())
    const id = segments[0].replace(/`/g, '')

    let entryDefault = null
    let blocks = []
    for (const segment of segments.slice(1)) {
      const defaultMatch = DEFAULT_SEGMENT.exec(segment)
      if (defaultMatch) {
        entryDefault = { option: defaultMatch[1], decision: defaultMatch[2] }
        continue
      }
      if (segment === NO_BLOCKS_TEXT) {
        blocks = []
        continue
      }
      const blocksMatch = BLOCKS_SEGMENT.exec(segment)
      if (blocksMatch) {
        blocks = blocksMatch[1].split(',').map((entry) => entry.trim())
      }
    }

    entries.push({
      id,
      headline,
      defaultInForce: entryDefault,
      blocks,
      line: index + 1
    })
  })

  return entries
}

const nameOf = (question, id) =>
  question?.headline ? `${id} (${question.headline})` : id

const checkQuestionKnown = ({ entry, question }) =>
  question
    ? null
    : `${nameOf(null, entry.id)}: the page lists this question, but backlog.json has none with this id.`

const checkStillAwaitingRuling = ({ entry, question }) =>
  isAwaitingRuling(question)
    ? null
    : `${nameOf(question, entry.id)}: the page lists this question, but backlog.json has ruled it (status "${question.status}").`

const sameDefault = (pageDefault, backlogDefault) =>
  pageDefault?.option === backlogDefault?.option &&
  pageDefault?.decision === backlogDefault?.decision

const checkDefaultInForceMatches = ({ entry, question, backlog }) => {
  const inForce = defaultInForce(backlog, entry.id)
  const backlogDefault = inForce
    ? { option: inForce.chosen, decision: inForce.id }
    : null
  const pageDefault = entry.defaultInForce

  if (sameDefault(pageDefault, backlogDefault)) return null

  if (pageDefault && backlogDefault) {
    return `${nameOf(question, entry.id)}: the page says the default in force is ${pageDefault.option} (${pageDefault.decision}), but backlog.json says ${backlogDefault.option} (${backlogDefault.decision}).`
  }
  if (pageDefault) {
    return `${nameOf(question, entry.id)}: the page says the default in force is ${pageDefault.option} (${pageDefault.decision}), but backlog.json has none in force.`
  }
  return `${nameOf(question, entry.id)}: backlog.json's default in force is ${backlogDefault.option} (${backlogDefault.decision}), but the page shows none.`
}

const checkBlocksMatch = ({ entry, question, backlog }) => {
  const backlogBlocks = blockingIncrementIds(backlog, entry.id)
  const pageBlocks = [...entry.blocks].sort()
  if (JSON.stringify(pageBlocks) === JSON.stringify(backlogBlocks)) return null
  return `${nameOf(question, entry.id)}: the page says it blocks ${pageBlocks.length ? pageBlocks.join(', ') : 'nothing'}, but backlog.json says it blocks ${backlogBlocks.length ? backlogBlocks.join(', ') : 'nothing'}.`
}

const checkNotMissingFromPage = ({ question, pageIds }) =>
  isAwaitingRuling(question) && !pageIds.has(question.id)
    ? `${nameOf(question, question.id)}: backlog.json is awaiting a ruling on this question, but the page does not list it.`
    : null

const mismatchesForEntry = ({ entry, backlog, questionsById }) => {
  const question = questionsById.get(entry.id)
  const unknown = checkQuestionKnown({ entry, question })
  if (unknown) return [unknown]

  const notAwaiting = checkStillAwaitingRuling({ entry, question })
  if (notAwaiting) return [notAwaiting]

  return [
    checkDefaultInForceMatches({ entry, question, backlog }),
    checkBlocksMatch({ entry, question, backlog })
  ].filter(Boolean)
}

/**
 * Compare a parsed decisions page against the backlog it claims to view
 * (DESIGN 9.2, D16): every question id, its default in force, and its
 * blocked increments, "awaiting a ruling" meaning DESIGN 3.6's one
 * definition.
 *
 * @param {object} args
 * @param {object[]} args.page - `parseDecisionsPage`'s result
 * @param {object} args.backlog
 * @returns {string[]} One sentence per mismatch, each naming the question
 */
export const comparePageWithBacklog = ({ page, backlog }) => {
  const questionsById = new Map(
    (backlog.questions ?? []).map((question) => [question.id, question])
  )
  const pageIds = new Set(page.map((entry) => entry.id))

  const entryMismatches = page.flatMap((entry) =>
    mismatchesForEntry({ entry, backlog, questionsById })
  )

  const missingMismatches = (backlog.questions ?? [])
    .map((question) => checkNotMissingFromPage({ question, pageIds }))
    .filter(Boolean)

  return [...entryMismatches, ...missingMismatches]
}

/**
 * Check the hand-written decisions page against the live backlog (DESIGN
 * 9.2, `tim backlog question check-page`). Read-only.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.pagePath
 * @returns {{matched: number, questions: string[]}}
 * @throws {TimError} NOT_FOUND — a missing page. PARSE — a backlog that
 *   fails `checkLedger`. LINT — one or more mismatches, all listed
 */
export const checkDecisionsPage = ({ profile, pagePath }) => {
  if (!existsSync(pagePath)) {
    throw new TimError('NOT_FOUND', `Can't find ${pagePath}.`)
  }
  const page = parseDecisionsPage(readFileSync(pagePath, 'utf8'))
  const backlog = readJsonFile(profile.paths.backlog)
  checkLedger(backlog)

  const mismatches = comparePageWithBacklog({ page, backlog })
  if (mismatches.length) {
    throw new TimError('LINT', mismatches.join(' '))
  }

  return {
    matched: page.length,
    questions: page.map((entry) => entry.id)
  }
}
