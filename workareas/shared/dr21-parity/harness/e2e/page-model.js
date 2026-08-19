//
// Extracts a normalised, diffable structural model of a rendered GDS page:
// headings, captions, field order, labels/hints, option lists, summary rows,
// task lists, buttons and links. Two prototypes rendered by different codebases
// produce comparable JSON, so a plain diff shows the UI/UX delta.
//
const fs = require('fs')
const path = require('path')

const EXTRACTOR = () => {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null)

  const main = document.querySelector('main') || document.body

  const closestLabelText = (input) => {
    if (input.id) {
      const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`)
      if (label) return text(label)
    }
    const wrapping = input.closest('label')
    return wrapping ? text(wrapping) : null
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
    const hint = group ? group.querySelector(':scope > .govuk-hint') : null
    return text(hint)
  }

  const OPTION_TYPES = new Set(['radio', 'checkbox'])

  const fieldsFrom = (scope) => {
    const out = []
    const seenGroups = new Set()

    scope.querySelectorAll('input, select, textarea').forEach((el) => {
      const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase()
      if (type === 'submit' || type === 'button') return

      if (OPTION_TYPES.has(type)) {
        const key = `${type}:${el.name}`
        if (seenGroups.has(key)) return
        seenGroups.add(key)
        const siblings = [...scope.querySelectorAll(`input[type="${type}"][name="${CSS.escape(el.name)}"]`)]
        const fieldset = el.closest('fieldset')
        out.push({
          kind: type === 'radio' ? 'radios' : 'checkboxes',
          name: el.name,
          legend: text(fieldset ? fieldset.querySelector('legend') : null),
          hint: hintFor(el.closest('.govuk-radios, .govuk-checkboxes') || el),
          options: siblings.map((s) => ({
            value: s.value,
            label: closestLabelText(s),
            hint: hintFor(s),
            conditional: !!(s.getAttribute('data-aria-controls') || s.getAttribute('aria-controls'))
          }))
        })
        return
      }

      if (type === 'hidden') {
        out.push({ kind: 'hidden', name: el.name })
        return
      }

      if (el.tagName.toLowerCase() === 'select') {
        out.push({
          kind: 'select',
          name: el.name,
          label: closestLabelText(el),
          hint: hintFor(el),
          options: [...el.options].map((o) => ({ value: o.value, label: text(o) }))
        })
        return
      }

      out.push({
        kind: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : `input:${type}`,
        name: el.name,
        label: closestLabelText(el),
        hint: hintFor(el),
        autocomplete: el.getAttribute('autocomplete') || null,
        inputmode: el.getAttribute('inputmode') || null
      })
    })

    return out
  }

  const summaryLists = [...main.querySelectorAll('.govuk-summary-list')].map((list) => ({
    card: text(list.closest('.govuk-summary-card')?.querySelector('.govuk-summary-card__title')),
    rows: [...list.querySelectorAll('.govuk-summary-list__row')].map((row) => ({
      key: text(row.querySelector('.govuk-summary-list__key')),
      value: text(row.querySelector('.govuk-summary-list__value')),
      actions: [...row.querySelectorAll('.govuk-summary-list__actions a')].map((a) => ({
        text: text(a),
        href: a.getAttribute('href')
      }))
    }))
  }))

  const taskLists = [...main.querySelectorAll('.govuk-task-list')].map((list) => ({
    items: [...list.querySelectorAll('.govuk-task-list__item')].map((item) => ({
      title: text(item.querySelector('.govuk-task-list__name-and-hint')),
      href: item.querySelector('a')?.getAttribute('href') || null,
      status: text(item.querySelector('.govuk-task-list__status'))
    }))
  }))

  // Bespoke card patterns (dashboard notification/template/glance cards) use
  // app-* classes and raw dl/dt/dd rather than a govuk-summary-list.
  const cards = [...main.querySelectorAll('article, .app-dr2-dashboard-glance-card, [class*="-card"]')]
    .filter((el, i, all) => all.indexOf(el) === i && !el.closest('[class*="-card"]:not(:scope)'))
    .map((card) => ({
      classes: card.className,
      headings: [...card.querySelectorAll('h2, h3, h4, p[class*="__category"], p[class*="__title"]')].map(text),
      fields: [...card.querySelectorAll('dt')].map((dt) => ({
        key: text(dt),
        value: text(dt.parentElement?.querySelector('dd') || dt.nextElementSibling)
      })),
      tags: [...card.querySelectorAll('.govuk-tag, [class*="status-text"]')].map(text),
      actions: [...card.querySelectorAll('a')].map((a) => ({ text: text(a), href: a.getAttribute('href') }))
    }))

  // The two codebases build the same UI concepts from different markup: the frontend
  // uses the govuk-frontend components, while the prototype's spine screens
  // (notification-hub, review-notification) use bespoke app-* structures. Comparing
  // `taskLists` to `taskLists` across sides therefore reads as "one side has no task
  // list at all", which is a false finding on the two most important screens.
  //
  // These three keys capture the concept rather than the component, so a diff
  // compares what the user sees rather than which macro rendered it.

  const uniqueNodes = (selector) => {
    const seen = new Set()
    for (const node of main.querySelectorAll(selector)) {
      if (![...seen].some((other) => other.contains(node))) seen.add(node)
    }
    return [...seen]
  }

  const taskItems = uniqueNodes(
    '.govuk-task-list__item, [class*="tasklist"] li, [class*="task-list"] li'
  ).map((item) => ({
    title: text(
      item.querySelector('.govuk-task-list__name-and-hint, [class*="__name"], [class*="__title"], a, h2, h3')
    ),
    href: item.querySelector('a')?.getAttribute('href') || null,
    status: text(item.querySelector('.govuk-task-list__status, .govuk-tag, [class*="status"]'))
  }))

  const summaryRows = [
    ...[...main.querySelectorAll('.govuk-summary-list__row')].map((row) => ({
      key: text(row.querySelector('.govuk-summary-list__key')),
      value: text(row.querySelector('.govuk-summary-list__value')),
      source: 'govuk-summary-list'
    })),
    // Raw definition lists outside a govuk-summary-list — the prototype's review cards.
    ...[...main.querySelectorAll('dl')]
      .filter((dl) => !dl.closest('.govuk-summary-list'))
      .flatMap((dl) =>
        [...dl.querySelectorAll('dt')].map((dt) => ({
          key: text(dt),
          value: text(dt.parentElement?.querySelector('dd') || dt.nextElementSibling),
          source: 'definition-list'
        }))
      )
  ]

  // Controls are not always inside a <form> — the prototype's dashboard sort select
  // sits outside one — so walking forms alone silently loses them.
  const allFields = fieldsFrom(main)

  const tables = [...main.querySelectorAll('table')].map((table) => ({
    caption: text(table.querySelector('caption')),
    head: [...table.querySelectorAll('thead th')].map(text),
    rowCount: table.querySelectorAll('tbody tr').length,
    firstRow: [...(table.querySelector('tbody tr')?.children || [])].map(text)
  }))

  return {
    url: location.pathname + location.search,
    title: document.title.replace(/\s+/g, ' ').trim(),
    h1: text(main.querySelector('h1')),
    caption: text(main.querySelector('.govuk-caption-xl, .govuk-caption-l, .govuk-caption-m')),
    backLink: text(document.querySelector('.govuk-back-link')),
    serviceNav: [...document.querySelectorAll('.govuk-service-navigation__link, .govuk-header__navigation-item a')]
      .map((a) => ({ text: text(a), href: a.getAttribute('href') })),
    phaseBanner: text(document.querySelector('.govuk-phase-banner__content')),
    notificationBanners: [...main.querySelectorAll('.govuk-notification-banner')].map((b) => ({
      title: text(b.querySelector('.govuk-notification-banner__title')),
      body: text(b.querySelector('.govuk-notification-banner__content'))
    })),
    errorSummary: {
      title: text(main.querySelector('.govuk-error-summary__title')),
      items: [...main.querySelectorAll('.govuk-error-summary__list li')].map(text)
    },
    headings: [...main.querySelectorAll('h1, h2, h3, h4')].map((h) => ({
      level: h.tagName.toLowerCase(),
      text: text(h)
    })),
    paragraphs: [...main.querySelectorAll('p.govuk-body, p.govuk-body-l, p.govuk-body-s')].map(text),
    insetText: [...main.querySelectorAll('.govuk-inset-text')].map(text),
    warningText: [...main.querySelectorAll('.govuk-warning-text__text')].map(text),
    details: [...main.querySelectorAll('.govuk-details')].map((d) => ({
      summary: text(d.querySelector('.govuk-details__summary-text')),
      body: text(d.querySelector('.govuk-details__text'))
    })),
    tags: [...main.querySelectorAll('.govuk-tag')].map((t) => ({
      text: text(t),
      classes: t.className.replace('govuk-tag', '').trim()
    })),
    forms: [...main.querySelectorAll('form')].map((form) => ({
      method: (form.getAttribute('method') || 'get').toLowerCase(),
      action: form.getAttribute('action'),
      fields: fieldsFrom(form),
      buttons: [...form.querySelectorAll('button, input[type="submit"]')].map((b) => ({
        text: text(b) || b.value,
        name: b.getAttribute('name'),
        value: b.getAttribute('value'),
        classes: b.className
      }))
    })),
    summaryLists,
    taskLists,
    taskItems,
    summaryRows,
    allFields,
    cards,
    tables,
    links: [...main.querySelectorAll('a')]
      .filter((a) => !a.classList.contains('govuk-back-link'))
      .map((a) => ({ text: text(a), href: a.getAttribute('href'), isButton: a.classList.contains('govuk-button') })),
    lists: [...main.querySelectorAll('ul.govuk-list, ol.govuk-list')].map((ul) =>
      [...ul.querySelectorAll(':scope > li')].map(text)
    )
  }
}

function outDir (subdir) {
  const dir = path.join(process.env.CAPTURE_DIR || path.join(__dirname, '..', 'capture'), subdir)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// Where the findings report keeps its evidence, and where the anchors it wants
// shot are declared. Adding element evidence to a finding is a data change
// there, not a spec change here — which is the point of anchors being data.
const EVIDENCE_ROOT = process.env.EVIDENCE_DIR ||
  path.join(process.env.HOME, 'git/defra/trade-imports-workspace/workareas/shared/dr21-parity/evidence')

const CROP_ANCESTORS = [
  '.govuk-form-group',
  'fieldset',
  '.govuk-radios',
  '.govuk-checkboxes',
  '.govuk-summary-list__row',
  '[class*="app-"][class*="card"]',
  '.govuk-details',
  '.govuk-inset-text',
  '.govuk-notification-banner',
  '.govuk-error-summary'
]
const CROP_PADDING = 24

let ANCHORS = null
function anchorsForScreen (name) {
  if (ANCHORS === null) {
    const file = path.join(EVIDENCE_ROOT, 'anchors.prototype.json')
    ANCHORS = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).screens || {} : {}
  }
  return ANCHORS[name] || []
}

// A crop of the bare input is not evidence — the label, the hint and the error
// are the finding — so walk up to the nearest container that holds all of it.
// Clipped in document coordinates rather than shot with locator.screenshot, so
// neighbours bleed in at the edges and the fragment reads as a place on a page.
async function captureAnchors (page, name) {
  const anchors = anchorsForScreen(name)
  if (anchors.length === 0) return []
  const dir = outDir('crop')
  const rows = []

  for (const anchor of anchors) {
    const locator = anchor.kind === 'field'
      ? page.locator(`[name="${anchor.name}"], [name^="${anchor.name}-"], [name^="${anchor.name}["]`)
      : page.getByLabel(anchor.text, { exact: false })

    const count = await locator.count()
    if (count === 0) {
      rows.push({ anchor: anchor.key, why: 'No element matched this anchor.' })
      continue
    }

    const box = await locator.first().evaluate((element, opts) => {
      const container = opts.ancestors.map((s) => element.closest(s)).find(Boolean) || element
      const rect = container.getBoundingClientRect()
      const pageWidth = document.documentElement.scrollWidth
      const pageHeight = document.documentElement.scrollHeight
      const x = Math.max(0, rect.left + window.scrollX - opts.padding)
      const y = Math.max(0, rect.top + window.scrollY - opts.padding)
      return {
        x,
        y,
        width: Math.min(rect.width + opts.padding * 2, pageWidth - x),
        height: Math.min(rect.height + opts.padding * 2, pageHeight - y)
      }
    }, { ancestors: CROP_ANCESTORS, padding: CROP_PADDING })

    if (box.width < 8 || box.height < 8) {
      rows.push({ anchor: anchor.key, why: 'The resolved element has no visible box.' })
      continue
    }

    const file = `${name}__${anchor.key}.png`
    await page.screenshot({
      path: path.join(dir, file),
      fullPage: true,
      clip: box,
      animations: 'disabled',
      caret: 'hide',
      scale: 'device'
    })
    rows.push({ anchor: anchor.key, kind: anchor.kind, file: `crop/${file}`, matched: count, why: anchor.why || null })
  }

  return rows
}

// Captures one screen: normalised model JSON, raw HTML and a full-page PNG.
async function capture (page, name) {
  const model = await page.evaluate(EXTRACTOR)
  fs.writeFileSync(path.join(outDir('model'), `${name}.json`), `${JSON.stringify(model, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir('html'), `${name}.html`), await page.content())
  // 'page', not 'screens': both sides' capture directories have to have the
  // same shape, or the report needs a special case per side and the manifest
  // stops being the only index.
  await page.screenshot({
    path: path.join(outDir('page'), `${name}.png`),
    fullPage: true,
    // Two runs at the same commit have to produce the same bytes, or the
    // report's changed-since-curation ribbon fires on every rebuild and stops
    // being read.
    animations: 'disabled',
    caret: 'hide',
    scale: 'device'
  })
  await captureAnchors(page, name)
  return model
}

// EXTRACTOR is exported so the frontend miner can run the identical extraction over
// a DOM recovered from a Playwright trace. Both sides of the parity diff must come
// from one definition, or the diff measures the extractors rather than the pages.
module.exports = { capture, EXTRACTOR }
