const REGEX_AFTER_CHARACTERS = new Set('(,=:[!&|?{};+-*%<>~^')
const REGEX_AFTER_WORDS = new Set([
  'return',
  'typeof',
  'case',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'yield',
  'await'
])
const OPENERS = { '(': ')', '[': ']', '{': '}' }
const CLOSERS = new Set(Object.values(OPENERS))

const isJava = (file) => file.endsWith('.java')

const endOfLine = (text, start) => {
  const newline = text.indexOf('\n', start)
  return newline === -1 ? text.length : newline
}

const endOfBlockComment = (text, start) => {
  const close = text.indexOf('*/', start + 2)
  return close === -1 ? null : close + 2
}

const endOfQuoted = (text, start) => {
  const quote = text[start]
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '\\') index++
    else if (text[index] === quote) return index + 1
    else if (text[index] === '\n') return null
  }
  return null
}

const endOfTextBlock = (text, start) => {
  const close = text.indexOf('"""', start + 3)
  return close === -1 ? null : close + 3
}

const endOfRegex = (text, start) => {
  let inClass = false
  for (let index = start + 1; index < text.length; index++) {
    const character = text[index]
    if (character === '\\') index++
    else if (character === '\n') return null
    else if (character === '[') inClass = true
    else if (character === ']') inClass = false
    else if (character === '/' && !inClass) {
      const flags = text.slice(index + 1).match(/^[a-z]*/)[0]
      return index + 1 + flags.length
    }
  }
  return null
}

const previousWord = (text, end) =>
  text.slice(0, end).match(/([A-Za-z_$][\w$]*)\s*$/)?.[1]

const startsRegex = (text, start) => {
  const before = text.slice(0, start).trimEnd()
  if (before === '') return true
  if (REGEX_AFTER_CHARACTERS.has(before.at(-1))) return true
  return REGEX_AFTER_WORDS.has(previousWord(text, before.length))
}

const nonCodeEnd = (text, start, { java }) => {
  const character = text[start]
  const pair = text.slice(start, start + 2)
  if (pair === '//') return endOfLine(text, start)
  if (pair === '/*') return endOfBlockComment(text, start)
  if (java && text.slice(start, start + 3) === '"""') {
    return endOfTextBlock(text, start)
  }
  if (character === '"' || character === "'") return endOfQuoted(text, start)
  if (java) return undefined
  if (character === '`') return endOfTemplate(text, start)
  if (character === '/' && startsRegex(text, start)) {
    return endOfRegex(text, start)
  }
  return undefined
}

const endOfTemplate = (text, start) => {
  for (let index = start + 1; index < text.length; index++) {
    const character = text[index]
    if (character === '\\') index++
    else if (character === '`') return index + 1
    else if (text.startsWith('${', index)) {
      const close = matchingClose(text, index + 1, { java: false })
      if (close === null) return null
      index = close
    }
  }
  return null
}

const matchingClose = (text, openIndex, options) => {
  const expected = [OPENERS[text[openIndex]]]
  for (let index = openIndex + 1; index < text.length; index++) {
    const skipTo = nonCodeEnd(text, index, options)
    if (skipTo === null) return null
    if (skipTo !== undefined) {
      index = skipTo - 1
      continue
    }
    const character = text[index]
    if (OPENERS[character]) expected.push(OPENERS[character])
    else if (CLOSERS.has(character)) {
      if (expected.pop() !== character) return null
      if (expected.length === 0) return index
    }
  }
  return null
}

const nonCodeSpans = (text, options) => {
  const spans = []
  for (let index = 0; index < text.length; index++) {
    const end = nonCodeEnd(text, index, options)
    if (end === null) return null
    if (end !== undefined) {
      spans.push([index, end])
      index = end - 1
    }
  }
  return spans
}

const isInSpans = (spans, position) =>
  spans.some(([start, end]) => position >= start && position < end)

const ESCAPES = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  0: '\0'
}

const unescapedCharacter = (code) => {
  const hexadecimal = 16
  return code.length > 1
    ? String.fromCodePoint(parseInt(code.replace(/[ux{}]/g, ''), hexadecimal))
    : (ESCAPES[code] ?? code)
}

const unescaped = (body) =>
  body.replace(
    /\\(u\{[\da-fA-F]+\}|u[\da-fA-F]{4}|x[\da-fA-F]{2}|.)/gs,
    (_, code) => unescapedCharacter(code)
  )

const literalValueAt = (text, start, options) => {
  const quote = text[start]
  if (!['"', "'", '`'].includes(quote)) return null
  const end = nonCodeEnd(text, start, options)
  if (!end) return null
  const body = text.slice(start + 1, end - 1)
  if (quote === '`' && body.includes('${')) return null
  return unescaped(body)
}

