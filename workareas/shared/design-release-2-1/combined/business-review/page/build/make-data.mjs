import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pageDir = path.resolve(here, '..')
const reviewDir = path.resolve(pageDir, '..')
const workarea = path.resolve(reviewDir, '..', '..')

const cardsFile = path.join(reviewDir, 'cards.json')
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

const cards = readJson(cardsFile, null)
if (!cards) throw new Error('cannot read ' + cardsFile)
const extras = readJson(path.join(here, 'extra-questions.json'), { code: [], engineering: [] })
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
      reason: side === 'before' ? 'the main-branch screens have not been taken yet' : 'the screens have not been taken yet'
    }
  }
  return { state: 'not-captured', reason: 'this screen is not in the capture' }
}

function buildShot(keyOrShot) {
  const key = typeof keyOrShot === 'string' ? keyOrShot : keyOrShot.key
  const meta = shotMetaByKey.get(key) || (typeof keyOrShot === 'object' ? keyOrShot : {})
  const compare = meta.compare || 'before-and-after'
  if (!shotMetaByKey.has(key)) warnings.push('shot has no description in cards.json: ' + key)
  return {
    key,
    page: meta.page || key,
    state: meta.state || '',
    compare,
    before: sideOf('before', key, compare, Boolean(beforeManifest), beforeByKey.get(key)),
    after: sideOf('after', key, compare, Boolean(afterManifest), afterByKey.get(key))
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

const groups = cards.groups.map((group) => ({
  name: group.name,
  cards: group.cards.map((card) => ({
    id: card.id,
    group: group.name,
    title: card.title,
    whatChanged: card.whatChanged,
    services: card.services || [],
    rows: card.rows || [],
    rulings: card.rulings || [],
    proto: (card.prototypeScreens || []).map(buildProto).filter(Boolean),
    shots: (card.shots || []).map(buildShot)
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
    if (card) card.services.forEach((s) => found.add(s))
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
    cards: q.cards || []
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
  if (SAM_CHECKS.includes(q.id) || q.id === 'q-hmrc-new-tab') continue
  questions.push(buildQuestion(q, 'other'))
}
for (const q of extras.engineering || []) questions.push(buildQuestion(q, 'engineering'))

const data = {
  builtOn: new Date().toISOString().slice(0, 10),
  hasBefore: Boolean(beforeManifest),
  about: { before: cards.about.before, after: cards.about.after, capture: cards.about.capture },
  paths: {
    cards: 'workareas/shared/design-release-2-1/combined/business-review/cards.json',
    harness: 'workareas/shared/design-release-2-1/combined/business-review/capture/'
  },
  groups,
  questions
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
const placeholders = { 'before:not-on-main': 0, 'before:not-captured': 0, 'after:not-captured': 0 }
for (const g of groups) {
  for (const c of g.cards) {
    for (const s of c.shots) {
      if (s.before.state !== 'ok') placeholders['before:' + s.before.state] = (placeholders['before:' + s.before.state] || 0) + 1
      if (s.after.state !== 'ok') placeholders['after:' + s.after.state] = (placeholders['after:' + s.after.state] || 0) + 1
    }
  }
}
console.log('placeholders', JSON.stringify(placeholders))
for (const w of warnings) console.log('warning:', w)
