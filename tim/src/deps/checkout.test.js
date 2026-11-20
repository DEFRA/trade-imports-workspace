import { describe, test, expect } from 'vitest'
import { join } from 'node:path'
import { depsCheckoutPath } from './checkout.js'

describe('#depsCheckoutPath', () => {
  test("Should point tim at the workspace's own tim folder", () => {
    expect(depsCheckoutPath('/workspace', 'tim')).toBe(
      join('/workspace', 'tim')
    )
  })

  test('Should point any other repo at its clone under repos/', () => {
    expect(
      depsCheckoutPath('/workspace', 'trade-imports-animals-frontend')
    ).toBe(join('/workspace', 'repos', 'trade-imports-animals-frontend'))
  })
})
