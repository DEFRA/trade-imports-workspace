import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonFile } from '../io.js'

/**
 * The four states, best first. Every card gets one per side, always: a missing
 * file changes the markup, it never emits a broken img, and it never collapses
 * the pair to one column — an asymmetric layout reads as "there is nothing on
 * that side", which is a different and false claim.
 */
export const ASSET_STATES = ['crop', 'page', 'model', 'absent']

const fileIfPresent = (path) =>
  path && existsSync(path) ? { path, bytes: statSync(path).size } : null

/**
 * Turn a captured page model into a text plate: what the page contains, in
 * document order, when there is no picture of it.
 *
 * This is genuine evidence rather than a placeholder. On day one it is the
 * whole frontend column — 70 prototype screenshots exist and zero frontend
 * ones do — so it has to read as a description of a page, not as an error.
 *
 * @param {object} model - A captured page model
 * @returns {object}
 */
export const OPTIONS_SHOWN = 4

export const modelPlate = (model) => {
  const rows = []
  if (model.phaseBanner) rows.push({ kind: 'banner', text: model.phaseBanner })
  if (model.serviceNav?.length) {
    rows.push({
      kind: 'nav',
      text: model.serviceNav.map((entry) => entry.text ?? entry).join(' · ')
    })
  }
  if (model.backLink) rows.push({ kind: 'back', text: model.backLink })
  if (model.caption) rows.push({ kind: 'caption', text: model.caption })
  if (model.h1) rows.push({ kind: 'h1', text: model.h1 })

  for (const heading of model.headings ?? []) {
    const text = heading.text ?? heading
    if (text === model.h1) continue
    rows.push({ kind: 'heading', text, level: heading.level ?? null })
  }

  for (const field of model.allFields ?? []) {
    // A hidden crumb or sort field is machinery, not something on the page.
    if (field.kind === 'hidden') continue
    const options = field.options ?? []
    rows.push({
      kind: 'field',
      text: field.label ?? field.legend ?? field.name ?? '(unlabelled field)',
      name: field.name ?? null,
      control: field.kind ?? field.type ?? null,
      hint: field.hint ?? null,
      // An 80-option select is a fact about the control, not eighty facts. The
      // count is the interesting part and the first few make it concrete.
      options: options.slice(0, OPTIONS_SHOWN).map((o) => o.label ?? o.value),
      optionCount: options.length
    })
  }

  for (const row of model.summaryRows ?? []) {
    rows.push({ kind: 'summary-row', text: `${row.key} — ${row.value}` })
  }
  for (const item of model.taskItems ?? []) {
    rows.push({
      kind: 'task',
      text: item.title ?? item.text ?? '',
      status: item.status ?? null
    })
  }
  for (const banner of model.notificationBanners ?? []) {
    rows.push({ kind: 'banner', text: banner.text ?? banner })
  }
  // warningText is an array on some captures and a string on others, and it is
  // routinely empty. An empty row on the plate reads as "there is a warning
  // here and we could not read it", which is a different claim.
  for (const warning of [model.warningText].flat().filter(Boolean)) {
    rows.push({ kind: 'warning', text: warning.text ?? warning })
  }

  return {
    title: model.h1 ?? model.title ?? null,
    url: model.url ?? null,
    rows: rows.filter((row) => String(row.text ?? '').trim().length > 0)
  }
}

/**
 * Resolve the best available image for one side of one screen.
 *
 * @param {object} args
 * @param {object} args.side - A side from the corpus profile
 * @param {string|null} args.screen
 * @param {object} [args.frame] - A curated visual frame, when one exists
 * @param {string} [args.why] - Why this screen was chosen, carried through
 * @returns {object}
 */
export const resolveSideAsset = ({ side, screen, frame, why }) => {
  if (!screen) {
    return {
      state: 'absent',
      side: side.id,
      screen: null,
      why: why ?? 'no screen on this side',
      command: null
    }
  }

  const anchorKey = frame?.anchors?.[side.id]?.key
  const crop = anchorKey
    ? fileIfPresent(
        join(side.captureDir, 'crop', `${screen}__${anchorKey}.png`)
      )
    : null
  if (crop) {
    return { state: 'crop', side: side.id, screen, why, anchorKey, ...crop }
  }

  const page = side.screensDir
    ? fileIfPresent(join(side.screensDir, `${screen}.png`))
    : null
  if (page) {
    return { state: 'page', side: side.id, screen, why, ...page }
  }

  const modelPath = join(side.modelDir, `${screen}.json`)
  if (existsSync(modelPath)) {
    return {
      state: 'model',
      side: side.id,
      screen,
      why,
      path: modelPath,
      plate: modelPlate(readJsonFile(modelPath))
    }
  }

  return {
    state: 'absent',
    side: side.id,
    screen,
    why: why ?? 'nothing captured for this screen',
    command: side.captureCommand ?? null
  }
}

/**
 * Resolve every side of one screen row.
 *
 * @param {object} args
 * @param {object[]} args.sides
 * @param {Record<string, {screen: string|null, why: string}>} args.row
 * @param {object} [args.frame]
 * @returns {Record<string, object>}
 */
export const resolveRow = ({ sides, row, frame }) =>
  Object.fromEntries(
    sides.map((side) => [
      side.id,
      resolveSideAsset({
        side,
        screen: row[side.id]?.screen ?? null,
        why: row[side.id]?.why,
        frame
      })
    ])
  )

/**
 * Coverage per side across the screens the findings actually cite. Reported on
 * stdout and in the footer, because a gap stated is information and a gap
 * hidden is a claim the evidence is complete.
 *
 * @param {object[]} items - Report items carrying resolved assets
 * @param {object[]} sides
 * @returns {Array<{side: string, have: number, want: number}>}
 */
export const imageCoverage = (items, sides) =>
  sides.map((side) => {
    const screens = new Map()
    for (const item of items) {
      for (const row of item.assets ?? []) {
        const asset = row[side.id]
        if (!asset?.screen) continue
        const best = screens.get(asset.screen)
        if (
          !best ||
          ASSET_STATES.indexOf(asset.state) < ASSET_STATES.indexOf(best)
        ) {
          screens.set(asset.screen, asset.state)
        }
      }
    }
    return {
      side: side.id,
      want: screens.size,
      have: [...screens.values()].filter(
        (state) => state === 'crop' || state === 'page'
      ).length,
      byState: [...screens.values()].reduce((acc, state) => {
        acc[state] = (acc[state] ?? 0) + 1
        return acc
      }, {})
    }
  })