const JS_TEST_CALL =
  /(?<![\w$.])(?:test|it|describe)(?:\s*\.\s*[\w$]+)*\s*\(\s*/g

const jsBlocksTitled = (text, title, spans) =>
  [...text.matchAll(JS_TEST_CALL)]
    .filter((match) => !isInSpans(spans, match.index))
    .filter(
      (match) =>
        literalValueAt(text, match.index + match[0].length, { java: false }) ===
        title
    )
    .map((match) => {
      const open = text.indexOf('(', match.index)
      const close = matchingClose(text, open, { java: false })
      return close === null ? null : text.slice(match.index, close + 1)
    })

const escapedForPattern = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const lineStartBefore = (text, position) =>
  text.lastIndexOf('\n', position - 1) + 1

const annotationRunStart = (text, methodLineStart) => {
  const lineStart = lineStartBefore(text, methodLineStart - 1)
  if (methodLineStart === 0) return methodLineStart
  return text.slice(lineStart, methodLineStart).trim().startsWith('@')
    ? annotationRunStart(text, lineStart)
    : methodLineStart
}

const javaMethodBlockAt = (text, nameIndex) => {
  const open = text.indexOf('(', nameIndex)
  const closeParameters = matchingClose(text, open, { java: true })
  if (closeParameters === null) return null
  const bodyOpen = text.slice(closeParameters).search(/[{;]/)
  if (bodyOpen === -1 || text[closeParameters + bodyOpen] === ';') return null
  const bodyClose = matchingClose(text, closeParameters + bodyOpen, {
    java: true
  })
  if (bodyClose === null) return null
  const start = annotationRunStart(text, lineStartBefore(text, nameIndex))
  return text.slice(start, bodyClose + 1)
}

const javaMethodsNamed = (text, title, spans) =>
  [
    ...text.matchAll(
      new RegExp(`(?<![\\w$])void\\s+(${escapedForPattern(title)})\\s*\\(`, 'g')
    )
  ]
    .filter((match) => !isInSpans(spans, match.index))
    .map((match) =>
      javaMethodBlockAt(text, match.index + match[0].indexOf(match[1]))
    )

const javaMethodsDisplayed = (text, title, spans) =>
  [...text.matchAll(/@DisplayName\s*\(\s*/g)]
    .filter((match) => !isInSpans(spans, match.index))
    .filter(
      (match) =>
        literalValueAt(text, match.index + match[0].length, { java: true }) ===
        title
    )
    .map((match) => {
      const method = text
        .slice(match.index)
        .match(/(?<![\w$])void\s+[\w$]+\s*\(/)
      return method
        ? javaMethodBlockAt(text, match.index + method.index + 5)
        : null
    })

const javaBlocksTitled = (text, title, spans) => {
  const named = javaMethodsNamed(text, title, spans)
  return named.length > 0 ? named : javaMethodsDisplayed(text, title, spans)
}

const withoutTrailingSpace = (block) =>
  block
    .split(/\r\n|\r|\n/)
    .map((line) => line.trimEnd())
    .join('\n')

/**
 * The one test block a file holds under a title: a JavaScript or
 * TypeScript `test`, `it` or `describe` call (any `.only`, `.skip` and so
 * on) whose first argument is that title as a plain string, from the call
 * to its closing bracket; or a Java test method of that name, or with that
 * `@DisplayName`, with its annotations and body. Trailing spaces are
 * dropped from each line.
 *
 * @param {string} text - The file's source
 * @param {string} title
 * @param {string} file - Its path, which says the language
 * @returns {{found: 'one', block: string}|{found: 'none'|'many'|'unreadable'}}
 */
export const testBlockTitled = (text, title, file) => {
  const options = { java: isJava(file) }
  const spans = nonCodeSpans(text, options)
  if (spans === null) return { found: 'unreadable' }
  const blocks = options.java
    ? javaBlocksTitled(text, title, spans)
    : jsBlocksTitled(text, title, spans)
  if (blocks.length === 0) return { found: 'none' }
  if (blocks.length > 1) return { found: 'many' }
  if (blocks[0] === null) return { found: 'unreadable' }
  return { found: 'one', block: withoutTrailingSpace(blocks[0]) }
}

const anyChangeCounts = (reason) => ({
  change: 'edited',
  fileLevel: `${reason}, so any change to the file counts.`
})

const UNLOCATED_REASONS = {
  none: (title) => `Can't find "${title}" in the file before the change`,
  many: (title) => `"${title}" names more than one test in the file`,
  unreadable: () => "Can't read where each test starts and ends in the file"
}

/**
 * How a change to a file changed one linked test in it. `currentText` null
 * means the file is deleted. A test whose block is identical in both is
 * unchanged (null). One whose title is gone is deleted. When the test
 * cannot be told apart from the rest of the file, any change to the file
 * counts as an edit, and `fileLevel` says why.
 *
 * @param {object} args
 * @param {string} [args.title] - The linked test's title
 * @param {string} args.file
 * @param {string|null} args.baseText
 * @param {string|null} args.currentText
 * @returns {{change: 'edited'|'deleted', fileLevel?: string}|null}
 */
export const linkedTestChange = ({ title, file, baseText, currentText }) => {
  if (currentText === null) return { change: 'deleted' }
  if (!title) return anyChangeCounts('Its link in coverage.json names no test')
  if (baseText === null) {
    return anyChangeCounts(UNLOCATED_REASONS.none(title))
  }
  const before = testBlockTitled(baseText, title, file)
  if (before.found !== 'one') {
    return anyChangeCounts(UNLOCATED_REASONS[before.found](title))
  }
  const after = testBlockTitled(currentText, title, file)
  if (after.found === 'none') return { change: 'deleted' }
  if (after.found !== 'one') {
    return anyChangeCounts(UNLOCATED_REASONS[after.found](title))
  }
  return before.block === after.block ? null : { change: 'edited' }
}
