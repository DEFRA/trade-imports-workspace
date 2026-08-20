import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { capturePageModel, maskVolatile, VOLATILE_RULES } from './page-model.js'
import {
  ANCHOR_KINDS,
  CROP_ANCESTORS,
  RESOLUTION_ORDER,
  excludingHidden,
  selectorFor,
  textPattern
} from '../resolution.js'

export { CROP_ANCESTORS }

export const CROP_PADDING = 24

/** A crop smaller than this in either direction shows nothing worth showing. */
export const MIN_CROP = 8

/**
 * A crop narrower or shorter than this frames the element and nothing else.
 *
 * A status tag on its own is 60 pixels of coloured box; cropped that tight it
 * could be anywhere on any page. Where the nearest crop ancestor is still that
 * small, the crop grows outwards until it shows enough of its surroundings to
 * place it.
 */
export const MIN_CONTEXT_WIDTH = 240
export const MIN_CONTEXT_HEIGHT = 20

/** Containers a crop must never grow into — beyond these it is the page. */
export const CROP_LIMITS = [
  'main',
  'form',
  'body',
  'html',
  '.govuk-width-container',
  '.govuk-grid-row',
  '.govuk-main-wrapper',
  '[class*="govuk-grid-column"]'
]

/**
 * How much taller than the element a crop may grow before it stops being
 * context and starts being the page.
 *
 * The named limits above catch the containers govuk-frontend gives a class to.
 * This catches the ones it does not: a bare `<div>` holding the whole column
 * passes every selector test and is still a whole-page shot. A crop six times
 * the height of a button is generous, and 320 pixels keeps a small element
 * from being framed too tightly to place.
 */
export const CROP_GROWTH_RATIO = 6
export const CROP_GROWTH_FLOOR = 320

/**
 * Turn a viewport-relative bounding box into a padded clip in document
 * coordinates, clamped to the document.
 *
 * The clip is applied to a full-page screenshot rather than to the viewport,
 * so the scroll offset has to be added back and the result kept inside the
 * page — a clip that runs off the bottom produces a black band, which reads as
 * a rendering fault in the application rather than as an arithmetic slip here.
 *
 * @param {object} args
 * @param {{left: number, top: number, width: number, height: number}} args.rect
 * @param {{x: number, y: number}} args.scroll
 * @param {{width: number, height: number}} args.page - Full document size
 * @param {number} [args.padding]
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export const clampCropBox = ({
  rect,
  scroll,
  page,
  padding = CROP_PADDING
}) => {
  const x = Math.max(0, rect.left + scroll.x - padding)
  const y = Math.max(0, rect.top + scroll.y - padding)
  return {
    x,
    y,
    width: Math.max(0, Math.min(rect.width + padding * 2, page.width - x)),
    height: Math.max(0, Math.min(rect.height + padding * 2, page.height - y))
  }
}

/**
 * Whether a clip is big enough to be worth shooting.
 *
 * @param {{width: number, height: number}} box
 * @returns {boolean}
 */
export const isUsableBox = (box) =>
  box.width >= MIN_CROP && box.height >= MIN_CROP

/**
 * The file one element crop lands in.
 *
 * Both facts live in the name — `<screen>__<anchor>.png` — because that is what
 * `tim parity manifest` reads back when it indexes a directory of crops.
 *
 * @param {string} screen
 * @param {string} anchor
 * @returns {string}
 */
export const cropFileName = (screen, anchor) => `${screen}__${anchor}.png`

const hashOf = (path) => {
  const bytes = readFileSync(path)
  return {
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')
  }
}

