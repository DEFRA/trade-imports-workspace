import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { TimError } from '../../errors.js'
import { pngSize } from '../manifest.js'

/**
 * Where cwebp is. Playwright emits PNG and JPEG only, and a PNG screenshot of
 * a form group is several times the size of the same picture as WebP — which
 * is the difference between an artifact that fits in one page and one that
 * does not.
 *
 * @returns {string}
 */
export const cwebpPath = () => {
  for (const candidate of ['/opt/homebrew/bin/cwebp', '/usr/local/bin/cwebp']) {
    if (existsSync(candidate)) return candidate
  }
  try {
    return execFileSync('which', ['cwebp'], { encoding: 'utf8' }).trim()
  } catch {
    throw new TimError(
      'NOT_FOUND',
      'The artifact target re-encodes crops to WebP and cwebp is not installed. `brew install webp`, or build the local target instead.'
    )
  }
}

/**
 * One PNG as a WebP data URI.
 *
 * @param {object} args
 * @param {string} args.path
 * @param {number} [args.quality]
 * @param {string} [args.bin]
 * @returns {{uri: string, bytes: number}}
 */
export const webpDataUri = ({ path, quality = 82, bin }) => {
  const out = join(
    tmpdir(),
    `parity-${process.pid}-${path.replace(/[^a-z0-9]/gi, '-').slice(-60)}.webp`
  )
  try {
    execFileSync(bin ?? cwebpPath(), [
      '-quiet',
      '-q',
      String(quality),
      path,
      '-o',
      out
    ])
    const bytes = readFileSync(out)
    return {
      uri: `data:image/webp;base64,${bytes.toString('base64')}`,
      bytes: bytes.length
    }
  } finally {
    if (existsSync(out)) rmSync(out)
  }
}

/**
 * Turn the resolved assets into something a single self-contained page can
 * carry.
 *
 * Element crops are inlined, because they are the evidence a reader actually
 * looks at and they are small. Full-page shots are not: 70 prototype PNGs are
 * 16 MB at 1x, and the only way to fit them would be to downsize, which would
 * mean shipping a picture nobody can read. So a page shot becomes a stated
 * local reference — the page says the picture exists and where, rather than
 * presenting a truncated evidence set as if it were complete.
 *
 * @param {object} args
 * @param {object[]} args.items
 * @param {object[]} args.sides
 * @param {number} [args.quality]
 * @returns {object} What was inlined and what was left behind
 */
export const inlineAssets = ({ items, sides, quality }) => {
  const bin = cwebpPath()
  // One copy per file, not per use. The same crop lands on several cards — a
  // landmark is often both a difference in its own right and the insertion
  // point another finding's absence is measured from — and a fresh copy at
  // each use took the page to 18 MB, over the ceiling, with not one extra
  // pixel of evidence in it.
  //
  // Each picture is declared once as a CSS custom property and every card
  // points at it. That is what lets every crop stay at full quality: the
  // alternative was to degrade them all to fit a channel, which the brief
  // rules out.
  const sprites = new Map()
  let uses = 0
  let bytes = 0
  let linked = 0

  for (const item of items) {
    for (const row of item.assets ?? []) {
      for (const side of sides) {
        const asset = row[side.id]
        if (!asset?.path) continue
        if (asset.state === 'crop') {
          if (!sprites.has(asset.path)) {
            const encoded = webpDataUri({ path: asset.path, quality, bin })
            sprites.set(asset.path, {
              id: `crop-${sprites.size}`,
              uri: encoded.uri,
              bytes: encoded.bytes,
              size: pngSize(readFileSync(asset.path))
            })
            bytes += encoded.bytes
          }
          const sprite = sprites.get(asset.path)
          asset.spriteId = sprite.id
          asset.aspect = sprite.size
            ? `${sprite.size.width} / ${sprite.size.height}`
            : null
          asset.href = null
          asset.inlined = true
          uses += 1
          continue
        }
        if (asset.state === 'page') {
          asset.state = 'page-link'
          asset.href = `file://${asset.path}`
          linked += 1
        }
      }
    }
  }

  return {
    inlined: sprites.size,
    uses,
    linked,
    bytes,
    sprites: [...sprites.values()].map(({ id, uri }) => ({ id, uri }))
  }
}

/**
 * The declaration block every inlined crop points at.
 *
 * @param {object[]} sprites
 * @returns {string}
 */
export const spriteStyles = (sprites) =>
  sprites?.length
    ? `<style>:root{${sprites.map((sprite) => `--${sprite.id}:url("${sprite.uri}")`).join(';')}}</style>`
    : ''
