import { readFileSync } from 'node:fs'

const parseLine = (line) => {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

/**
 * Every parseable JSON line of a `.jsonl` file. A line that does not parse —
 * typically the last one of a transcript still being written — is skipped.
 *
 * @param {string} path
 * @returns {object[]}
 */
export const readJsonLines = (path) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map(parseLine)
    .filter((entry) => entry !== null)

const EMPTY_USAGE = {
  input: 0,
  output: 0,
  cacheCreation: 0,
  cacheRead: 0
}

const usageOf = (usage = {}) => ({
  input: usage.input_tokens ?? 0,
  output: usage.output_tokens ?? 0,
  cacheCreation: usage.cache_creation_input_tokens ?? 0,
  cacheRead: usage.cache_read_input_tokens ?? 0
})

/**
 * Adds two usage records field by field.
 *
 * @param {typeof EMPTY_USAGE} left
 * @param {typeof EMPTY_USAGE} right
 * @returns {typeof EMPTY_USAGE}
 */
export const addUsage = (left, right) => ({
  input: left.input + right.input,
  output: left.output + right.output,
  cacheCreation: left.cacheCreation + right.cacheCreation,
  cacheRead: left.cacheRead + right.cacheRead
})

/**
 * Every token the model processed: fresh input, output, and cache writes and
 * reads.
 *
 * @param {typeof EMPTY_USAGE} usage
 * @returns {number}
 */
export const totalTokens = ({ input, output, cacheCreation, cacheRead }) =>
  input + output + cacheCreation + cacheRead

export const emptyUsage = () => ({ ...EMPTY_USAGE })

const isAssistant = (entry) =>
  entry.type === 'assistant' && entry.message?.usage

const requestKey = (entry) => entry.message?.id ?? entry.requestId ?? entry.uuid

// Claude Code writes one line per content block of a reply, each carrying the
// usage so far. The last line of a reply holds its final usage, so a later
// line for the same reply replaces an earlier one.
const finalUsagePerRequest = (entries) =>
  entries
    .filter(isAssistant)
    .reduce(
      (requests, entry) =>
        requests.set(requestKey(entry), usageOf(entry.message.usage)),
      new Map()
    )

const toolUseIds = (entries) =>
  new Set(
    entries
      .filter((entry) => entry.type === 'assistant')
      .flatMap((entry) =>
        Array.isArray(entry.message?.content) ? entry.message.content : []
      )
      .filter((block) => block.type === 'tool_use')
      .map((block) => block.id)
  )

const timestampsOf = (entries) =>
  entries
    .map((entry) => Date.parse(entry.timestamp))
    .filter((time) => Number.isFinite(time))

const firstModel = (entries) =>
  entries.find((entry) => entry.type === 'assistant' && entry.message?.model)
    ?.message.model ?? null

/**
 * What one agent's transcript cost and how long it ran: token usage summed
 * once per model request, tool calls, and the span between its first and
 * last line.
 *
 * @param {object[]} entries - The transcript's parsed lines
 * @returns {{model: string|null, requests: number, usage: typeof EMPTY_USAGE, toolUses: number, firstAt: number|null, lastAt: number|null, wallMs: number}}
 */
export const summariseTranscript = (entries) => {
  const requests = finalUsagePerRequest(entries)
  const times = timestampsOf(entries)
  const firstAt = times.length > 0 ? Math.min(...times) : null
  const lastAt = times.length > 0 ? Math.max(...times) : null
  return {
    model: firstModel(entries),
    requests: requests.size,
    usage: [...requests.values()].reduce(addUsage, emptyUsage()),
    toolUses: toolUseIds(entries).size,
    firstAt,
    lastAt,
    wallMs: firstAt === null ? 0 : lastAt - firstAt
  }
}

/**
 * The text of an agent's first prompt, or an empty string.
 *
 * @param {object[]} entries
 * @returns {string}
 */
export const firstPromptText = (entries) => {
  const content = entries.find((entry) => entry.type === 'user')?.message
    ?.content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}
