/**
 * Write one line to a stream and wait until the stream has taken it, so a
 * `process.exit` that follows cannot cut the line short on a pipe.
 *
 * @param {import('node:stream').Writable} stream
 * @param {string} text - the line, without its newline
 * @returns {Promise<void>} resolves once the write has been handed off
 */
export const writeLine = (stream, text) =>
  new Promise((resolve, reject) => {
    stream.write(`${text}\n`, (error) => (error ? reject(error) : resolve()))
  })
