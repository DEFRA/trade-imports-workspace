import { describe, expect, test } from 'vitest'
import { echoedLines, isEchoOptionsOnly } from './echo.js'

describe('#isEchoOptionsOnly', () => {
  test('Should read a run of n, e and E after one dash as options', () => {
    expect(['-n', '-e', '-E', '-neE'].map(isEchoOptionsOnly)).toEqual([
      true,
      true,
      true,
      true
    ])
  })

  test('Should not read a lone dash, other letters or text as options', () => {
    expect(['-', '-x', '-n text', 'n', ''].map(isEchoOptionsOnly)).toEqual([
      false,
      false,
      false,
      false,
      false
    ])
  })
})

describe('#echoedLines', () => {
  test('Should give the text as its one line', () => {
    expect(echoedLines('-n text')).toEqual(['-n text'])
  })

  test('Should give no line for options holding n', () => {
    expect([echoedLines('-n'), echoedLines('-En')]).toEqual([[], []])
  })

  test('Should give one empty line for options without n', () => {
    expect([echoedLines('-e'), echoedLines('-eE')]).toEqual([[''], ['']])
  })
})
