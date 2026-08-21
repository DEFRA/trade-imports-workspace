import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnumerators } from './coverage.js'
import { byGateThenType } from './render/page.js'

const require = createRequire(import.meta.url)

const BESIDE = 'beside-the-journey'
const NO_SCREEN_PAGE = 'page-no-screen'
const NO_SCREEN_TITLE = 'No screen to look at'

/**
 * The page a screen id belongs to, by longest prefix.
 *
 * The same rule `compareCoverage` uses to attribute a captured state to its
 * page, and it matters for the same reason: `fe-import-reason-transit` is its
 * own page, not a state of `fe-import-reason`, and `fe-address-picker-consignee`
 * is one page rather than a state of a page called `fe-address`. Splitting on
 * `-` gets both wrong.
 *
 * Matched against whichever list is passed rather than always the enumerated
 * one. Two corpora enumerate the same application differently — one names
 * `fe-dashboard`, the other only `fe-dashboard-empty` and
 * `fe-dashboard-populated` — so the list that decides where a finding goes has
 * to be the journey's own pages, with the enumeration used only to find what
 * sits outside it.
 *
 * @param {string} screen
 * @param {string[]} pages
 * @returns {string|null}
 */
const pageOf = (screen, pages) => {
  if (pages.includes(screen)) return screen
  return (
    pages
      .filter((page) => screen.startsWith(`${page}-`))
      .sort((a, b) => b.length - a.length)[0] ?? null
  )
}

const sentence = (text) => text.charAt(0).toUpperCase() + text.slice(1)

const screenTitle = (screen, prefix) => {
  const bare =
    prefix && screen.startsWith(prefix) ? screen.slice(prefix.length) : screen
  return sentence(bare.split('-').join(' '))
}

const sectionTitle = (id) =>
  sentence(id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase())

/**
 * Ruled work sinks to the foot of its page group.
 *
 * A ruled finding keeps its slot, so a page still reads as the whole picture
 * for that page rather than as whatever is left of it. It just stops sitting
 * above the work somebody still has to do.
 */
const inGroup = (a, b) =>
  Number(Boolean(a.decision)) - Number(Boolean(b.decision)) ||
  byGateThenType(a, b)

const declaredJourney = (profile) => {
  const path = profile?.paths?.enumeratorModule
  if (!path || !existsSync(path)) return null
  try {
    return require(path).journey ?? null
  } catch {
    return null
  }
}

/**
 * Whether this corpus says its findings have a journey order at all.
 *
 * Separate from `loadJourney` so the caller can tell "this comparison has no
 * journey, and never will" — dr21 compares two designs, not a service — from
 * "this one does and the report could not read it", which is worth a warning.
 *
 * @param {object} args
 * @param {object} args.profile
 * @returns {boolean}
 */
export const declaresJourney = ({ profile }) =>
  Boolean(declaredJourney(profile))

/**
 * The journey a corpus declares, its flow, and the screens its side has.
 *
 * Returns null rather than throwing whenever the answer is "no journey here":
 * a corpus that declares none, a checkout that is missing, an enumerator that
 * has drifted. None of those is a reason to fail to render a report — the
 * report falls back to grouping by band and says so.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @returns {Promise<{journey: object, flow: {sections: object[]}, screens: string[]}|null>}
 */
export const loadJourney = async ({ profile }) => {
  const declared = declaredJourney(profile)
  if (!declared) return null

  const side =
    profile.sideById?.[declared.side] ??
    profile.sides?.find((one) => one.id === declared.side) ??
    null
  if (!side) return null

  const repoPath = profile.repos?.[side.repo]?.absolutePath
  if (!repoPath) return null

  // Read the flow from the working tree, not from the commit the corpus pins.
  // Journey order is presentational — it decides which heading a finding sits
  // under, never what the finding says — and a git blob cannot be imported
  // without being written out somewhere first.
  const flowPath = join(repoPath, declared.flowPath)
  if (!existsSync(flowPath)) return null

  let flow
  try {
    flow = await import(pathToFileURL(flowPath).href)
  } catch {
    return null
  }
  if (!Array.isArray(flow.sections)) return null

  const enumerate = loadEnumerators(profile.paths.enumeratorModule)[
    declared.side
  ]
  if (!enumerate) return null

  let screens
  try {
    // The enumerator throws by design when the checkout it reads has drifted
    // from what it was written against. That is a coverage problem, not a
    // reporting one, so it must not take the report down with it.
    screens = (enumerate({ repoPath, side }) ?? []).map((entry) => entry.screen)
  } catch {
    return null
  }

  return {
    // The prefix that tells one side's screen ids from the other's belongs to
    // the side, and grouping needs it, so it travels with the journey rather
    // than making the grouping ask for the whole profile.
    journey: { ...declared, screenPrefix: side.screenPrefix ?? '' },
    flow: { sections: flow.sections },
    screens
  }
}

