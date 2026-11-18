import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { zodOptionsParser } from './_parse-options.js'

const parseOptions = zodOptionsParser(
  z.object({
    file: z.string({ error: 'Give the file with --file.' }),
    count: z.coerce.number().default(1)
  })
)

describe('#zodOptionsParser', () => {
  test('Should give back the options the schema parses', () => {
    expect(parseOptions({ file: 'rows.json', count: '3' })).toEqual({
      file: 'rows.json',
      count: 3
    })
  })

  test("Should refuse invalid options as a usage error with the schema's message", () => {
    expect(() => parseOptions({})).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Give the file with --file.'
      })
    )
  })
})
