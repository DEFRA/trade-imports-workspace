import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pageDir = path.resolve(here, '..')
const reviewDir = path.resolve(pageDir, '..')
const workarea = path.resolve(reviewDir, '..', '..')
const rewriteDir = path.join(workarea, 'combined', 'rewrite')

const cardsFile = path.join(reviewDir, 'cards.json')
const templatesFile = path.join(reviewDir, 'cards-templates.json')
const afterDir = path.join(reviewDir, 'screens', 'after')
const beforeDir = path.join(reviewDir, 'screens', 'before')
const protoDir = path.join(workarea, 'evidence', 'prototype')

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

const baseCards = readJson(cardsFile, null)
if (!baseCards) throw new Error('cannot read ' + cardsFile)
const templateCards = readJson(templatesFile, null)
if (!templateCards) throw new Error('cannot read ' + templatesFile)
const extras = readJson(path.join(here, 'extra-questions.json'), { code: [], engineering: [] })

const REWRITE_FILES = [
  ...Array.from({ length: 12 }, (_, i) => 'business-group-' + (i + 1) + '.json'),
  'business-questions.json',
  'business-templates.json'
]

const rewriteLog = { applied: 0, alreadyApplied: 0, failed: [] }

function entitiesOf(source) {
  const name = path.basename(source)
  const map = new Map()
  if (name === 'cards.json' || name === 'cards-templates.json') {
    const data = name === 'cards.json' ? baseCards : templateCards
    for (const group of data.groups) for (const card of group.cards) map.set(card.id, card)
    for (const q of data.openQuestions || []) map.set(q.id, q)
  } else if (name === 'extra-questions.json') {
    for (const q of [...(extras.code || []), ...(extras.engineering || [])]) map.set(q.id, q)
  }
  return map
}

const squash = (text) => String(text).replace(/\s+/g, ' ').trim()

function applyRewriteItem(file, item) {
  const label = file + ' ' + item.id + ' ' + item.field
  const entity = entitiesOf(item.source).get(item.id)
  if (!entity) {
    rewriteLog.failed.push(label + ': no such id in ' + item.source)
    return
  }
  let holder = entity
  let key = item.field
  const rowMatch = /^rows\[(.+)\]\.title$/.exec(item.field)
  if (rowMatch) {
    holder = (entity.rows || []).find((row) => row && row.id === rowMatch[1])
    key = 'title'
    if (!holder) {
      rewriteLog.failed.push(label + ': no such row')
      return
    }
  }
  const current = holder[key]
  if (typeof current !== 'string') {
    rewriteLog.failed.push(label + ': field is not text')
    return
  }
  if (current === item.after) {
    rewriteLog.alreadyApplied++
    return
  }
  if (current !== item.before && squash(current) !== squash(item.before)) {
    rewriteLog.failed.push(label + ': the source no longer says the "before" text')
    return
  }
  holder[key] = item.after
  rewriteLog.applied++
}

for (const file of REWRITE_FILES) {
  const chunk = readJson(path.join(rewriteDir, file), null)
  if (!chunk) {
    rewriteLog.failed.push(file + ': cannot read the chunk')
    continue
  }
  for (const item of chunk.items || []) applyRewriteItem(file, item)
}

const cards = {
  about: baseCards.about,
  groups: [...baseCards.groups, ...templateCards.groups],
  openQuestions: [
    ...(baseCards.openQuestions || []),
    ...(templateCards.openQuestions || []).map((q) => ({ ...q, templates: true }))
  ],
  shots: [...baseCards.shots, ...templateCards.shots]
}
const templateShotKeys = new Set(templateCards.shots.map((s) => s.key))

const afterManifest = readJson(path.join(afterDir, 'manifest.json'), null)
const beforeManifest = readJson(path.join(beforeDir, 'manifest.json'), null)
const protoIndex = readJson(path.join(protoDir, 'index.json'), [])