/**
 * Replace every value that changes run to run, in the live page, before the
 * picture is taken.
 *
 * The model and the rendered DOM have been masked since they were introduced,
 * so a generated reference number does not churn their hashes. The pixels were
 * not, and the reference is printed in the Draft tag on nearly every page of
 * the frontend — so two captures of an application nobody had touched produced
 * different bytes for almost every screen, and the drift panel reported all of
 * them. A panel that fires on every capture teaches its reader to skip it,
 * which costs more than having no panel at all.
 *
 * Masking the page instead of forgiving the difference afterwards is what keeps
 * the pixel comparison worth making: after this, two shots of the same page
 * differ only when the page's own rendering differs, so a CSS regression or a
 * swapped component still moves the hash.
 *
 * The picture then shows `GBN-XX-00-REFERENCE` where the application printed a
 * reference. That is the same stand-in the model and the DOM already carry, and
 * it reads as a stand-in rather than as a value — which is the point. Nobody
 * should compare a generated reference against a prototype's fixed one and
 * write it up as a difference.
 *
 * This runs in the browser. It has no imports and no closure over anything in
 * this file, because Playwright serialises it and evaluates it in the page.
 *
 * @param {Array<{source: string, flags: string, replacement: string}>} rules
 * @returns {{substitutions: number, values: string[]}} The values it stood in for
 */
export const MASK_VOLATILE_IN_PAGE = (rules) => {
  const patterns = rules.map((rule) => ({
    match: new RegExp(rule.source, rule.flags),
    replacement: rule.replacement
  }))
  // Attributes a person reads off the page, so the pixels depend on them.
  const attributes = ['value', 'placeholder', 'alt', 'title']
  const TEXT_NODE = 3
  const ELEMENT_NODE = 1
  const found = []

  const standardise = (value) => {
    let out = value
    for (const { match, replacement } of patterns) {
      const hits = out.match(match)
      if (!hits) continue
      found.push(...hits)
      out = out.replace(match, replacement)
    }
    return out
  }

  let substitutions = 0

  const maskAttributes = (element) => {
    for (const name of attributes) {
      const was = element.getAttribute(name)
      if (was === null) continue
      const now = standardise(was)
      if (now === was) continue
      element.setAttribute(name, now)
      substitutions += 1
    }
    // A value the page's own script typed into a field is a property, not an
    // attribute, and it is the one on the screen.
    if (typeof element.value === 'string') {
      const now = standardise(element.value)
      if (now !== element.value) {
        element.value = now
        substitutions += 1
      }
    }
  }

  const visit = (node) => {
    if (node.nodeType === TEXT_NODE) {
      const now = standardise(node.nodeValue)
      if (now !== node.nodeValue) {
        node.nodeValue = now
        substitutions += 1
      }
      return
    }
    if (node.nodeType !== ELEMENT_NODE) return
    maskAttributes(node)
    for (const child of [...node.childNodes]) visit(child)
  }

  visit(document.documentElement)
  return { substitutions, values: [...new Set(found)].sort() }
}

/**
 * Mask the live page, and fingerprint what was masked.
 *
 * The fingerprint is a hash of the values that were standardised, not of the
 * page. It is what lets a later render tell "this page shows a different
 * generated reference" from "this page renders differently", and a page that
 * carries no volatile values fingerprints the same on every run — so on those
 * pages a pixel change is never explained away.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{substitutions: number, sha256: string}>}
 */
export const maskVolatileOnPage = async (page) => {
  const { substitutions, values } = await page.evaluate(
    MASK_VOLATILE_IN_PAGE,
    VOLATILE_RULES
  )
  return {
    substitutions,
    sha256: createHash('sha256').update(values.join('\n')).digest('hex')
  }
}

/**
 * The locators one rung of the ladder tries, in order.
 *
 * Two for the text rungs, because an exact match is a better answer than a
 * prefix and both are legitimate: a link reads "Change" and its full text is
 * "Change exit details", a task row's text carries its own hint. Exact first
 * means the tighter reading always wins where the page supports it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} role
 * @param {{name?: string, text?: string}} anchor
 * @returns {object[]} Playwright locators
 */
