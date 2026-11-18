import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { corpusHtml, corpusNames } from './__fixtures__/confluence-tree.js'
import { htmlToMarkdown } from './html-to-markdown.js'

const goldenMarkdown = JSON.parse(
  readFileSync(
    new URL('__fixtures__/__golden__/html-to-md.json', import.meta.url),
    'utf8'
  )
)

describe('#htmlToMarkdown', () => {
  test('covers every page of the corpus in the golden', () => {
    expect(Object.keys(goldenMarkdown).sort()).toEqual(corpusNames)
  })

  test.each(corpusNames)(
    'converts %s to the Markdown the Bash converter wrote',
    (name) => {
      const markdown = htmlToMarkdown(corpusHtml(name))

      expect(markdown).toBe(goldenMarkdown[name])
    }
  )
})
