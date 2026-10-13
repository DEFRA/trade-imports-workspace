import { describe, test, expect, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  normaliseWorkarea,
  workareaBacklogReader,
  workareaDirFor
} from './workarea.js'

const ROOT = '/work/space'

describe('normaliseWorkarea', () => {
  test('writes a workarea one way, whatever slashes it came with', () => {
    expect([
      normaliseWorkarea('shared/demo/'),
      normaliseWorkarea(' shared//demo '),
      normaliseWorkarea('shared/./demo')
    ]).toEqual(['shared/demo', 'shared/demo', 'shared/demo'])
  })
})

describe('workareaBacklogReader', () => {
  let workspace

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true })
  })

  const workspaceWith = (workarea, body) => {
    workspace = mkdtempSync(join(tmpdir(), 'tim-workarea-'))
    const dir = join(workspace, 'workareas', workarea)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'backlog.json'), body)
    return workspace
  }

  test("reads another workarea's backlog", () => {
    const read = workareaBacklogReader(
      workspaceWith('shared/hrp/themes/origin', '{"increments":[]}')
    )

    expect(read('shared/hrp/themes/origin')).toEqual({ increments: [] })
  })

  test('reads a workarea with no backlog, or outside workareas/, as null', () => {
    const read = workareaBacklogReader(workspaceWith('shared/hrp', '{}'))

    expect([read('shared/elsewhere'), read('../outside')]).toEqual([null, null])
  })

  test('refuses a backlog that is not JSON', () => {
    const read = workareaBacklogReader(workspaceWith('shared/hrp', '{'))

    expect(() => read('shared/hrp')).toThrow(/backlog\.json is not valid JSON/)
  })
})

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
