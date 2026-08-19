import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { capturePageModel } from './page-model.js'

/**
 * Ancestors worth cropping to, nearest first.
 *
 * A crop of the bare input is not evidence — the label, the hint and the error
 * are the finding. Walking up to the form group gets all of it, and the wider
 * containers catch a control that sits outside one.
 */
export const CROP_ANCESTORS = [
  '.govuk-form-group',
  'fieldset',
  '.govuk-radios',
  '.govuk-checkboxes',
  '.govuk-summary-list__row',
  '.govuk-task-list__item',
  '.govuk-details',
  '.govuk-inset-text',
  '.govuk-notification-banner',
  '.govuk-error-summary'
]

export const CROP_PADDING = 24

/** A crop smaller than this in either direction shows nothing worth showing. */
export const MIN_CROP = 8

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
 * Resolve one anchor descriptor to a locator, or refuse.
 *
 * A raw CSS string re-run against markup that has moved matches the wrong node
 * silently. A typed descriptor either resolves or says why it did not, and the
 * report renders that as an evidence-broken card, which is information.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{kind: string, name?: string, text?: string}} anchor
 * @returns {object|null} A Playwright locator, or null for an unknown kind
 */
export const resolveAnchor = (page, anchor) => {
  if (anchor.kind === 'field') {
    return page.locator(
      `[name="${anchor.name}"], [name^="${anchor.name}-"], [name^="${anchor.name}["]`
    )
  }
  if (anchor.kind === 'label') {
    return page.getByLabel(anchor.text, { exact: false })
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
  const locator = resolveAnchor(page, anchor)
  if (!locator) {
    return { anchor: anchor.key, why: `Unknown anchor kind "${anchor.kind}".` }
  }
  const count = await locator.count()
  if (count === 0) {
    return { anchor: anchor.key, why: 'No element matched this anchor.' }
  }

  const measured = await locator.first().evaluate((element, ancestors) => {
    const container =
      ancestors.map((selector) => element.closest(selector)).find(Boolean) ??
      element
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
  }, CROP_ANCESTORS)

  const box = clampCropBox({ ...measured, padding: CROP_PADDING })
  if (!isUsableBox(box)) {
    return {
      anchor: anchor.key,
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
 * Capture one screen, full page, at the settings the report needs.
 *
 * Motion is stopped and the caret is hidden, so two runs against the same
 * commit produce the same bytes. That is what makes a changed hash mean the
 * application changed rather than the clock ticking.
 *
 * The page model is read in the same visit as the screenshot, so the picture
 * and the model are of the same render.
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
    url: new URL(page.url()).pathname,
    title: await page.title(),
    deviceScaleFactor: context.deviceScaleFactor,
    crops: await captureAnchors(
      page,
      screen,
      context.anchors?.[screen] ?? [],
      context
    ),
    model: await capturePageModel(page, screen, context.modelDir)
  }
}

/**
 * Fold this run's rows into whatever an earlier run left behind.
 *
 * A run that captured a subset must not erase what an earlier run captured —
 * the report reads the manifest and nothing else, so a dropped row is a stated
 * gap in a report that had the picture all along.
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
