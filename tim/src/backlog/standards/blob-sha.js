import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/**
 * Git's blob object hash: `sha1("blob " + byteLength + "\0" + bytes)`,
 * byte-identical to `git hash-object`. Computed on the bytes at resolve
 * time — this is audit only (DESIGN 8.5): nothing compares it or refuses
 * on it.
 *
 * @param {Buffer} buffer
 * @returns {string} 40-hex sha1
 */
export const gitBlobSha = (buffer) =>
  createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${buffer.length}\0`), buffer]))
    .digest('hex')

/**
 * `gitBlobSha` for a file on disk.
 *
 * @param {string} absPath
 * @returns {string|null} the blob sha, or `null` when the file does not
 *   exist or is not a readable regular file (e.g. a directory)
 */
export const fileBlobSha = (absPath) => {
  try {
    return gitBlobSha(readFileSync(absPath))
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return null
    throw error
  }
}
