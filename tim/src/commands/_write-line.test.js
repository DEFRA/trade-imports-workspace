import { describe, test, expect } from 'vitest'
import { Writable } from 'node:stream'
import { writeLine } from './_write-line.js'

const slowSink = () => {
  const sink = { written: '', finished: false }
  sink.stream = new Writable({
    write: (chunk, _encoding, done) => {
      setTimeout(() => {
        sink.written += chunk.toString()
        sink.finished = true
        done()
      }, 20)
    }
  })
  return sink
}

describe('#writeLine', () => {
  test('resolves only after the stream has taken the whole line and its newline', async () => {
    const sink = slowSink()

    await writeLine(sink.stream, 'x'.repeat(100_000))

    expect(sink.finished).toBe(true)
    expect(sink.written).toBe(`${'x'.repeat(100_000)}\n`)
  })

  test('rejects with the stream error when the write fails', async () => {
    const failing = new Writable({
      write: (_chunk, _encoding, done) => done(new Error('pipe closed'))
    })
    failing.on('error', () => {})

    await expect(writeLine(failing, 'line')).rejects.toThrow('pipe closed')
  })
})
