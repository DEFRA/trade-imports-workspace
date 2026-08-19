/* global CSS */

/**
 * Everything about a page's controls that decides what to type into them.
 *
 * Separate from the page model on purpose. The page model is a contract with
 * the differ — both sides run it, both sides' output is compared, and adding
 * keys to it makes every stored model churn. This reads the same DOM for a
 * different purpose: constraints (`pattern`, `min`, `maxlength`, `accept`), the
 * shapes GDS builds out of several inputs (a three-box date, a picker, a
 * type-ahead), and whether a control is reachable at all.
 *
 * It runs in the browser, so it has no imports and closes over nothing.
 *
 * @returns {object[]}
 */
export const CONTROL_EXTRACTOR = () => {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null)

  const labelFor = (input) => {
    if (input.id) {
      const label = document.querySelector(
        `label[for="${CSS.escape(input.id)}"]`
      )
      if (label) return text(label)
    }
    const wrapping = input.closest('label')
    return wrapping ? text(wrapping) : null
  }

  const legendFor = (el) => {
    const fieldset = el.closest('fieldset')
    return fieldset ? text(fieldset.querySelector('legend')) : null
  }

  const hintFor = (el) => {
    const described = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .filter((node) => node.classList.contains('govuk-hint'))
    if (described.length) return described.map(text).join(' ')
    const group = el.closest('.govuk-form-group')
    const hint = group ? group.querySelector('.govuk-hint') : null
    return text(hint)
  }

  const number = (el, attribute) => {
    const raw = el.getAttribute(attribute)
    return raw === null || raw === '' ? null : Number(raw)
  }

  const visible = (el) => {
    const rect = el.getBoundingClientRect()
    if (el.type === 'hidden') return false
    return rect.width > 0 || rect.height > 0
  }

  const main = document.querySelector('main') || document.body
  const out = []
  const seenGroups = new Set()

  const datePartOf = (name) => {
    const match = /^(.*?)[-_](day|month|year)$/i.exec(name || '')
    return match ? { stem: match[1], part: match[2].toLowerCase() } : null
  }

  // A select the accessible-autocomplete has enhanced is hidden, but its
  // options are still the legal values. Reading them turns the hardest control
  // kind into the easiest, with nothing guessed.
  const enhancedSelect = (el) =>
    el.closest('.autocomplete__wrapper') ||
    el.parentElement?.querySelector('.autocomplete__input')
      ? 'accessible-autocomplete'
      : null

  // The prototype's bespoke country search: a visible text box, a results
  // container of buttons, and a hidden input that carries the value the form
  // actually submits.
  const bespokeTypeahead = (el) => {
    const wrapper = el.closest('[class*="search"], [class*="autocomplete"]')
    if (!wrapper) return null
    const hidden = wrapper.querySelector('input[type="hidden"]')
    if (!hidden) return null
    const optionNode = wrapper.querySelector(
      '[class*="__option"], [role="option"]'
    )
    return {
      shape: 'bespoke',
      hiddenName: hidden.name,
      optionSelector: optionNode
        ? `.${[...optionNode.classList].join('.')}`
        : '[role="option"]'
    }
  }

  const dateGroups = new Map()

  for (const el of main.querySelectorAll('input, select, textarea')) {
    const tag = el.tagName.toLowerCase()
    const type = (el.getAttribute('type') || tag).toLowerCase()
    if (type === 'submit' || type === 'button') continue
    if (el.disabled) continue

    if (type === 'hidden') {
      out.push({ kind: 'hidden', name: el.name, visible: false })
      continue
    }

    if (type === 'radio' || type === 'checkbox') {
      const key = `${type}:${el.name}`
      if (seenGroups.has(key)) continue
      seenGroups.add(key)
      const siblings = [
        ...main.querySelectorAll(
          `input[type="${type}"][name="${CSS.escape(el.name)}"]`
        )
      ]
      out.push({
        kind: type === 'radio' ? 'radios' : 'checkboxes',
        name: el.name,
        legend: legendFor(el),
        hint: hintFor(el.closest('.govuk-radios, .govuk-checkboxes') || el),
        required: el.required,
        answered: siblings.some((sibling) => sibling.checked),
        visible: siblings.some(visible),
        options: siblings.map((sibling) => ({
          value: sibling.value,
          label: labelFor(sibling),
          hint: hintFor(sibling),
          checked: sibling.checked,
          exclusive: sibling.getAttribute('data-behaviour') === 'exclusive',
          conditional: Boolean(
            sibling.getAttribute('data-aria-controls') ||
            sibling.getAttribute('aria-controls')
          )
        }))
      })
      continue
    }

    if (tag === 'select') {
      out.push({
        kind: 'select',
        name: el.name,
        label: labelFor(el),
        legend: legendFor(el),
        hint: hintFor(el),
        required: el.required,
        value: el.value,
        visible: visible(el),
        widget: enhancedSelect(el),
        options: [...el.options].map((option) => ({
          value: option.value,
          label: text(option)
        }))
      })
      continue
    }

    const shared = {
      name: el.name,
      id: el.id || null,
      label: labelFor(el),
      legend: legendFor(el),
      hint: hintFor(el),
      type,
      inputmode: el.getAttribute('inputmode'),
      autocomplete: el.getAttribute('autocomplete'),
      pattern: el.getAttribute('pattern'),
      placeholder: el.getAttribute('placeholder'),
      min: el.getAttribute('min'),
      max: el.getAttribute('max'),
      maxlength: number(el, 'maxlength'),
      minlength: number(el, 'minlength'),
      required: el.required,
      value: el.value,
      visible: visible(el)
    }

    if (type === 'file') {
      out.push({ ...shared, kind: 'file', accept: el.getAttribute('accept') })
      continue
    }

    if (tag === 'textarea') {
      out.push({ ...shared, kind: 'textarea' })
      continue
    }

    const typeahead = bespokeTypeahead(el)
    if (typeahead) {
      out.push({ ...shared, kind: 'typeahead', widget: typeahead })
      continue
    }

    const datePart = datePartOf(el.name)
    if (datePart && el.closest('fieldset')) {
      const group = dateGroups.get(datePart.stem) ?? {
        kind: 'date',
        name: datePart.stem,
        legend: legendFor(el),
        hint: hintFor(el),
        required: el.required,
        visible: visible(el),
        shape: 'three-inputs',
        parts: {}
      }
      group.parts[datePart.part] = { name: el.name, value: el.value }
      if (!dateGroups.has(datePart.stem)) {
        dateGroups.set(datePart.stem, group)
        out.push(group)
      }
      continue
    }

    if (el.closest('.moj-datepicker') || type === 'date') {
      out.push({
        ...shared,
        kind: 'date',
        shape: type === 'date' ? 'native' : 'picker'
      })
      continue
    }

    out.push({
      ...shared,
      kind: type === 'email' || type === 'number' ? type : 'text'
    })
  }

  return out
}