/**
 * Group findings by the page they are about, in journey order.
 *
 * Every finding appears exactly once. That is not tidiness: the card's DOM id
 * is the finding's anchor, the "N of M shown" counter counts card nodes, and
 * the ruling command is looked up with a singular querySelector. A second copy
 * breaks all three.
 *
 * Where a finding names several screens of this side, it is filed under the
 * earliest of them in journey order. Journey pages always come before the
 * pages beside the journey, so a finding touching both a journey page and the
 * hub is filed on the journey.
 *
 * @param {object} args
 * @param {object[]} args.findings
 * @param {object} args.journey - From loadJourney
 * @param {{sections: object[]}} args.flow
 * @param {string[]} args.screens - Every screen the side's enumerator names
 * @returns {{groups: object[], warnings: string[]}}
 */
export const groupByJourney = ({ findings, journey, flow, screens }) => {
  const warnings = []
  const prefix = journey.screenPrefix ?? ''
  const screenOfPage = journey.screenOfPage ?? {}
  const enumerated = screens ?? []

  const slots = []
  const rankOfScreen = new Map()
  const addSlot = (sectionId, screen) => {
    if (rankOfScreen.has(screen)) return
    rankOfScreen.set(screen, slots.length)
    slots.push({ sectionId, screen })
  }

  for (const section of flow.sections ?? []) {
    for (const flowPage of section.pages ?? []) {
      const screen = screenOfPage[flowPage.id]
      if (!screen) {
        warnings.push(
          `The journey flow has a page called "${flowPage.id}" that the corpus maps to no screen, so anything found about it will not appear under its section.`
        )
        continue
      }
      addSlot(section.id, screen)
    }
  }

  const journeyScreens = slots.map((slot) => slot.screen)

  for (const screen of journeyScreens) {
    if (enumerated.some((one) => pageOf(one, journeyScreens) === screen)) {
      continue
    }
    const pageId = Object.keys(screenOfPage).find(
      (key) => screenOfPage[key] === screen
    )
    warnings.push(
      `The corpus files the journey page "${pageId}" under the screen "${screen}", but the enumerator names no screen that belongs to it, so the page stays empty.`
    )
  }

  // What sits beside the journey is derived, never listed: every enumerated
  // screen the flow never reaches. A state of one of those — the part-answered
  // hub — folds into it rather than becoming a page of its own.
  const strays = enumerated.filter((screen) => !pageOf(screen, journeyScreens))
  const besidePages = strays
    .filter(
      (screen) =>
        !strays.some(
          (other) => other !== screen && screen.startsWith(`${other}-`)
        )
    )
    .sort()
  for (const screen of besidePages) addSlot(BESIDE, screen)

  const itemsOfSlot = new Map()
  const homeless = []

  for (const item of findings) {
    const mine = (item.screens ?? []).filter((screen) =>
      screen.startsWith(prefix)
    )
    const ranks = []
    for (const screen of mine) {
      const home =
        pageOf(screen, journeyScreens) ?? pageOf(screen, besidePages) ?? null
      if (!home) {
        warnings.push(
          `Finding ${item.id} names the screen "${screen}", which belongs to no page of this journey, so the finding sits beside the journey.`
        )
        continue
      }
      ranks.push(rankOfScreen.get(home))
    }
    if (ranks.length === 0) {
      homeless.push(item)
      continue
    }
    const rank = Math.min(...ranks)
    if (!itemsOfSlot.has(rank)) itemsOfSlot.set(rank, [])
    itemsOfSlot.get(rank).push(item)
  }

  const pagesIn = (sectionId) =>
    slots
      .map((slot, rank) => ({ ...slot, rank }))
      .filter(
        (slot) => slot.sectionId === sectionId && itemsOfSlot.has(slot.rank)
      )
      .map((slot) => ({
        id: `page-${slot.screen}`,
        screen: slot.screen,
        title:
          journey.screenLabels?.[slot.screen] ??
          screenTitle(slot.screen, prefix),
        items: [...itemsOfSlot.get(slot.rank)].sort(inGroup)
      }))

  const groups = []
  for (const section of flow.sections ?? []) {
    const pages = pagesIn(section.id)
    if (pages.length === 0) continue
    groups.push({
      id: `journey-${section.id}`,
      title: journey.sectionLabels?.[section.id] ?? sectionTitle(section.id),
      pages
    })
  }

  const beside = pagesIn(BESIDE)
  if (homeless.length > 0) {
    beside.push({
      id: NO_SCREEN_PAGE,
      screen: null,
      title: NO_SCREEN_TITLE,
      items: [...homeless].sort(inGroup)
    })
  }
  if (beside.length > 0) {
    groups.push({ id: BESIDE, title: 'Beside the journey', pages: beside })
  }

  return { groups, warnings }
}
