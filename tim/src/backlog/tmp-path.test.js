import { describe, test, expect } from 'vitest'
import { uniqueSuffix, uniqueTempPathFor } from './tmp-path.js'

describe('uniqueSuffix', () => {
  test('is this process’s pid followed by a random hex tail', () => {
    expect(uniqueSuffix()).toMatch(new RegExp(`^${process.pid}\\.[0-9a-f]{12}$`))
  })

  test('two calls never collide', () => {
    expect(uniqueSuffix()).not.toBe(uniqueSuffix())
  })
})

describe('uniqueTempPathFor', () => {
  test('sits alongside the target, dot-prefixed and .tmp-suffixed', () => {
    const tempPath = uniqueTempPathFor('/a/b/target.json')

    expect(tempPath).toMatch(/^\/a\/b\/\.target\.json\.\d+\.[0-9a-f]{12}\.tmp$/)
  })

  test('two calls for the same target never collide', () => {
    const first = uniqueTempPathFor('/a/b/target.json')
    const second = uniqueTempPathFor('/a/b/target.json')

    expect(first).not.toBe(second)
  })
})
