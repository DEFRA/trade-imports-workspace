import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CODE_QUALITY_CATEGORIES,
  DESIGN_CATEGORIES,
  FUNCTIONAL_CATEGORIES,
  refuseCategoryOutside
} from './finding-categories.js'

const here = dirname(fileURLToPath(import.meta.url))

const refusedCategoryGolden = JSON.parse(
  readFileSync(
    join(here, '__fixtures__', '__golden__', 'refused-category.json'),
    'utf8'
  )
)[0]

const everyCategory = [
  ...FUNCTIONAL_CATEGORIES,
  ...CODE_QUALITY_CATEGORIES,
  ...DESIGN_CATEGORIES
]

describe('#refuseCategoryOutside', () => {
  test('Should accept a category in the allowed list', () => {
    expect(() =>
      refuseCategoryOutside('history', CODE_QUALITY_CATEGORIES)
    ).not.toThrow()
  })

  test('Should refuse a category outside the list with the words review-add-item.sh prints', () => {
    const category = refusedCategoryGolden.input.at(
      refusedCategoryGolden.input.indexOf('--category') + 1
    )

    expect(() => refuseCategoryOutside(category, everyCategory)).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: refusedCategoryGolden.stderr
      })
    )
  })
})

describe('finding categories', () => {
  test('Should hold the functional, code-quality and design categories in order', () => {
    expect({
      functional: FUNCTIONAL_CATEGORIES,
      codeQuality: CODE_QUALITY_CATEGORIES,
      design: DESIGN_CATEGORIES
    }).toEqual({
      functional: ['correctness', 'security', 'error-handling', 'coverage-gap'],
      codeQuality: [
        'naming',
        'comments',
        'structure',
        'duplication',
        'logging',
        'test-readability',
        'history'
      ],
      design: ['design']
    })
  })
})
