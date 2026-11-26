import { describe, expect, test } from 'vitest'
import { branchRefsOnly } from './git-fixtures.js'

describe('#branchRefsOnly', () => {
  test('Should leave out the full ref name of origin/HEAD', () => {
    const refNames = branchRefsOnly([
      'refs/heads/main',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/main'
    ])

    expect(refNames).toEqual(['refs/heads/main', 'refs/remotes/origin/main'])
  })

  test('Should leave out the short name of origin/HEAD', () => {
    const refNames = branchRefsOnly(['origin/HEAD', 'origin/main'])

    expect(refNames).toEqual(['origin/main'])
  })

  test('Should keep a branch whose name only starts with HEAD', () => {
    const refNames = branchRefsOnly([
      'refs/remotes/origin/HEADROOM',
      'refs/heads/HEAD-of-queue'
    ])

    expect(refNames).toEqual([
      'refs/remotes/origin/HEADROOM',
      'refs/heads/HEAD-of-queue'
    ])
  })

  test('Should give back a list that names no origin/HEAD unchanged', () => {
    const refNames = branchRefsOnly([
      'refs/heads/main',
      'refs/remotes/origin/main'
    ])

    expect(refNames).toEqual(['refs/heads/main', 'refs/remotes/origin/main'])
  })
})
