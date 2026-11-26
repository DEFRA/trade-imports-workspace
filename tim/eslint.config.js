import { neostandard, resolveIgnoresFromGitignore } from 'neostandard'

export default [
  { ignores: resolveIgnoresFromGitignore() },
  ...neostandard({
    env: ['node', 'vitest'],
    noStyle: true
  })
]
