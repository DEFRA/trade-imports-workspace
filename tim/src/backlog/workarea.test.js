import { describe, test, expect } from 'vitest'
import { join } from 'node:path'
import { workareaDirFor } from './workarea.js'

const ROOT = '/work/space'

describe('workareaDirFor', () => {
  test('resolves a workarea under workareas/', () => {
    expect(workareaDirFor(ROOT, 'shared/demo')).toBe(
      join(ROOT, 'workareas', 'shared', 'demo')
    )
  })

  test('drops a trailing slash', () => {
    expect(workareaDirFor(ROOT, 'shared/demo/')).toBe(
      join(ROOT, 'workareas', 'shared', 'demo')
    )
  })

  test('refuses a workarea that climbs out of workareas/', () => {
    expect(() => workareaDirFor(ROOT, 'shared/../../etc')).toThrow(
      'Workarea "shared/../../etc" must be a path inside workareas/, such as shared/my-programme.'
    )
  })

  test('refuses an absolute path', () => {
    expect(() => workareaDirFor(ROOT, '/tmp/demo')).toThrow(
      'Workarea "/tmp/demo" must be a path inside workareas/, such as shared/my-programme.'
    )
  })

  test('asks for a workarea when none is given', () => {
    expect(() => workareaDirFor(ROOT, '  ')).toThrow(
      'Name a workarea, such as shared/my-programme.'
    )
  })
})
