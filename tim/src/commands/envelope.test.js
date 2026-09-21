import { describe, test, expect } from 'vitest'
import { TimError } from '../errors.js'
import { jsonEnvelope, exitCodeFor } from './envelope.js'
import { USAGE, ERROR } from '../constants/exitCodes.js'

describe('jsonEnvelope', () => {
  test('builds the success envelope with ok, schema_version, tim_version, result and metadata.ranAt', () => {
    const envelope = jsonEnvelope({
      ok: true,
      result: { total: 3 },
      timVersion: '1.2.3'
    })

    expect(envelope).toEqual({
      ok: true,
      schema_version: 1,
      tim_version: '1.2.3',
      result: { total: 3 },
      errors: [],
      metadata: { ranAt: expect.any(String) }
    })
  })

  test('defaults result to null when the caller omits it', () => {
    const envelope = jsonEnvelope({ ok: true, timVersion: '1.2.3' })

    expect(envelope.result).toBeNull()
  })

  test('builds the error envelope with ok: false, result: null and one {code, message}', () => {
    const envelope = jsonEnvelope({
      ok: false,
      error: { code: 'NOT_FOUND', message: "Can't find it." },
      timVersion: '1.2.3'
    })

    expect(envelope).toEqual({
      ok: false,
      schema_version: 1,
      tim_version: '1.2.3',
      result: null,
      errors: [{ code: 'NOT_FOUND', message: "Can't find it." }]
    })
  })
})

describe('exitCodeFor', () => {
  test('maps USAGE and NOT_FOUND to exit 2 and every other code, and a plain Error, to exit 1', () => {
    expect(exitCodeFor(new TimError('USAGE', 'bad'))).toBe(USAGE)
    expect(exitCodeFor(new TimError('NOT_FOUND', 'gone'))).toBe(USAGE)
    expect(exitCodeFor(new TimError('PARSE', 'bad json'))).toBe(ERROR)
    expect(exitCodeFor(new Error('boom'))).toBe(ERROR)
  })
})
