import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { writeJsonAtomic } from './io.js'
import { TimError } from '../errors.js'

/**
 * Read a PNG's dimensions from its IHDR chunk.
 *
 * Recorded because a picture's size is part of what a ruling was made against:
 * a 2x re-capture of the same page doubles both numbers, and a page that grew
 * a section changes the height alone.
 *
 * @param {Buffer} bytes
 * @returns {{width: number, height: number}|null}
 */
export const pngSize = (bytes) => {
  const isPng =
    bytes.length > 24 &&
    bytes.readUInt32BE(0) === 0x89504e47 &&
    bytes.toString('ascii', 12, 16) === 'IHDR'
  if (!isPng) return null
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/**
 * Element crops, indexed by the screen they were taken from.
 *
 * The file name carries both facts — `<screen>__<anchor>.png` — because the
 * harness that writes them has no manifest of its own. An anchor with a double
 * underscore in it would split wrong, so the screen is taken from the first
 * separator only.
 *
 * @param {string} dir - The crop directory beside the page shots
 * @returns {Record<string, object[]>}
 */
export const cropsByScreen = (dir) => {
  if (!existsSync(dir)) return {}
  const out = {}
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith('.png'))
    .sort()) {
    const at = name.indexOf('__')
    if (at < 1) continue
    const screen = name.slice(0, at)
    const anchor = name.slice(at + 2).replace(/\.png$/, '')
    const bytes = readFileSync(join(dir, name))
    out[screen] = [
      ...(out[screen] ?? []),
      {
        anchor,
        file: `crop/${name}`,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        size: pngSize(bytes)
      }
    ]
  }
  return out
}

/**
 * Build a manifest for a directory of captured screens.
 *
 * The capture harness on one side writes its own manifest as it goes; the
 * harness on the other side predates the idea and writes only pixels. Rather
 * than let the report glob a directory — which is how a frame present in the
 * backlog and absent on disk becomes a broken image instead of a stated gap —
 * the manifest is built once, here, and the report reads only that.
 *
 * @param {object} args
 * @param {object} args.profile
 * @param {string} args.side
 * @param {string} args.sha - The commit the application was at
 * @param {number} [args.deviceScaleFactor]
 * @param {boolean} [args.write]
 * @returns {object}
 */
export const runManifest = ({
  profile,
  side,
  sha,
  deviceScaleFactor,
  write
}) => {
  const sideProfile = profile.sideById[side]
  if (!sideProfile) {
    throw new TimError(
      'NOT_FOUND',
      `Unknown side "${side}". This corpus has: ${profile.sideIds.join(', ')}.`
    )
  }
  const dir = sideProfile.screensDir
  if (!dir || !existsSync(dir)) {
    throw new TimError(
      'NOT_FOUND',
      `No captured screens at ${dir}. Run the capture first: ${sideProfile.captureCommand ?? '(no command recorded for this side)'}`
    )
  }

  const crops = cropsByScreen(join(dir, '..', 'crop'))

  const rows = readdirSync(dir)
    .filter((name) => name.endsWith('.png'))
    .sort()
    .map((name) => {
      const bytes = readFileSync(join(dir, name))
      const screen = name.replace(/\.png$/, '')
      return {
        screen,
        file: `page/${name}`,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        size: pngSize(bytes),
        capturedAt: statSync(join(dir, name)).mtime.toISOString(),
        crops: crops[screen] ?? []
      }
    })

  const manifest = {
    side,
    appSha: sha,
    capturedOn: new Date().toISOString(),
    deviceScaleFactor:
      deviceScaleFactor ?? profile.captures?.[side]?.deviceScaleFactor ?? 1,
    builtBy:
      'tim parity manifest — scanned the capture directory once, so the report never has to',
    rows
  }

  if (write) writeJsonAtomic(sideProfile.manifest, manifest)
  return {
    side,
    screens: rows.length,
    crops: rows.reduce((n, row) => n + row.crops.length, 0),
    path: sideProfile.manifest,
    written: Boolean(write)
  }
}
