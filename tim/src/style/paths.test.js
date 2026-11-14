import { describe, expect, test } from 'vitest'
import { fileStylePath, styleDir } from './paths.js'

describe('#styleDir', () => {
  test('Should nest a local review id under the code style reviews folder', () => {
    expect(styleDir('/ws', 'local/trade-imports-stub/feat/NO_JIRA-x')).toBe(
      '/ws/workareas/code-style-reviews/local/trade-imports-stub/feat/NO_JIRA-x'
    )
  })
})

describe('#fileStylePath', () => {
  test("Should name the file's style review after its path with each / as _", () => {
    expect(
      fileStylePath('/ws/s', 'trade-imports-stub', 'src/main/Stub.java')
    ).toBe(
      '/ws/s/file-reviews/trade-imports-stub/src_main_Stub.java.style.json'
    )
  })
})
