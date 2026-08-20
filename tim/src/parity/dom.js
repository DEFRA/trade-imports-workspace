/**
 * A reader for the captured pages.
 *
 * Every screen is captured three ways: a picture, a page model, and the
 * serialised DOM. The model is a fixed vocabulary — headings, fields, summary
 * rows, task items, links — and a fixed vocabulary decides in advance what a
 * page can be said to have. The DOM is the lossless one, so anything that has
 * to answer "is this control on this page" reads the DOM.
 *
 * The parser is deliberately small. It reads what a browser serialised, which
 * is already well formed: tags are closed, void elements are void, and there
 * are no unclosed paragraphs to recover from. It is not a general HTML5 parser
 * and must not be pointed at hand-written markup.
 */

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
])

/** Tags whose contents are text, never markup. */
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title'])

/** Tags whose text a reader never sees, so it never names a control. */
export const SILENT_TAGS = new Set(['script', 'style', 'head', 'template'])

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  pound: '£',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”'
}

const codePointOf = (body) =>
  body[1] === 'x' || body[1] === 'X'
    ? Number.parseInt(body.slice(2), 16)
    : Number.parseInt(body.slice(1), 10)

/**
 * Turn HTML entities back into the characters a person reads.
 *
 * @param {string} text
 * @returns {string}
 */
export const decodeEntities = (text) =>
  text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body) => {
    if (body.startsWith('#')) {
      const code = codePointOf(body)
      return Number.isFinite(code) && code > 0
        ? String.fromCodePoint(code)
        : whole
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole
  })

/**
 * Collapse runs of whitespace, the way a browser does when it lays text out.
 *
 * Two pages that differ only in indentation say the same thing to a reader, so
 * they have to compare equal here or every match becomes a near miss.
 *
 * @param {string} text
 * @returns {string}
 */
