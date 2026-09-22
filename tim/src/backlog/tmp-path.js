import { randomBytes } from 'node:crypto'
import { dirname, join, basename } from 'node:path'

/**
 * This process's pid plus a random hex tail — the collision-avoidance
 * suffix every unique-path builder in the write-safety core uses, so two
 * processes racing for the same target never land on the same name.
 *
 * @returns {string}
 */
export const uniqueSuffix = () =>
  `${process.pid}.${randomBytes(6).toString('hex')}`

/**
 * A sibling path for `path` that no other process is writing to: the
 * original name, prefixed with a dot and suffixed with {@link uniqueSuffix}
 * and `.tmp`.
 *
 * @param {string} path
 * @returns {string}
 */
export const uniqueTempPathFor = (path) =>
  join(dirname(path), `.${basename(path)}.${uniqueSuffix()}.tmp`)
