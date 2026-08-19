/**
 * Just enough DOM to run a browser-side extractor under vitest.
 *
 * The control extractor and the page-model extractor are serialised into a real
 * browser by Playwright, so they cannot import anything and cannot be unit
 * tested by calling them with arguments. Without something like this they are
 * only ever exercised by a full capture run — which is how a widget heuristic
 * that turns every text box on the page into a type-ahead ships unnoticed.
 *
 * Deliberately small: element and attribute selectors, classes, ids, `*=`,
 * comma lists, and a leading `:scope >`. That is the whole selector vocabulary
 * the extractors use. It is a test double, not a DOM — a selector it does not
 * understand should be a failing test, not a new feature here.
 *
 * `:scope >` earns its place because the page model's hint lookup turns on it:
 * a hint that is a child of the form group belongs to the control, and one a
 * level deeper inside the fieldset does not. A double that ignored the
 * combinator would pass whichever way the lookup was written.
 */

const ATTRIBUTE = /\[([\w-]+)(?:(\*?)="([^"]*)")?\]/g
const CLASS = /\.([\w-]+)/g
const ID = /#([\w-]+)/g
const TAG = /^([a-z][a-z0-9-]*)/i
const SCOPE_CHILD = /^:scope\s*>\s*/

const matchesCompound = (node, selector) => {
  const bare = selector.replace(/\[[^\]]*\]/g, '')
  const tag = TAG.exec(bare)
  if (tag && node.tag !== tag[1].toLowerCase()) return false
  for (const [, id] of bare.matchAll(ID)) {
    if (node.getAttribute('id') !== id) return false
  }
  for (const [, name] of bare.matchAll(CLASS)) {
    if (!node.classList.contains(name)) return false
  }
  for (const [, name, wildcard, value] of selector.matchAll(ATTRIBUTE)) {
    const actual = node.getAttribute(name)
    if (actual === null) return false
    if (value === undefined) continue
    if (wildcard ? !actual.includes(value) : actual !== value) return false
  }
  return true
}

const matches = (node, selector) =>
  selector.split(',').some((one) => matchesCompound(node, one.trim()))

const descendants = (node) =>
  node.children.flatMap((child) =>
    typeof child === 'string' ? [] : [child, ...descendants(child)]
  )

class MiniElement {
  constructor(tag, attrs = {}, children = []) {
    this.tag = tag.toLowerCase()
    this.attrs = attrs
    this.children = children
    this.parentElement = null
    for (const child of children) {
      if (typeof child !== 'string') child.parentElement = this
    }
  }

  get tagName() {
    return this.tag.toUpperCase()
  }

  get className() {
    return this.attrs.class ?? ''
  }

  get classList() {
    const names = (this.attrs.class ?? '').split(/\s+/).filter(Boolean)
    return {
      contains: (name) => names.includes(name),
      length: names.length,
      [Symbol.iterator]: () => names[Symbol.iterator]()
    }
  }

  get id() {
    return this.attrs.id ?? ''
  }

  get name() {
    return this.attrs.name ?? ''
  }

  get type() {
    return this.attrs.type ?? (this.tag === 'input' ? 'text' : this.tag)
  }

  get value() {
    return this.attrs.value ?? ''
  }

  get disabled() {
    return 'disabled' in this.attrs
  }

  get required() {
    return 'required' in this.attrs
  }

  get checked() {
    return 'checked' in this.attrs
  }

  get options() {
    return this.children.filter(
      (child) => typeof child !== 'string' && child.tag === 'option'
    )
  }

  get form() {
    return this.closest('form')
  }

  get textContent() {
    return this.children
      .map((child) => (typeof child === 'string' ? child : child.textContent))
      .join('')
  }

  getAttribute(name) {
    return this.attrs[name] ?? null
  }

  hasAttribute(name) {
    return name in this.attrs
  }

  getBoundingClientRect() {
    return this.attrs.hidden !== undefined || this.type === 'hidden'
      ? { width: 0, height: 0 }
      : { width: 200, height: 40 }
  }

  closest(selector) {
    let node = this
    while (node) {
      if (matches(node, selector)) return node
      node = node.parentElement
    }
    return null
  }

  contains(node) {
    let walk = node
    while (walk) {
      if (walk === this) return true
      walk = walk.parentElement
    }
    return false
  }

  // Every part of a comma list is either scoped to the direct children or not.
  // The extractors never mix the two in one selector, so this does not try to.
  querySelectorAll(selector) {
    const parts = selector.split(',').map((one) => one.trim())
    const candidates = parts.every((one) => SCOPE_CHILD.test(one))
      ? this.children.filter((child) => typeof child !== 'string')
      : descendants(this)
    const unscoped = parts.map((one) => one.replace(SCOPE_CHILD, '')).join(',')
    return candidates.filter((node) => matches(node, unscoped))
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null
  }
}

/**
 * Build one element.
 *
 * @param {string} tag
 * @param {object} [attrs]
 * @param {(MiniElement|string)[]} [children]
 * @returns {MiniElement}
 */
export const el = (tag, attrs = {}, children = []) =>
  new MiniElement(tag, attrs, children)

/**
 * Install a document built from one `main` element, and remove it afterwards.
 *
 * The extractors read `document`, `CSS` and `location`, so those are the three
 * globals this puts in place.
 *
 * @param {MiniElement} main
 * @param {object} [page] - What the page-level fields of the model read from
 * @param {string} [page.title]
 * @param {string} [page.pathname]
 * @param {string} [page.search]
 * @returns {() => void} Call it to take the document back down
 */
export const installDocument = (
  main,
  { title = '', pathname = '/', search = '' } = {}
) => {
  const body = el('body', {}, [main])
  const document = {
    body,
    title,
    querySelector: (selector) =>
      matches(body, selector) ? body : body.querySelector(selector),
    querySelectorAll: (selector) => body.querySelectorAll(selector),
    getElementById: (id) => body.querySelector(`[id="${id}"]`)
  }
  const previous = {
    document: globalThis.document,
    CSS: globalThis.CSS,
    location: globalThis.location
  }
  globalThis.document = document
  globalThis.CSS = { escape: (value) => String(value) }
  globalThis.location = { pathname, search }
  return () => {
    globalThis.document = previous.document
    globalThis.CSS = previous.CSS
    globalThis.location = previous.location
  }
}
