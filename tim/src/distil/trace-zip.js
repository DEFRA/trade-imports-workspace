import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const CENTRAL_FILE_HEADER = 0x02014b50
const SMALLEST_END_RECORD = 22
const LONGEST_COMMENT = 0xffff
const CENTRAL_HEADER_SIZE = 46
const LOCAL_HEADER_SIZE = 30
const ZIP64_MARKER = 0xffffffff
const STORED = 0
const DEFLATED = 8

// The trace files a Playwright trace zip opens with, such as 0-trace.trace or
// trace.trace. Their first line records the Playwright that wrote them.
const CONTEXT_TRACE = /^(?:[0-9]+-)?trace\.trace$/
const SEMVER = /^([0-9]+)\.([0-9]+)\.([0-9]+)/

const endRecordOffsetOf = (buffer) => {
  const lowest = Math.max(
    0,
    buffer.length - SMALLEST_END_RECORD - LONGEST_COMMENT
  )
  for (
    let offset = buffer.length - SMALLEST_END_RECORD;
    offset >= lowest;
    offset--
  ) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset
  }
  return -1
}

const centralEntryAt = (buffer, offset) => {
  const nameLength = buffer.readUInt16LE(offset + 28)
  const extraLength = buffer.readUInt16LE(offset + 30)
  const commentLength = buffer.readUInt16LE(offset + 32)
  const nameStart = offset + CENTRAL_HEADER_SIZE
  return {
    entry: {
      name: buffer.toString('utf8', nameStart, nameStart + nameLength),
      method: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      localOffset: buffer.readUInt32LE(offset + 42)
    },
    next: nameStart + nameLength + extraLength + commentLength
  }
}

/**
 * Every entry a zip's central directory lists, with where its data starts.
 * A zip64 archive or a damaged one gives null: the callers treat its
 * contents as unknown rather than fail.
 *
 * @param {Buffer} buffer - The whole zip
 * @returns {{name: string, method: number, compressedSize: number, localOffset: number}[]|null}
 */
export const zipEntriesOf = (buffer) => {
  const endRecord = endRecordOffsetOf(buffer)
  if (endRecord === -1) return null
  const count = buffer.readUInt16LE(endRecord + 10)
  const entries = []
  let offset = buffer.readUInt32LE(endRecord + 16)
  for (let index = 0; index < count; index++) {
    if (offset + CENTRAL_HEADER_SIZE > buffer.length) return null
    if (buffer.readUInt32LE(offset) !== CENTRAL_FILE_HEADER) return null
    const { entry, next } = centralEntryAt(buffer, offset)
    if (entry.compressedSize === ZIP64_MARKER) return null
    entries.push(entry)
    offset = next
  }
  return entries
}

/**
 * One entry's bytes, stored or deflated. Any other method gives null.
 *
 * @param {Buffer} buffer - The whole zip
 * @param {{method: number, compressedSize: number, localOffset: number}} entry - From `zipEntriesOf`
 * @returns {Buffer|null}
 */
export const zipEntryData = (buffer, entry) => {
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26)
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28)
  const start = entry.localOffset + LOCAL_HEADER_SIZE + nameLength + extraLength
  const data = buffer.subarray(start, start + entry.compressedSize)
  if (entry.method === STORED) return data
  if (entry.method === DEFLATED) return inflateRawSync(data)
  return null
}

const firstLineOf = (data) => data.toString('utf8').split('\n', 1)[0]

const versionInFirstEvent = (line) => {
  try {
    const version = JSON.parse(line)?.playwrightVersion
    return typeof version === 'string' && SEMVER.test(version) ? version : null
  } catch {
    return null
  }
}

/**
 * The Playwright version that recorded a trace zip, from the first event of
 * its context trace (`{"type":"context-options", "playwrightVersion": ...}`).
 * Null when the file cannot be read or records no version, so the caller
 * falls back to its own Playwright rather than refusing.
 *
 * @param {string} zipPath
 * @returns {string|null} Such as `1.63.0`
 */
export const recordedPlaywrightVersionOf = (zipPath) => {
  try {
    const buffer = readFileSync(zipPath)
    const entries = zipEntriesOf(buffer) ?? []
    const contextTrace = entries
      .filter((entry) => CONTEXT_TRACE.test(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name))[0]
    const data = contextTrace ? zipEntryData(buffer, contextTrace) : null
    return data ? versionInFirstEvent(firstLineOf(data)) : null
  } catch {
    return null
  }
}

const partsOf = (version) => SEMVER.exec(version).slice(1, 4).map(Number)

/**
 * Compare two Playwright versions, major, then minor, then patch.
 *
 * @param {string} left - Such as `1.62.1`
 * @param {string} right
 * @returns {number} Below 0 when left is older, 0 when equal, above 0 when newer
 */
export const compareVersions = (left, right) => {
  const leftParts = partsOf(left)
  const rightParts = partsOf(right)
  const differing = leftParts.findIndex(
    (part, index) => part !== rightParts[index]
  )
  return differing === -1 ? 0 : leftParts[differing] - rightParts[differing]
}
