import { readFileSync } from 'node:fs'
import { captureScreen, loadAnchors, writeManifest } from './screens.js'

/**
 * Playwright's own `test` and `expect`, re-exported.
 *
 * A spec lives in the corpus workarea, outside any package, so `import
 * '@playwright/test'` resolves to nothing there — and the fix is not a
 * node_modules symlink in the workarea, which is what the retired harness did
 * and what went stale. A spec imports one module, this one, by the absolute
 * path tim puts in the capture context, and gets everything through it.
 *
 * Re-exporting rather than re-implementing matters: both sides resolve to the
 * single @playwright/test installed in tim, so the `test` a spec registers on
 * is the one the runner is driving.
 */
export { test, expect } from '@playwright/test'

/**
 * What a capture spec calls to record a screen.
 *
 * A spec is hand-written navigation — plain Playwright, authored by whoever
 * read the application's views and routes. Everything below it is the part
 * whose whole job is to be identical across two runs: motion off, caret
 * hidden, device scale pinned, the page model read in the same visit as the
 * picture, content hashes, and the manifest as the only index.
 *
 * A spec never learns a path. It is handed one file of resolved paths, because
 * a guess files this comparison's evidence under a different comparison.
 *
 * @param {string} [path] - Context file, from TIM_CAPTURE_CONTEXT by default
 * @returns {object} The resolved capture context, with anchors loaded
 * @throws {Error} When the spec was run outside `tim parity capture`
 */
export const captureContext = (path = process.env.TIM_CAPTURE_CONTEXT) => {
  if (!path) {
    throw new Error(
      'TIM_CAPTURE_CONTEXT is not set. Run this through "tim parity capture <runId> --side <id>" rather than through Playwright directly.'
    )
  }
  const context = JSON.parse(readFileSync(path, 'utf8'))
  return { ...context, anchors: loadAnchors(context.anchorsPath) }
}

/**
 * A recorder for one spec file.
 *
 * The screen id is built from the corpus's prefix and the name the spec gives,
 * so a spec says what a screen is and the corpus says which comparison it
 * belongs to. A spec that spelt the prefix itself would drift the moment a
 * second corpus reused the spec.
 *
 * `write` folds this spec's rows into whatever the other specs left, so specs
 * stay independent: running one again re-records its own screens and touches
 * nobody else's.
 *
 * @param {object} [context] - From {@link captureContext}
 * @returns {{record: Function, rows: object[], write: Function, context: object}}
 */
export const recorder = (context = captureContext()) => {
  const rows = []
  return {
    context,
    rows,

    /**
     * Record one screen: full-page shot, an element crop per anchor, and the
     * page model, all from the same render.
     *
     * @param {import('@playwright/test').Page} page
     * @param {string} name - Screen name without the corpus prefix
     * @returns {Promise<object>} The manifest row
     */
    record: async (page, name) => {
      const row = await captureScreen(
        page,
        `${context.screenPrefix ?? ''}${name}`,
        context
      )
      rows.push(row)
      return row
    },

    /**
     * Write what this spec recorded into the manifest.
     *
     * @returns {string} Path written
     */
    write: () => writeManifest(rows, context)
  }
}
