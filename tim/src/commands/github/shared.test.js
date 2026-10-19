import { describe, test, expect } from 'vitest'
import { repoNameSchema } from './shared.js'

describe('repoNameSchema', () => {
  test('accepts a bare repo name', () => {
    expect(repoNameSchema.parse(' trade-imports-animals-frontend ')).toBe(
      'trade-imports-animals-frontend'
    )
  })

  test('refuses an owner/repo pair and says to drop the prefix', () => {
    const result = repoNameSchema.safeParse(
      'DEFRA/trade-imports-animals-frontend'
    )

    expect(result.error.issues[0].message).toBe(
      'Give the repo name without the DEFRA/ prefix, for example trade-imports-animals-frontend.'
    )
  })
})
