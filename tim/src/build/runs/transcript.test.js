import { describe, test, expect } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  firstPromptText,
  readJsonLines,
  summariseTranscript,
  totalTokens
} from './transcript.js'

const here = dirname(fileURLToPath(import.meta.url))
const RUN_FOLDER = join(
  here,
  '__fixtures__',
  'projects',
  '11111111-1111-4111-8111-111111111111',
  'subagents',
  'workflows',
  'wf_aaaa0001-001'
)

const transcript = (agentId) =>
  readJsonLines(join(RUN_FOLDER, `agent-${agentId}.jsonl`))

describe('summariseTranscript', () => {
  test('counts each model request once, using the last line written for it', () => {
    const summary = summariseTranscript(transcript('a0000000000000001'))

    expect(summary.usage).toEqual({
      input: 15,
      output: 80,
      cacheCreation: 1200,
      cacheRead: 1000
    })
  })

  test('reports the model, request count, tool calls and time from first to last line', () => {
    const summary = summariseTranscript(transcript('a0000000000000001'))

    expect(summary).toMatchObject({
      model: 'claude-haiku-4-5-20251001',
      requests: 2,
      toolUses: 1,
      firstAt: Date.parse('2026-01-01T10:00:00.000Z'),
      lastAt: Date.parse('2026-01-01T10:00:06.000Z'),
      wallMs: 6000
    })
  })

  test('skips a last line still being written', () => {
    const summary = summariseTranscript(transcript('a0000000000000004'))

    expect(summary).toMatchObject({ requests: 1, wallMs: 120000 })
  })

  test('reports nothing for an empty transcript', () => {
    expect(summariseTranscript([])).toEqual({
      model: null,
      requests: 0,
      usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
      toolUses: 0,
      firstAt: null,
      lastAt: null,
      wallMs: 0
    })
  })
})

describe('totalTokens', () => {
  test('adds input, output, cache writes and cache reads', () => {
    expect(
      totalTokens({ input: 1, output: 20, cacheCreation: 300, cacheRead: 4000 })
    ).toBe(4321)
  })
})

describe('firstPromptText', () => {
  test("returns the agent's first prompt", () => {
    expect(firstPromptText(transcript('a0000000000000002'))).toBe(
      'Fixture prompt: plan increment inc-001.'
    )
  })

  test('joins the text blocks of a prompt sent as blocks', () => {
    const entries = [
      {
        type: 'user',
        message: {
          content: [
            { type: 'text', text: 'first' },
            { type: 'image' },
            { type: 'text', text: 'second' }
          ]
        }
      }
    ]

    expect(firstPromptText(entries)).toBe('first\nsecond')
  })
})