const indexBy = (list, key) => new Map((list || []).map((entry) => [entry[key], entry]))
const afterByKey = indexBy(afterManifest, 'key')
const beforeByKey = indexBy(beforeManifest, 'key')
const shotMetaByKey = indexBy(cards.shots, 'key')
const protoByFile = indexBy(protoIndex, 'file')

const rowTitles = new Map()
for (const group of cards.groups) {
  for (const card of group.cards) {
    for (const row of card.rows || []) rowTitles.set(row.id, row.title)
  }
}
const cardsById = new Map()
for (const group of cards.groups) {
  for (const card of group.cards) cardsById.set(card.id, card)
}

const SKIP_NOTES = new Set(['regions', 'links', 'rowLinkHref'])
const NOTE_LABELS = {
  backLinkHref: 'Back link goes to',
  landedOn: 'Landed on',
  runEndedOn: 'The run ended on',
  errorSummary: 'Error summary',
  deviation: 'Note',
  originCard: 'Origin card reads',
  rowText: 'List row reads',
  arrivalTask: 'Arrival task reads',
  portBoxValue: 'Port box holds',
  savedDate: 'Saved date',
  savedPort: 'Saved port',
  checkedRadios: 'Chosen',
  reachedBy: 'Reached by',
  documentError: 'Document error',
  healthCertificateUploaded: 'Health certificate uploaded',
  mentionsUnweaned: 'Mentions unweaned animals',
  stepsSkipped: 'Steps skipped',
  countryOptionCount: 'Number of countries listed'
}

function humanise(key) {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function clip(text, max) {
  const flat = String(text).replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat
}

function noteLines(notes) {
  const lines = []
  for (const [key, value] of Object.entries(notes || {})) {
    if (SKIP_NOTES.has(key) || value === null || value === undefined) continue
    const label = NOTE_LABELS[key] || humanise(key)
    if (Array.isArray(value)) {
      if (!value.length) continue
      if (/Options$/.test(key)) {
        lines.push({ label: humanise(key.replace(/Options$/, '')) + ' options listed', text: String(value.length) })
      } else if (value.length > 6) {
        lines.push({ label, text: value.length + ' entries' })
      } else if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
        lines.push({ label, text: clip(value.join('; '), 300) })
      }
    } else if (typeof value === 'boolean') {
      lines.push({ label, text: value ? 'Yes' : 'No' })
    } else if (typeof value === 'string' || typeof value === 'number') {
      lines.push({ label, text: clip(value, 300) })
    }
  }
  return lines
}

const imageList = []
const warnings = []

function fileExists(dir, file) {
  return Boolean(file) && fs.existsSync(path.join(dir, file))
}

function sideOf(side, key, compare, manifestPresent, entry) {
  const dir = side === 'before' ? beforeDir : afterDir
  const notOnMain = { state: 'not-on-main', reason: 'Not on main: this page or state did not exist before' }
  if (entry && entry.ok && fileExists(dir, entry.file)) {
    imageList.push({ side, file: entry.file })
    return { state: 'ok', file: entry.file, title: entry.title || '', url: entry.url || '', notes: noteLines(entry.notes) }
  }
  if (side === 'before' && compare === 'after-only') return notOnMain
  if (entry && !entry.ok) {
    const error = String(entry.error || 'no reason given')
    if (side === 'before' && /after-only|not on main|did not exist/i.test(error)) return notOnMain
    return { state: 'not-captured', reason: error }
  }
  if (entry && entry.ok) {
    warnings.push(side + ' image missing on disk: ' + entry.file)
    return { state: 'not-captured', reason: 'the picture file is missing' }
  }
  if (!manifestPresent) {
    return {
      state: 'not-captured',
      reason: side === 'before' ? 'we have not taken the main branch screens yet' : 'we have not taken the screens yet'
    }
  }
  return { state: 'not-captured', reason: 'this screen is not in the capture' }
}

function notTakenYet(side) {
  return side.state === 'not-captured' ? { state: 'not-taken' } : side
}

