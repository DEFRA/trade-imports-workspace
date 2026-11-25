import { describe, test, expect } from 'vitest'
import { loadYaml } from './yaml.js'

describe('loadYaml', () => {
  test('reads a mapping', () => {
    expect(loadYaml('name: build\non: push\n')).toEqual({
      name: 'build',
      on: 'push'
    })
  })

  test.each([
    ['empty', ''],
    ['whitespace-only', '  \n\t\n'],
    ['comment-only', '# nothing here\n']
  ])('reads %s source as undefined', (_label, source) => {
    expect(loadYaml(source)).toBeUndefined()
  })

  test('throws on source with more than one document', () => {
    expect(() => loadYaml('a: 1\n---\nb: 2\n')).toThrow(
      'expected a single document in the stream, but found more'
    )
  })

  test('throws on invalid YAML', () => {
    expect(() => loadYaml('a: [1, 2\n')).toThrow()
  })
})