export const locatorsForRole = (page, role, anchor) => {
  const named = anchor.name ?? anchor.text ?? ''
  if (role === 'field') {
    return [
      page.locator(
        excludingHidden(
          `[name="${named}"], [name^="${named}-"], [name^="${named}["]`
        )
      )
    ]
  }
  if (role === 'label') return [page.getByLabel(named, { exact: false })]
  // The text engine keeps the smallest element that says the string, which is
  // what the last rung means by "an element whose own text is exactly this".
  if (role === 'text') {
    return [page.getByText(textPattern(named, { exact: true }))]
  }
  const selector = excludingHidden(selectorFor(role))
  return [
    page
      .locator(selector)
      .filter({ hasText: textPattern(named, { exact: true }) }),
    page.locator(selector).filter({ hasText: textPattern(named) })
  ]
}

/**
 * Which rungs to try for one anchor, most specific first.
 *
 * The rung `tim parity anchors` already settled against the captured DOM comes
 * first, so the two stages agree about what a name means. The rest of the
 * ladder follows it rather than being skipped: markup moves between a capture
 * and a recapture, and a crop found one rung down is worth more than none.
 *
 * A name attribute is a thing only a field anchor asks about, so a label
 * anchor never tries that rung — matching "Continue" against a name attribute
 * would be matching prose against an identifier.
 *
 * @param {{kind: string, role?: string}} anchor
 * @returns {string[]}
 */
export const rungsFor = (anchor) => {
  const ladder = RESOLUTION_ORDER.map((rung) => rung.role).filter(
    (role) => role !== 'field' || anchor.kind === 'field'
  )
  if (!anchor.role || !ladder.includes(anchor.role)) return ladder
  return [anchor.role, ...ladder.filter((role) => role !== anchor.role)]
}

/**
 * Resolve one anchor descriptor to a locator, or refuse.
 *
 * A raw CSS string re-run against markup that has moved matches the wrong node
 * silently. A typed descriptor either resolves or says why it did not, and the
 * report renders that as an evidence-broken card, which is information.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{kind: string, role?: string, name?: string, text?: string}} anchor
 * @returns {Promise<{locator: object, role: string, matched: number}|null>}
 */
export const resolveAnchor = async (page, anchor) => {
  if (!ANCHOR_KINDS.includes(anchor.kind)) return null
  for (const role of rungsFor(anchor)) {
    for (const locator of locatorsForRole(page, role, anchor)) {
      // A control the page holds but does not show — a collapsed filter panel,
      // a reveal that is shut — is in the DOM and has no box. Cropping it
      // produces a rectangle of blank page, which is worse than no crop
      // because it looks like a picture of something.
      const shown = locator.filter({ visible: true })
      const visible = await shown.count()
      if (visible > 0) return { locator: shown, role, matched: visible }
      const matched = await locator.count()
      if (matched > 0) return { locator, role, matched, hidden: true }
    }
  }
  return null
}

/**
 * Crop the region around one anchor.
 *
 * Clipped in document coordinates rather than shot with locator.screenshot, so
 * neighbours bleed in at the edges and the fragment reads as a place on a page
 * rather than as a floating control.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen
 * @param {object} anchor
 * @param {object} context - See {@link captureContext}
 * @returns {Promise<object>} The crop's manifest row, or a row saying why not
 */