function buildShot(keyOrShot) {
  const key = typeof keyOrShot === 'string' ? keyOrShot : keyOrShot.key
  const meta = shotMetaByKey.get(key) || (typeof keyOrShot === 'object' ? keyOrShot : {})
  const compare = meta.compare || 'before-and-after'
  if (!shotMetaByKey.has(key)) warnings.push('shot has no description in cards.json: ' + key)
  const before = sideOf('before', key, compare, Boolean(beforeManifest), beforeByKey.get(key))
  const after = sideOf('after', key, compare, Boolean(afterManifest), afterByKey.get(key))
  const awaiting = templateShotKeys.has(key)
  return {
    key,
    page: meta.page || key,
    state: meta.state || '',
    compare,
    before: awaiting ? notTakenYet(before) : before,
    after: awaiting ? notTakenYet(after) : after
  }
}

function buildProto(file) {
  if (!fileExists(protoDir, file)) {
    warnings.push('prototype image missing: ' + file)
    return null
  }
  imageList.push({ side: 'proto', file })
  const entry = protoByFile.get(file) || {}
  return {
    file,
    heading: entry.heading || file.replace(/\.png$/, ''),
    state: entry.state && entry.state !== 'default' ? entry.state : ''
  }
}

const SPEC_FILES = [
  'spec-la-cya.json',
  'spec-la-flow-overview.json',
  'spec-la-pages-a.json',
  'spec-la-pages-b.json',
  'spec-la-other.json',
  'spec-la-templates.json',
  'spec-plants.json',
  'spec-ins.json'
]

const questionIds = new Set([
  ...(cards.openQuestions || []).map((q) => q.id),
  ...(extras.code || []).map((q) => q.id),
  ...(extras.engineering || []).map((q) => q.id)
])
const spec = []
const specByCard = new Map()
const seenSpec = new Set()
for (const file of SPEC_FILES) {
  const data = readJson(path.join(rewriteDir, file), null)
  if (!data) {
    warnings.push('cannot read spec file ' + file)
    continue
  }
  for (const change of data.changes || []) {
    const key = [change.capability, change.requirementId, change.change, change.requirementName].join('|')
    if (seenSpec.has(key)) {
      warnings.push('duplicate spec change skipped: ' + key)
      continue
    }
    seenSpec.add(key)
    const mapped = []
    const mappedQuestions = []
    for (const id of change.cards || []) {
      if (cardsById.has(id)) mapped.push(id)
      else if (questionIds.has(id)) mappedQuestions.push(id)
      else warnings.push('spec change ' + change.requirementId + ' maps to unknown card ' + id)
    }
    const index = spec.length
    spec.push({
      capability: change.capability || '',
      capabilityName: change.capabilityName || change.capability || 'Other',
      requirementId: change.requirementId || '',
      requirementName: change.requirementName || '',
      change: change.change || '',
      summary: change.summary || '',
      before: change.before || '',
      after: change.after || '',
      cards: mapped,
      questions: mappedQuestions
    })
    for (const id of [...mapped, ...mappedQuestions]) {
      if (!specByCard.has(id)) specByCard.set(id, [])
      specByCard.get(id).push(index)
    }
  }
}

const groups = cards.groups.map((group) => ({
  name: group.name,
  templates: templateCards.groups.includes(group),
  cards: group.cards.map((card) => ({
    id: card.id,
    group: group.name,
    title: card.title,
    whatChanged: card.whatChanged,
    services: card.services || [],
    rows: card.rows || [],
    rulings: card.rulings || [],
    proto: (card.prototypeScreens || []).map(buildProto).filter(Boolean),
    shots: (card.shots || []).map(buildShot),
    spec: specByCard.get(card.id) || []
  }))
}))

const SAM_CHECKS = [
  'q-opening-run-order',
  'q-soft-save-format',
  'q-amend-endings',
  'q-commodity-walk',
  'q-reason-walk',
  'q-review-structure',
  'q-commodity-card',
  'q-submitted-view'
]

