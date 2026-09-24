import { describe, test, expect } from 'vitest'
import { z } from 'zod'
import {
  parseProgrammeKey,
  opIdSchema,
  expectShaSchema,
  parseOptions
} from './shared.js'

describe('parseProgrammeKey', () => {
  test('refuses an empty key with USAGE naming the label (T-S1)', () => {
    expect(() => parseProgrammeKey('', 'programme')).toThrowError(
      expect.objectContaining({
        code: 'USAGE',
        message: expect.stringContaining('programme')
      })
    )
  })

  test('returns a key trimmed (T-S1)', () => {
    expect(parseProgrammeKey('  fixture-ledger  ', 'programme')).toBe(
      'fixture-ledger'
    )
  })
})

describe('opIdSchema', () => {
  test('accepts a well-formed op id (T-S2)', () => {
    expect(opIdSchema.safeParse('r1:inc-009:1:test:t1:rule').success).toBe(true)
  })

  test('refuses "bad id" (a space) (T-S2)', () => {
    expect(opIdSchema.safeParse('bad id').success).toBe(false)
  })
})

describe('expectShaSchema', () => {
  test('accepts 64 hex characters (T-S3)', () => {
    expect(expectShaSchema.safeParse('a'.repeat(64)).success).toBe(true)
  })

  test('refuses 63 characters (T-S3)', () => {
    expect(expectShaSchema.safeParse('a'.repeat(63)).success).toBe(false)
  })
})

describe('parseOptions', () => {
  const schema = z.object({ value: z.string().min(1, 'Give --value.') })

  test('returns parsed data (T-S4)', () => {
    expect(parseOptions(schema, { value: 'x' })).toEqual({ value: 'x' })
  })

  test('throws USAGE with the first issue message (T-S4)', () => {
    expect(() => parseOptions(schema, { value: '' })).toThrowError(
      expect.objectContaining({ code: 'USAGE', message: 'Give --value.' })
    )
  })
})
