import { describe, expect, test } from 'vitest'
import {
  readPrepareGolden,
  REDACTION_CORPUS
} from './__fixtures__/prepare-workspace.js'
import { redactDiff } from './redact.js'

describe('#redactDiff', () => {
  test('Should redact every pattern in the corpus to the bytes and count redact-diff.js gave', () => {
    const { redaction } = readPrepareGolden()

    const redacted = redactDiff(REDACTION_CORPUS)

    expect(redacted).toEqual({
      text: redaction.text,
      count: Number(redaction.count)
    })
  })

  test('Should keep the key of a key-value secret and replace only its value', () => {
    expect(redactDiff('+  DB_PASSWORD="hunter2"\n')).toEqual({
      text: '+  DB_PASSWORD=***REDACTED***\n',
      count: 1
    })
  })

  test('Should count a private-key block once, whatever its length', () => {
    const block =
      '-----BEGIN EC PRIVATE KEY-----\nline one\nline two\n-----END EC PRIVATE KEY-----'

    expect(redactDiff(block)).toEqual({
      text: '***REDACTED PRIVATE KEY BLOCK***',
      count: 1
    })
  })

  test('Should leave a diff with no secrets as it was', () => {
    expect(redactDiff('+const total = 1\n')).toEqual({
      text: '+const total = 1\n',
      count: 0
    })
  })
})