function servicesOf(q) {
  if (q.services && q.services.length) return q.services
  const found = new Set()
  for (const id of q.cards || []) {
    const card = cardsById.get(id)
    if (card) (card.services || []).forEach((s) => found.add(s))
  }
  return [...found]
}

function buildQuestion(q, section) {
  for (const id of q.cards || []) {
    if (!cardsById.has(id)) warnings.push(q.id + ' links to unknown card ' + id)
  }
  return {
    id: q.id,
    section,
    kind: q.kind || 'question',
    label: q.label || '',
    title: q.title,
    question: q.question,
    asBuilt: q.asBuilt,
    link: q.link || '',
    services: servicesOf(q),
    rows: (q.rows || []).map((id) => ({ id: id, title: rowTitles.get(id) || '' })),
    cards: q.cards || [],
    spec: specByCard.get(q.id) || []
  }
}

const original = cards.openQuestions || []
const questions = []
for (const id of SAM_CHECKS) {
  const q = original.find((o) => o.id === id)
  if (q) questions.push(buildQuestion(q, 'sam'))
  else warnings.push('missing Sam check question ' + id)
}
for (const q of extras.code || []) questions.push(buildQuestion(q, 'code'))
const hmrc = original.find((o) => o.id === 'q-hmrc-new-tab')
if (hmrc) questions.push(buildQuestion(hmrc, 'code'))
for (const q of original) {
  if (SAM_CHECKS.includes(q.id) || q.id === 'q-hmrc-new-tab' || q.templates) continue
  questions.push(buildQuestion(q, 'other'))
}
for (const q of original) {
  if (q.templates) questions.push(buildQuestion(q, 'templates'))
}
for (const q of extras.engineering || []) questions.push(buildQuestion(q, 'engineering'))

const data = {
  builtOn: new Date().toISOString().slice(0, 10),
  hasBefore: Boolean(beforeManifest),
  about: { before: baseCards.about.before, after: baseCards.about.after, capture: baseCards.about.capture },
  paths: {
    cards: 'workareas/shared/design-release-2-1/combined/business-review/cards.json',
    cardsTemplates: 'workareas/shared/design-release-2-1/combined/business-review/cards-templates.json',
    harness: 'workareas/shared/design-release-2-1/combined/business-review/capture/'
  },
  groups,
  questions,
  spec
}

fs.writeFileSync(path.join(pageDir, 'data.js'), 'window.BR = ' + JSON.stringify(data) + ';\n')

const seen = new Set()
const unique = imageList.filter((item) => {
  const id = item.side + '/' + item.file
  if (seen.has(id)) return false
  seen.add(id)
  return true
})
fs.writeFileSync(path.join(here, 'img-list.json'), JSON.stringify(unique, null, 1) + '\n')

const cardCount = groups.reduce((n, g) => n + g.cards.length, 0)
const shotCount = groups.reduce((n, g) => n + g.cards.reduce((m, c) => m + c.shots.length, 0), 0)
console.log('cards', cardCount, 'questions', questions.length, 'shots', shotCount, 'hasBefore', data.hasBefore)
const perSide = {}
for (const item of unique) perSide[item.side] = (perSide[item.side] || 0) + 1
console.log('images referenced', JSON.stringify(perSide))
const placeholders = {}
for (const g of groups) {
  for (const c of g.cards) {
    for (const s of c.shots) {
      for (const side of ['before', 'after']) {
        if (s[side].state === 'ok') continue
        const tag = side + ':' + s[side].state
        placeholders[tag] = (placeholders[tag] || 0) + 1
      }
    }
  }
}
console.log('placeholders', JSON.stringify(placeholders))
const onCards = spec.filter((s) => s.cards.length || s.questions.length).length
console.log('spec changes', spec.length, 'on cards', onCards, 'other', spec.length - onCards)
console.log('rewrites applied', rewriteLog.applied, 'already applied', rewriteLog.alreadyApplied, 'failed', rewriteLog.failed.length)
for (const f of rewriteLog.failed) console.log('rewrite failed:', f)
for (const w of warnings) console.log('warning:', w)