export const captureAnchor = async (page, screen, anchor, context) => {
  const resolved = await resolveAnchor(page, anchor)
  if (resolved === null) {
    return {
      anchor: anchor.key,
      why: ANCHOR_KINDS.includes(anchor.kind)
        ? 'No element matched this anchor.'
        : `Unknown anchor kind "${anchor.kind}".`
    }
  }
  const { locator, role, matched: count, hidden } = resolved
  if (hidden) {
    return {
      anchor: anchor.key,
      role,
      matched: count,
      why: 'This page holds the control but does not show it in this state, so there is nothing to crop.'
    }
  }

  const measured = await locator.first().evaluate(
    (element, { ancestors, limits, minWidth, minHeight, ratio, floor }) => {
      const own = element.getBoundingClientRect()
      if (own.width === 0 || own.height === 0) return null
      const tallest = Math.max(own.height * ratio, floor)
      let container =
        ancestors.map((selector) => element.closest(selector)).find(Boolean) ??
        element
      // A crop tight to a status tag is a coloured box with no page around it,
      // so it grows outwards until it shows enough to place. It never climbs
      // into one of the page's own containers: a crop of the width container
      // is a whole-page shot with a control's name on it, which is the one
      // thing this stage exists to stop. Where the next step up would be a
      // limit, the small crop stands.
      while (true) {
        const box = container.getBoundingClientRect()
        if (box.width >= minWidth && box.height >= minHeight) break
        const parent = container.parentElement
        if (parent === null) break
        if (limits.some((selector) => parent.matches(selector))) break
        if (parent.getBoundingClientRect().height > tallest) break
        container = parent
      }
      const rect = container.getBoundingClientRect()
      return {
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        scroll: { x: window.scrollX, y: window.scrollY },
        page: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        }
      }
    },
    {
      ancestors: CROP_ANCESTORS,
      limits: CROP_LIMITS,
      minWidth: MIN_CONTEXT_WIDTH,
      minHeight: MIN_CONTEXT_HEIGHT,
      ratio: CROP_GROWTH_RATIO,
      floor: CROP_GROWTH_FLOOR
    }
  )

  const box =
    measured === null
      ? null
      : clampCropBox({ ...measured, padding: CROP_PADDING })
  if (box === null || !isUsableBox(box)) {
    return {
      anchor: anchor.key,
      role,
      matched: count,
      why: 'The resolved element has no visible box.'
    }
  }

  const dir = join(context.captureDir, 'crop')
  mkdirSync(dir, { recursive: true })
  const file = cropFileName(screen, anchor.key)
  await page.screenshot({
    path: join(dir, file),
    fullPage: true,
    clip: box,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device'
  })

  return {
    anchor: anchor.key,
    kind: anchor.kind,
    // The rung that answered. A crop of a heading under a finding about a
    // button is wrong in a way the picture alone will not show, so the rung is
    // recorded next to the file rather than inferred from it later.
    role,
    file: `crop/${file}`,
    ...hashOf(join(dir, file)),
    matched: count,
    why: anchor.why ?? null
  }
}

/**
 * Every anchor declared for one screen, shot.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen
 * @param {object[]} anchors
 * @param {object} context
 * @returns {Promise<object[]>}
 */
export const captureAnchors = async (page, screen, anchors, context) => {
  const out = []
  for (const anchor of anchors ?? []) {
    out.push(await captureAnchor(page, screen, anchor, context))
  }
  return out
}

/**
 * Write the rendered page for one screen.
 *
 * This file is the serialised live DOM, taken after the page's own scripts have
 * run — not the server's HTTP response. Markup a script injected is in it,
 * markup a script removed is not, and the response body is nowhere on disk.
 * That is deliberate: the comparison is between what two applications put in
 * front of a person, and that is the DOM. Do not read these files as evidence
 * of what a server sent.
 *
 * It earns its place beside the picture and the model because it is the only
 * lossless one. A model is a fixed vocabulary — headings, fields, summary rows,
 * task items, links — and a fixed vocabulary decides in advance what a page can
 * be said to have. Exact copy, button text, table contents, hint wording and
 * the order things appear in are settled here.
 *
 * Masked with the same rules as the model, so a generated reference number does
 * not change the hash on every run and turn a real change into noise.
 *
 * A side that names no htmlDir simply gets no rendered page, the way a side
 * with no anchors gets no crops.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen - Screen id, matching the corpus (for example fe-hub)
 * @param {string} [dir] - Where this side's rendered pages live
 * @returns {Promise<{file: string, bytes: number, sha256: string}|null>}
 */
