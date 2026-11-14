import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { hasVerdict } from './verdict.js'

const folders = []

const reviewFileHolding = (text) => {
  const folder = mkdtempSync(join(tmpdir(), 'tim-verdict-'))
  folders.push(folder)
  const path = join(folder, 'a.js.review.json')
  if (text !== undefined) writeFileSync(path, text)
  return path
}

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true }))
})

describe('#hasVerdict', () => {
  test('Should find the verdict a reviewer set', () => {
    expect(hasVerdict(reviewFileHolding('{"verdict":"SAFE"}'))).toBe(true)
  })

  test.each([
    ['a missing file', undefined],
    ['a file that is not JSON', '{'],
    ['a null verdict', '{"verdict":null}'],
    ['a false verdict', '{"verdict":false}'],
    ['the word null', '{"verdict":"null"}'],
    ['no verdict key', '{}']
  ])('Should find no verdict in %s', (_, text) => {
    expect(hasVerdict(reviewFileHolding(text))).toBe(false)
  })
})
