import { describe, expect, test } from 'vitest'
import {
  encodeFilePath,
  fileReviewPath,
  itemsFilePath,
  reviewDir
} from './paths.js'

describe('#encodeFilePath', () => {
  test('Should replace every slash with an underscore', () => {
    expect(encodeFilePath('src/server/app/page.js')).toBe(
      'src_server_app_page.js'
    )
  })

  test('Should leave a path with no slash as it is', () => {
    expect(encodeFilePath('README.md')).toBe('README.md')
  })
})

describe('#reviewDir', () => {
  test('Should nest a local review id with slashes under workareas/reviews', () => {
    expect(reviewDir('/ws', 'local/trade-imports-stub/feat/NO_JIRA-x')).toBe(
      '/ws/workareas/reviews/local/trade-imports-stub/feat/NO_JIRA-x'
    )
  })
})

describe('#itemsFilePath', () => {
  test('Should name the items file after the repo', () => {
    expect(
      itemsFilePath('/ws/workareas/reviews/T-1', 'trade-imports-stub')
    ).toBe('/ws/workareas/reviews/T-1/items.trade-imports-stub.json')
  })
})

describe('#fileReviewPath', () => {
  test('Should put the encoded file path under file-reviews/<repo>', () => {
    expect(
      fileReviewPath(
        '/ws/workareas/reviews/T-1',
        'trade-imports-stub',
        'src/a/b.js'
      )
    ).toBe(
      '/ws/workareas/reviews/T-1/file-reviews/trade-imports-stub/src_a_b.js.review.json'
    )
  })
})
