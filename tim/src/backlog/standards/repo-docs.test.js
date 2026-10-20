import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { repoDocsFor, tildePath } from './repo-docs.js'

let repoAbs

beforeEach(() => {
  repoAbs = mkdtempSync(join(tmpdir(), 'tim-repo-docs-'))
})

afterEach(() => {
  rmSync(repoAbs, { recursive: true, force: true })
})

const write = (relPath) => {
  const abs = join(repoAbs, relPath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, '# Doc\n')
}

const seedFrontendDocs = () => {
  write('src/server/app/docs/architecture.md')
  write('src/server/app/docs/flow-and-gates.md')
  write('src/server/app/docs/validation.md')
  write('src/server/app/docs/add-a-set.md')
  write('src/server/app/docs/engine.md')
  write('src/server/app/sets/plants/docs/README.md')
  write('src/server/app/sets/plants/docs/features.md')
  write('src/server/app/sets/plants/docs/journey-flow-and-gates.md')
  write('src/server/app/sets/plants/docs/add-a-page.md')
  write('src/server/app/sets/plants/docs/add-a-field.md')
  write('src/server/app/sets/plants/docs/limits.md')
  write('src/server/app/sets/animals/docs/README.md')
}

const relativeToRepo = (absPaths) =>
  absPaths.map((abs) => abs.slice(repoAbs.length + 1))

describe('#repoDocsFor', () => {
  test('Should list the topic docs, the platform docs and recipes, then the owning set docs and recipes, in that order', () => {
    seedFrontendDocs()

    const docs = repoDocsFor({
      repoAbs,
      relPathInRepo: 'src/server/app/sets/plants/features/origin/controller.js',
      topicRepoDocs: ['src/server/app/docs/validation.md']
    })

    expect(relativeToRepo(docs)).toEqual([
      'src/server/app/docs/validation.md',
      'src/server/app/docs/architecture.md',
      'src/server/app/docs/flow-and-gates.md',
      'src/server/app/docs/add-a-set.md',
      'src/server/app/sets/plants/docs/README.md',
      'src/server/app/sets/plants/docs/features.md',
      'src/server/app/sets/plants/docs/journey-flow-and-gates.md',
      'src/server/app/sets/plants/docs/add-a-field.md',
      'src/server/app/sets/plants/docs/add-a-page.md'
    ])
  })

  test('Should list every set docs for a file outside any set', () => {
    seedFrontendDocs()

    const docs = repoDocsFor({
      repoAbs,
      relPathInRepo: 'src/server/app/engine/flow.js'
    })

    expect(relativeToRepo(docs)).toEqual([
      'src/server/app/docs/architecture.md',
      'src/server/app/docs/flow-and-gates.md',
      'src/server/app/docs/add-a-set.md',
      'src/server/app/sets/animals/docs/README.md',
      'src/server/app/sets/plants/docs/README.md',
      'src/server/app/sets/plants/docs/features.md',
      'src/server/app/sets/plants/docs/journey-flow-and-gates.md',
      'src/server/app/sets/plants/docs/add-a-field.md',
      'src/server/app/sets/plants/docs/add-a-page.md'
    ])
  })

  test('Should leave out a topic doc the repo does not have', () => {
    write('src/server/app/docs/architecture.md')

    const docs = repoDocsFor({
      repoAbs,
      relPathInRepo: 'src/server/app/routes.js',
      topicRepoDocs: ['src/server/app/docs/validation.md']
    })

    expect(relativeToRepo(docs)).toEqual([
      'src/server/app/docs/architecture.md'
    ])
  })

  test('Should list nothing for a repo with no frontend docs', () => {
    write('src/main/java/App.java')

    expect(
      repoDocsFor({ repoAbs, relPathInRepo: 'src/main/java/App.java' })
    ).toEqual([])
  })

  test('Should return absolute paths', () => {
    write('src/server/app/docs/architecture.md')

    expect(repoDocsFor({ repoAbs })).toEqual([
      join(repoAbs, 'src/server/app/docs/architecture.md')
    ])
  })
})

describe('#tildePath', () => {
  test('Should write a path inside the home folder from ~', () => {
    expect(tildePath('/home/sam/git/a.md', '/home/sam')).toBe('~/git/a.md')
  })

  test('Should leave a path outside the home folder unchanged', () => {
    expect(tildePath('/srv/git/a.md', '/home/sam')).toBe('/srv/git/a.md')
  })

  test('Should not treat a folder that only starts with the home folder name as inside it', () => {
    expect(tildePath('/home/samuel/a.md', '/home/sam')).toBe(
      '/home/samuel/a.md'
    )
  })
})
