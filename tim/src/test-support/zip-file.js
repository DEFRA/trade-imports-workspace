import { crc32, deflateRawSync } from 'node:zlib'

const LOCAL_FILE_HEADER = 0x04034b50
const CENTRAL_FILE_HEADER = 0x02014b50
const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const DEFLATED = 8
const ZIP_VERSION = 20

const localHeaderOf = ({ name, data, compressed, checksum }) => {
  const header = Buffer.alloc(30)
  header.writeUInt32LE(LOCAL_FILE_HEADER, 0)
  header.writeUInt16LE(ZIP_VERSION, 4)
  header.writeUInt16LE(DEFLATED, 8)
  header.writeUInt32LE(checksum, 14)
  header.writeUInt32LE(compressed.length, 18)
  header.writeUInt32LE(data.length, 22)
  header.writeUInt16LE(Buffer.byteLength(name), 26)
  return Buffer.concat([header, Buffer.from(name), compressed])
}

const centralHeaderOf = ({ name, data, compressed, checksum }, offset) => {
  const header = Buffer.alloc(46)
  header.writeUInt32LE(CENTRAL_FILE_HEADER, 0)
  header.writeUInt16LE(ZIP_VERSION, 4)
  header.writeUInt16LE(ZIP_VERSION, 6)
  header.writeUInt16LE(DEFLATED, 10)
  header.writeUInt32LE(checksum, 16)
  header.writeUInt32LE(compressed.length, 20)
  header.writeUInt32LE(data.length, 24)
  header.writeUInt16LE(Buffer.byteLength(name), 28)
  header.writeUInt32LE(offset, 42)
  return Buffer.concat([header, Buffer.from(name)])
}

/**
 * A zip archive holding the given files, deflated, for tests that read zips
 * the way a Playwright trace is read.
 *
 * @param {Record<string, string>} files - File name to text content
 * @returns {Buffer}
 */
export const makeZip = (files) => {
  const entries = Object.entries(files).map(([name, text]) => {
    const data = Buffer.from(text)
    return {
      name,
      data,
      compressed: deflateRawSync(data),
      checksum: crc32(data)
    }
  })
  const locals = entries.map(localHeaderOf)
  const offsets = locals.map((_, index) =>
    locals.slice(0, index).reduce((total, local) => total + local.length, 0)
  )
  const central = Buffer.concat(
    entries.map((entry, index) => centralHeaderOf(entry, offsets[index]))
  )
  const localBytes = Buffer.concat(locals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(central.length, 12)
  end.writeUInt32LE(localBytes.length, 16)
  return Buffer.concat([localBytes, central, end])
}
