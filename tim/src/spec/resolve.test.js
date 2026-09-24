import { describe, test, expect } from 'vitest'
import { resolveLink } from './resolve.js'

const index = {
  unit: [
    {
      file: 'src/a.test.js',
      title: 'spins on load',
      fullTitle: 'widget > spins on load'
    }
  ]
}

describe('resolveLink', () => {
  test('resolves via the runner index on an exact leaf-title match', () => {
    expect(
      resolveLink({
        link: { type: 'unit', file: 'src/a.test.js', test: 'spins on load' },
        index
      })
    ).toEqual({ resolved: true, tier: 'runner-index' })
  })

  test('also accepts the full " > "-joined title', () => {
    expect(
      resolveLink({
        link: {
          type: 'unit',
          file: 'src/a.test.js',
          test: 'widget > spins on load'
        },
        index
      })
    ).toEqual({ resolved: true, tier: 'runner-index' })
  })

  test('does not resolve a title that is merely a substring of the real one', () => {
    // The SCN-ADDR-001-B case: a truncated title that grep would wrongly pass.
    expect(
      resolveLink({
        link: { type: 'unit', file: 'src/a.test.js', test: 'spins on' },
        index
      })
    ).toEqual({ resolved: false, tier: null })
  })

  test('does not resolve when the file does not match, even with the right title', () => {
    expect(
      resolveLink({
        link: { type: 'unit', file: 'src/b.test.js', test: 'spins on load' },
        index
      })
    ).toEqual({ resolved: false, tier: null })
  })

  test('falls back to a literal grep of Java source when the index has nothing', () => {
    expect(
      resolveLink({
        link: { type: 'unit', file: 'src/Widget.java', test: 'shouldSpin' },
        javaSourceText: 'class Widget { void shouldSpin() {} }'
      })
    ).toEqual({ resolved: true, tier: 'java-grep' })
  })

  test('does not resolve a truncated Java method against a longer name', () => {
    expect(
      resolveLink({
        link: { type: 'unit', file: 'src/Widget.java', test: 'shouldSpin' },
        javaSourceText: 'class Widget { void shouldSpinWhenReady() {} }'
      })
    ).toEqual({ resolved: false, tier: null })
  })

  test('is unresolved when neither tier finds it', () => {
    expect(
      resolveLink({
        link: { type: 'unit', file: 'src/Widget.java', test: 'shouldSpin' },
        javaSourceText: 'class Widget { void shouldStop() {} }'
      })
    ).toEqual({ resolved: false, tier: null })
  })
})