export const captureRenderedHtml = async (page, screen, dir) => {
  if (!dir) return null
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${screen}.html`)
  writeFileSync(file, `${maskVolatile(await page.content())}\n`, 'utf8')
  return { file, ...hashOf(file) }
}

/**
 * Capture one screen, full page, at the settings the report needs.
 *
 * Motion is stopped and the caret is hidden, and every value that changes run
 * to run is standardised in the page first, so two runs against the same commit
 * produce the same bytes. That is what makes a changed hash mean the
 * application changed rather than the clock ticking.
 *
 * The masking happens once, before the picture, and the page model and the
 * rendered page are read in the same visit — so the picture, the crops, the
 * model and the DOM are all of one standardised render and agree with each
 * other about what the page said.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen - Screen id, matching the corpus (for example fe-hub)
 * @param {object} context - See {@link captureContext}
 * @returns {Promise<object>} The screen's manifest row
 */
export const captureScreen = async (page, screen, context) => {
  const dir = join(context.captureDir, 'page')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${screen}.png`)

  await page.evaluate(() => window.scrollTo(0, 0))
  const volatile = await maskVolatileOnPage(page)
  await page.screenshot({
    path,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device'
  })

  return {
    screen,
    file: `page/${screen}.png`,
    ...hashOf(path),
    // Masked like everything else on the row. The reference is in the path of
    // every notification page, so an unmasked url churns the manifest on every
    // run and buries the row that genuinely moved.
    url: maskVolatile(new URL(page.url()).pathname),
    title: await page.title(),
    deviceScaleFactor: context.deviceScaleFactor,
    volatile,
    crops: await captureAnchors(
      page,
      screen,
      context.anchors?.[screen] ?? [],
      context
    ),
    model: await capturePageModel(page, screen, context.modelDir),
    html: await captureRenderedHtml(page, screen, context.htmlDir)
  }
}

/**
 * Fold this run's rows into whatever an earlier run left behind.
 *
 * A run that captured a subset must not erase what an earlier run captured —
 * the report reads the manifest and nothing else, so a dropped row is a stated
 * gap in a report that had the picture all along.
 *
 * A row is folded in whole. A screen this run captured brings whatever keys
 * this run writes; a screen it did not keeps the row it had, keys and all.
 *
 * @param {object[]} existing
 * @param {object[]} rows
 * @returns {object[]} Sorted by screen id
 */
export const mergeManifestRows = (existing, rows) => {
  const byScreen = new Map((existing ?? []).map((row) => [row.screen, row]))
  for (const row of rows) byScreen.set(row.screen, row)
  return [...byScreen.values()].sort((a, b) => a.screen.localeCompare(b.screen))
}

/**
 * The manifest for one side of one comparison.
 *
 * @param {object} args
 * @param {object} args.context
 * @param {object[]} args.rows - This run's rows
 * @param {object[]} [args.existing] - Rows an earlier run left
 * @param {string} [args.capturedOn] - ISO timestamp
 * @returns {object}
 */
export const buildManifest = ({ context, rows, existing, capturedOn }) => ({
  side: context.side,
  appSha: context.appSha,
  harnessSha: context.harnessSha,
  capturedOn: capturedOn ?? new Date().toISOString(),
  viewport: context.viewport,
  deviceScaleFactor: context.deviceScaleFactor,
  builtBy: 'tim parity capture',
  rows: mergeManifestRows(existing, rows)
})

/**
 * Write the manifest.
 *
 * The manifest is the only index. The report never globs the filesystem and
 * never builds a path by convention, so a screen present in the backlog but
 * absent here renders as a stated gap rather than as a broken image.
 *
 * @param {object[]} rows
 * @param {object} context
 * @returns {string} Path written
 */
export const writeManifest = (rows, context) => {
  mkdirSync(context.captureDir, { recursive: true })
  const path = join(context.captureDir, 'manifest.json')
  const existing = existsSync(path)
    ? (JSON.parse(readFileSync(path, 'utf8')).rows ?? [])
    : []
  const manifest = buildManifest({ context, rows, existing })
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return path
}

/**
 * Load the anchors declared for one side, if any. `tim parity seed-anchors`
 * writes them; a side with none simply gets no crops.
 *
 * @param {string} path
 * @returns {Record<string, object[]>}
 */
export const loadAnchors = (path) => {
  if (!path || !existsSync(path)) return {}
  return JSON.parse(readFileSync(path, 'utf8')).screens ?? {}
}
