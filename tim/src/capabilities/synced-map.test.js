import { describe, expect, test } from 'vitest'
import { capabilityMapPathOf, syncedVersionOf } from './synced-map.js'

describe('#capabilityMapPathOf', () => {
  test('Should place the map under docs/confluence in the workspace', () => {
    expect(capabilityMapPathOf('/work/space')).toBe(
      '/work/space/docs/confluence/import-notification-capability-map.md'
    )
  })
})

describe('#syncedVersionOf', () => {
  test.each([
    ['the front matter version', '---\nversion: 42\n---\n', '42'],
    ['the first of two version lines', 'version: 7\nversion: 8\n', '7'],
    ['the word after tabs and spaces', 'version:\t \t9 extra\n', '9'],
    ['nothing from a version line with no gap', 'version:42\n', ''],
    ['nothing from an indented version line', '  version: 42\n', ''],
    ['nothing when no line gives a version', '# Map\n', '']
  ])('Should read %s', (_case, text, version) => {
    expect(syncedVersionOf(text)).toBe(version)
  })
})
