import { describe, expect, test } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { requireExisting, requireGiven } from './refusals.js'

describe('#requireGiven', () => {
  test('Should name the first label with a missing or empty value', () => {
    expect(() => requireGiven({ A: 'a', B: '', C: undefined })).toThrow(
      'Error: missing required arg B'
    )
  })

  test('Should pass when every value is given', () => {
    expect(requireGiven({ A: 'a' })).toBeUndefined()
  })
})

describe('#requireExisting', () => {
  test('Should refuse a missing path with the hint after "not found"', () => {
    const folder = mkdtempSync(join(tmpdir(), 'tim-refusals-'))
    try {
      expect(() =>
        requireExisting(join(folder, 'x.json'), ' — try again')
      ).toThrow(`Error: ${join(folder, 'x.json')} not found — try again`)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
