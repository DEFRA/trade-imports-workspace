import { describe, expect, test } from 'vitest'
import {
  analysisFilePath,
  checkFilePaths,
  checkFolder,
  requireTicket
} from './paths.js'

describe('#checkFolder', () => {
  test('Should put a check under the workspace it is given, not a fixed home path', () => {
    const folder = checkFolder('/clones/second', 'EUDPA-1')

    expect(folder).toBe('/clones/second/workareas/understanding-checks/EUDPA-1')
  })
})

describe('#checkFilePaths', () => {
  test('Should name the questions, transcript and meta files in the folder', () => {
    const paths = checkFilePaths('/check')

    expect(paths).toEqual({
      questions: '/check/questions.json',
      transcript: '/check/transcript.json',
      meta: '/check/.interview-meta.json'
    })
  })
})

describe('#analysisFilePath', () => {
  test("Should name the repo's analysis file in the folder", () => {
    expect(analysisFilePath('/check', 'trade-imports-stub')).toBe(
      '/check/analysis.trade-imports-stub.json'
    )
  })
})

describe('#requireTicket', () => {
  test('Should return an EUDPA ticket', () => {
    expect(requireTicket('EUDPA-42', 'usage')).toBe('EUDPA-42')
  })

  test('Should refuse with the usage line when there is no ticket', () => {
    expect(() => requireTicket(undefined, 'Usage: x')).toThrow(
      expect.objectContaining({ code: 'USAGE', message: 'Usage: x' })
    )
  })

  test('Should refuse a ticket that does not start EUDPA-', () => {
    expect(() => requireTicket('ABC-1', 'usage')).toThrow(
      expect.objectContaining({ code: 'USAGE', message: 'Unknown arg: ABC-1' })
    )
  })
})
