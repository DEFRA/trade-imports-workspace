import { describe, expect, test } from 'vitest'
import { withoutGitAdvice } from './bash-golden-harness.js'

describe('#withoutGitAdvice', () => {
  test('Should take out the advice git prints with a failed pull and keep the error', () => {
    const stderr = [
      "hint: Diverging branches can't be fast-forwarded, you need to either:",
      'hint:',
      'hint: \tgit merge --no-ff',
      'hint:',
      'hint: Disable this message with "git config set advice.diverging false"',
      'fatal: Not possible to fast-forward, aborting.',
      ''
    ].join('\n')

    expect(withoutGitAdvice(stderr)).toBe(
      'fatal: Not possible to fast-forward, aborting.\n'
    )
  })

  test('Should take out the same advice however git words the config command', () => {
    const olderGit =
      'hint: Disable this message with "git config advice.diverging false"\nfatal: Not possible to fast-forward, aborting.\n'
    const newerGit =
      'hint: Disable this message with "git config set advice.diverging false"\nfatal: Not possible to fast-forward, aborting.\n'

    expect(withoutGitAdvice(olderGit)).toBe(withoutGitAdvice(newerGit))
  })

  test('Should keep a line that says hint somewhere other than its start', () => {
    const stdout = 'Wrote the hint: text for the field\n'

    expect(withoutGitAdvice(stdout)).toBe(stdout)
  })

  test('Should give back output holding no advice unchanged', () => {
    const stdout = '→ fetch origin (trade-imports-stub)\n→ checkout main\n'

    expect(withoutGitAdvice(stdout)).toBe(stdout)
  })
})