export const normaliseText = (text) =>
  String(text ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The index of the `>` that closes a tag, respecting quoted attribute values.
 *
 * `content="a > b"` is legal and a bare indexOf lands inside it, which splits
 * one element into two and moves everything after it into the wrong parent.
 *
 * @param {string} html
 * @param {number} from - Index of the opening `<`
 * @returns {number} Index of the closing `>`, or -1
 */
export const findTagEnd = (html, from) => {
  let quote = null
  for (let at = from + 1; at < html.length; at += 1) {
    const char = html[at]
    if (quote) {
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '>') return at
  }
  return -1
}

const ATTRIBUTE =
  /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g

const parseAttributes = (source) => {
  const attrs = {}
  for (const match of source.matchAll(ATTRIBUTE)) {
    const [, name, doubled, singled, bare] = match
    attrs[name.toLowerCase()] = decodeEntities(doubled ?? singled ?? bare ?? '')
  }
  return attrs
}

const addText = (parent, text) => {
  if (text === '') return
  parent.children.push({ text: decodeEntities(text), parent })
}

const closeUpTo = (node, tag, root) => {
  let walk = node
  while (walk !== null && walk !== root) {
    if (walk.tag === tag) return walk.parent
    walk = walk.parent
  }
  return node
}

/**
 * Parse a serialised page into an element tree.
 *
 * @param {string} html
 * @returns {object} The root node; `children` holds the document's elements
 */
export const parseHtml = (html) => {
  const root = { tag: '#root', attrs: {}, children: [], parent: null }
  let node = root
  let at = 0

  while (at < html.length) {
    const open = html.indexOf('<', at)
    if (open < 0) {
      addText(node, html.slice(at))
      break
    }
    if (open > at) addText(node, html.slice(at, open))

    if (html.startsWith('<!--', open)) {
      const commentEnd = html.indexOf('-->', open)
      at = commentEnd < 0 ? html.length : commentEnd + 3
      continue
    }
    if (html.startsWith('<!', open) || html.startsWith('<?', open)) {
      const declarationEnd = findTagEnd(html, open)
      at = declarationEnd < 0 ? html.length : declarationEnd + 1
      continue
    }

    const tagEnd = findTagEnd(html, open)
    if (tagEnd < 0) {
      addText(node, html.slice(open))
      break
    }
    const inside = html.slice(open + 1, tagEnd)
    at = tagEnd + 1

    if (inside.startsWith('/')) {
      node = closeUpTo(node, inside.slice(1).trim().toLowerCase(), root)
      continue
    }

    const named = /^([a-zA-Z][^\s/>]*)/.exec(inside)
    if (!named) continue
    const tag = named[1].toLowerCase()
    const element = {
      tag,
      attrs: parseAttributes(inside.slice(named[1].length)),
      children: [],
      parent: node
    }
    node.children.push(element)

    if (VOID_TAGS.has(tag) || inside.trimEnd().endsWith('/')) continue

    if (RAW_TEXT_TAGS.has(tag)) {
      const closer = html.toLowerCase().indexOf(`</${tag}`, at)
      addText(element, closer < 0 ? html.slice(at) : html.slice(at, closer))
      const closerEnd = closer < 0 ? -1 : findTagEnd(html, closer)
      at = closerEnd < 0 ? html.length : closerEnd + 1
      continue
    }

    node = element
  }

  return root
}

/**
 * Every element in the tree, in document order.
 *
 * @param {object} root
 * @returns {object[]}
 */
export const elementsOf = (root) => {
  const out = []
  const walk = (node) => {
    for (const child of node.children ?? []) {
      if (child.tag === undefined) continue
      out.push(child)
      walk(child)
    }
  }
  walk(root)
  return out
}

const gatherText = (node, parts) => {
  for (const child of node.children ?? []) {
    if (child.text !== undefined) {
      parts.push(child.text)
      continue
    }
    if (SILENT_TAGS.has(child.tag)) continue
    gatherText(child, parts)
  }
}

/**
 * The text of an element, as laid out.
 *
 * @param {object} node
 * @returns {string}
 */
export const textOf = (node) => {
  const parts = []
  gatherText(node, parts)
  return normaliseText(parts.join(' '))
}

/**
 * The text a person reads on a control, in the order assistive technology
 * takes it: an explicit aria-label wins, then a button's value, then the text
 * inside the element.
 *
 * @param {object} node
 * @returns {string}
 */
export const accessibleTextOf = (node) => {
  const spoken = normaliseText(node.attrs['aria-label'] ?? '')
  if (spoken) return spoken
  if (node.tag === 'input') return normaliseText(node.attrs.value ?? '')
  return textOf(node)
}

/**
 * The classes on an element.
 *
 * @param {object} node
 * @returns {string[]}
 */
export const classesOf = (node) =>
  normaliseText(node.attrs.class ?? '')
    .split(' ')
    .filter(Boolean)

const ATTRIBUTE_CONDITION =
  /^\[([\w-]+)(?:([~^$*|]?)=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/
const PIECE = /\*|\[[^\]]*\]|[.#]?[A-Za-z_][\w-]*/g

const attributeTest = (piece) => {
  const parsed = ATTRIBUTE_CONDITION.exec(piece)
  if (parsed === null) return () => false
  const [, name, operator, doubled, singled, bare] = parsed
  const wanted = doubled ?? singled ?? bare
  if (wanted === undefined) return (node) => node.attrs[name] !== undefined
  if (operator === '^') {
    return (node) => (node.attrs[name] ?? '').startsWith(wanted)
  }
  if (operator === '$') {
    return (node) => (node.attrs[name] ?? '').endsWith(wanted)
  }
  if (operator === '*') {
    return (node) => (node.attrs[name] ?? '').includes(wanted)
  }
  return (node) => node.attrs[name] === wanted
}

const compoundTest = (compound) => {
  const tests = [...compound.matchAll(PIECE)].map(([piece]) => {
    if (piece === '*') return () => true
    if (piece.startsWith('.')) {
      const wanted = piece.slice(1)
      return (node) => classesOf(node).includes(wanted)
    }
    if (piece.startsWith('#')) {
      const wanted = piece.slice(1)
      return (node) => node.attrs.id === wanted
    }
    if (piece.startsWith('[')) return attributeTest(piece)
    const tag = piece.toLowerCase()
    return (node) => node.tag === tag
  })
  return (node) => tests.every((test) => test(node))
}

const compiled = new Map()

/**
 * Whether an element matches a selector.
 *
 * Only the grammar the role selectors need: a comma-separated list of
 * compounds built from tag names, classes, ids and attribute tests. No
 * combinators — a rule that depends on where an element sits is a rule about
 * the page's structure, and it belongs in the role list rather than hidden
 * inside a selector string.
 *
 * @param {object} node
 * @param {string} selector
 * @returns {boolean}
 */
export const matchesSelector = (node, selector) => {
  if (!compiled.has(selector)) {
    compiled.set(
      selector,
      selector
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map(compoundTest)
    )
  }
  return compiled.get(selector).some((test) => test(node))
}

/**
 * The nearest ancestor-or-self matching a selector.
 *
 * @param {object} node
 * @param {string} selector
 * @returns {object|null}
 */
export const closestMatching = (node, selector) => {
  let walk = node
  while (walk !== null) {
    if (walk.tag === undefined || walk.tag === '#root') return null
    if (matchesSelector(walk, selector)) return walk
    walk = walk.parent
  }
  return null
}

/** Form controls a person can act on. */
export const FORM_CONTROL_SELECTOR = 'input, select, textarea'

const isHiddenControl = (node) =>
  node.attrs.type === 'hidden' ||
  node.attrs.hidden !== undefined ||
  node.attrs['aria-hidden'] === 'true'

/**
 * Every visible form control on the page, in document order.
 *
 * @param {object[]} elements
 * @returns {object[]}
 */
export const formControlsIn = (elements) =>
  elements.filter(
    (node) =>
      matchesSelector(node, FORM_CONTROL_SELECTOR) === true &&
      isHiddenControl(node) === false
  )

/**
 * Build the label index for one page: every form control, against every piece
 * of text that names it.
 *
 * A control is named by an explicit `label for=`, by a label wrapped round it,
 * by the legend of the fieldset it sits in, by its own aria-label, and by
 * whatever aria-labelledby points at. All of those are things a person would
 * point at and call the field's name, so all of them resolve.
 *
 * @param {object[]} elements - Document-order elements
 * @returns {Map<object, string[]>}
 */
export const labelIndex = (elements) => {
  const byId = new Map()
  for (const node of elements) {
    if (node.attrs.id) byId.set(node.attrs.id, node)
  }

  const labels = new Map()
  const add = (node, text) => {
    const clean = normaliseText(text)
    if (node === null || node === undefined || clean === '') return
    labels.set(node, [...(labels.get(node) ?? []), clean])
  }

  for (const node of elements) {
    if (node.tag === 'label') {
      const target =
        (node.attrs.for ? byId.get(node.attrs.for) : null) ??
        elementsOf(node).find((child) =>
          matchesSelector(child, FORM_CONTROL_SELECTOR)
        )
      add(target, textOf(node))
      continue
    }
    if (node.tag === 'legend') {
      const fieldset = closestMatching(node.parent, 'fieldset')
      const text = textOf(node)
      const controls = elementsOf(fieldset ?? node).filter((child) =>
        matchesSelector(child, FORM_CONTROL_SELECTOR)
      )
      for (const control of controls) add(control, text)
      continue
    }
    if (matchesSelector(node, FORM_CONTROL_SELECTOR)) {
      add(node, node.attrs['aria-label'] ?? '')
      for (const id of (node.attrs['aria-labelledby'] ?? '').split(/\s+/)) {
        const target = id ? byId.get(id) : null
        if (target) add(node, textOf(target))
      }
    }
  }

  return labels
}

/**
 * Read one captured page.
 *
 * @param {string} html
 * @returns {{root: object, elements: object[], labels: Map<object, string[]>}}
 */
export const parseDocument = (html) => {
  const root = parseHtml(html)
  const elements = elementsOf(root)
  return { root, elements, labels: labelIndex(elements) }
}
