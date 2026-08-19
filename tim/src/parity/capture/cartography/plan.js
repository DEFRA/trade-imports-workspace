import {
  deriveValue,
  describe,
  firstUsableOption,
  isExclusive,
  dateDirection,
  dateParts,
  formatDate,
  RUNGS
} from './values.js'

const MIME_BY_EXTENSION = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg'
}

/**
 * The mime type a file input says it wants.
 *
 * Upload journeys sniff the bytes, so a buffer with the wrong header is
 * rejected for a reason the map would otherwise pin on the field rather than
 * on the file the crawler invented.
 *
 * @param {string} [accept]
 * @returns {{mimeType: string, extension: string}}
 */
export const acceptedFile = (accept) => {
  const first = (accept ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .find(Boolean)
  if (!first) return { mimeType: 'application/pdf', extension: 'pdf' }
  if (first.startsWith('.')) {
    const extension = first.slice(1)
    return {
      mimeType: MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
      extension
    }
  }
  const extension =
    Object.entries(MIME_BY_EXTENSION).find(([, mime]) => mime === first)?.[0] ??
    first.split('/')[1]
  return { mimeType: first, extension }
}

const record = (control, derived, extra = {}) => ({
  name: control.name,
  kind: control.kind,
  label: control.label ?? control.legend ?? null,
  valueUsed: derived.value,
  rung: derived.rung,
  confidence: derived.confidence,
  why: derived.why,
  ...extra
})

const planRadios = ({ control, derived, caps, out }) => {
  if (!derived.value) {
    out.unfilled.push({ name: control.name, why: derived.why })
    return
  }
  const chosen = control.options.find(
    (option) => String(option.value) === derived.value
  )
  out.actions.push({ kind: 'choose', name: control.name, value: derived.value })
  out.records.push(
    record(control, derived, { reveals: Boolean(chosen?.conditional) })
  )
  if (chosen?.conditional) {
    out.reveals.push({ control: control.name, value: derived.value })
  }

  const alternatives = control.options.filter(
    (option) =>
      String(option.value ?? '').length &&
      String(option.value) !== derived.value
  )
  alternatives.forEach((option, index) => {
    out.branches.push({
      kind: 'radio-option',
      control: control.name,
      value: String(option.value),
      label: option.label ?? String(option.value),
      capped: index >= caps.variantsPerRoute - 1
    })
  })
}

const planCheckboxes = ({ control, out }) => {
  const chosen = firstUsableOption(control.options)
  if (!chosen) {
    out.unfilled.push({
      name: control.name,
      why: 'every checkbox on this page is an exclusive or negative option'
    })
    return
  }
  out.actions.push({
    kind: 'choose',
    name: control.name,
    value: String(chosen.value)
  })
  out.records.push(
    record(control, {
      value: String(chosen.value),
      rung: RUNGS.ENUMERATED,
      confidence: 'high',
      why: `one box ticked: "${chosen.label ?? chosen.value}"`
    })
  )

  for (const option of control.options) {
    if (String(option.value) === String(chosen.value)) continue
    out.branches.push({
      kind: isExclusive(option) ? 'exclusive-option' : 'checkbox-option',
      control: control.name,
      value: String(option.value),
      label: option.label ?? String(option.value),
      capped: false
    })
  }
  if (control.options.filter((option) => !isExclusive(option)).length > 1) {
    out.branches.push({
      kind: 'multiple',
      control: control.name,
      value: null,
      label: 'two boxes ticked rather than one',
      capped: false
    })
  }
}

const planSelect = ({ control, derived, caps, out }) => {
  if (!derived.value) {
    out.unfilled.push({ name: control.name, why: derived.why })
    return
  }
  const chosen = control.options.find(
    (option) => String(option.value) === derived.value
  )
  out.actions.push(
    control.widget === 'accessible-autocomplete'
      ? {
          kind: 'typeahead',
          name: control.name,
          value: derived.value,
          label: chosen?.label ?? derived.value,
          widget: { shape: 'accessible-autocomplete' }
        }
      : { kind: 'select', name: control.name, value: derived.value }
  )
  out.records.push(record(control, derived))

  control.options
    .filter(
      (option) =>
        String(option.value ?? '').length &&
        String(option.value) !== derived.value
    )
    .slice(0, 2)
    .forEach((option) => {
      out.branches.push({
        kind: 'select-option',
        control: control.name,
        value: String(option.value),
        label: option.label ?? String(option.value),
        capped: false
      })
    })
  if (control.options.length > caps.variantsPerRoute + 1) {
    out.branches.push({
      kind: 'select-option',
      control: control.name,
      value: null,
      label: `${control.options.length - 3} further options`,
      capped: true
    })
  }
}

const planDate = ({ control, hints, routeTemplate, today, out }) => {
  const direction = dateDirection(describe(control))
  const parts = dateParts(direction, today)
  const derived = deriveValue({ control, hints, routeTemplate, today })

  if (control.shape === 'three-inputs') {
    for (const part of ['day', 'month', 'year']) {
      const field = control.parts?.[part]
      if (!field) continue
      out.actions.push({ kind: 'fill', name: field.name, value: parts[part] })
    }
    out.records.push(
      record(control, {
        value: `${parts.day}/${parts.month}/${parts.year}`,
        rung: RUNGS.TYPED,
        confidence: 'low',
        why: `three-box date, and the wording puts it in the ${direction === 'today' ? 'present' : direction}`
      })
    )
    return
  }

  // The picker's calendar overlays whatever control comes next, so it is shut
  // in the same step that fills it. Without that the next control is
  // unreachable and the branch dies for a reason nobody can see.
  out.actions.push({
    kind: 'fill',
    name: control.name,
    value: derived.value ?? formatDate(parts, control.hint),
    dismissOverlay: control.shape === 'picker'
  })
  out.records.push(record(control, derived))
}

const planTypeahead = ({ control, derived, out }) => {
  if (!derived.value) {
    out.unfilled.push({ name: control.name, why: derived.why })
    return
  }
  out.actions.push({
    kind: 'typeahead',
    name: control.name,
    value: derived.value,
    label: derived.value,
    widget: control.widget
  })
  out.records.push(record(control, derived))
}

const planFile = ({ control, out }) => {
  const file = acceptedFile(control.accept)
  out.actions.push({
    kind: 'upload',
    name: control.name,
    fileName: `cartographer.${file.extension}`,
    mimeType: file.mimeType
  })
  out.records.push(
    record(control, {
      value: `cartographer.${file.extension}`,
      rung: RUNGS.TYPED,
      confidence: 'low',
      why: `synthesised to match accept="${control.accept ?? 'anything'}"`
    })
  )
}

/**
 * Work out what to do with every control on one screen.
 *
 * Returns four things and never fewer: the actions to perform, the record of
 * what was filled and why, the choices not taken so they can be explored later,
 * and the fields nothing could fill. The last two are the honest half — a
 * crawler that returns only the first two produces a map that looks complete
 * because it has forgotten what it skipped.
 *
 * @param {object} args
 * @param {object[]} args.controls - Descriptors from the control extractor
 * @param {object} [args.hints]
 * @param {string} [args.routeTemplate]
 * @param {Date} [args.today]
 * @param {{variantsPerRoute: number}} [args.caps]
 * @returns {{actions: object[], records: object[], branches: object[], unfilled: object[], reveals: string[]}}
 */
export const planScreen = ({
  controls,
  hints,
  routeTemplate,
  today = new Date(),
  caps = { variantsPerRoute: 3 }
}) => {
  const out = {
    actions: [],
    records: [],
    branches: [],
    unfilled: [],
    reveals: []
  }

  for (const control of controls ?? []) {
    if (control.kind === 'hidden') continue
    if (control.visible === false) continue
    if (control.answered) continue
    if (control.kind !== 'checkboxes' && control.value) continue

    const derived = deriveValue({ control, hints, routeTemplate, today })

    switch (control.kind) {
      case 'radios':
        planRadios({ control, derived, caps, out })
        break
      case 'checkboxes':
        planCheckboxes({ control, out })
        break
      case 'select':
        planSelect({ control, derived, caps, out })
        break
      case 'date':
        planDate({ control, hints, routeTemplate, today, out })
        break
      case 'typeahead':
        planTypeahead({ control, derived, out })
        break
      case 'file':
        planFile({ control, out })
        break
      default:
        if (!derived.value) {
          out.unfilled.push({ name: control.name, why: derived.why })
          break
        }
        out.actions.push({
          kind: 'fill',
          name: control.name,
          value: derived.value
        })
        out.records.push(record(control, derived))
    }
  }

  return out
}
