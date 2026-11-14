import { TimError } from '../errors.js'

export const FUNCTIONAL_CATEGORIES = [
  'correctness',
  'security',
  'error-handling',
  'coverage-gap'
]

export const CODE_QUALITY_CATEGORIES = [
  'naming',
  'comments',
  'structure',
  'duplication',
  'logging',
  'test-readability',
  'history'
]

export const DESIGN_CATEGORIES = ['design']

/**
 * @param {string} category
 * @param {string[]} allowedCategories
 * @throws {TimError} USAGE when the category is not one of the allowed ones
 */
export const refuseCategoryOutside = (category, allowedCategories) => {
  if (allowedCategories.includes(category)) return
  throw new TimError(
    'USAGE',
    `--category must be one of: ${allowedCategories.join(' ')}. Got "${category}".`
  )
}
