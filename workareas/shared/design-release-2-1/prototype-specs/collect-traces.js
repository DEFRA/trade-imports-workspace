// After a run: copy every trace zip into ../sources/traces-prototype/ as
// <spec>--<test-slug>.zip with an index.json, and write the evidence index
// ../evidence/prototype/index.json from the screenshots the specs captured.
const fs = require('fs')
const path = require('path')

const root = __dirname
const resultsFile = path.join(root, 'test-results', 'results.json')
const metaDir = path.join(root, 'test-results', 'meta')
const tracesDir = path.join(root, '..', 'sources', 'traces-prototype')
const evidenceDir = path.join(root, '..', 'evidence', 'prototype')
const keep = process.env.KEEP_EVIDENCE === '1'

function slugify (value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}

function readMeta () {
  const byId = new Map()
  if (!fs.existsSync(metaDir)) return byId
  for (const file of fs.readdirSync(metaDir)) {
    if (!file.endsWith('.json')) continue
    const meta = JSON.parse(fs.readFileSync(path.join(metaDir, file), 'utf8'))
    byId.set(meta.testId, meta)
  }
  return byId
}

function collectTests (suite, titles, out) {
  const nextTitles = suite.title && !suite.title.endsWith('.js') ? [...titles, suite.title] : titles
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const result = (t.results || [])[t.results.length - 1] || {}
      out.push({
        id: spec.id,
        file: spec.file,
        title: [...nextTitles, spec.title].join(' › '),
        status: result.status || 'unknown',
        trace: (result.attachments || []).find((a) => a.name === 'trace' && a.path)
      })
    }
  }
  for (const child of suite.suites || []) collectTests(child, nextTitles, out)
}

function writeTraces () {
  if (!fs.existsSync(resultsFile)) {
    console.log('collect: no results.json, skipping traces')
    return
  }
  const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'))
  const tests = []
  for (const suite of results.suites || []) collectTests(suite, [], tests)
  const meta = readMeta()

  fs.mkdirSync(tracesDir, { recursive: true })
  const indexFile = path.join(tracesDir, 'index.json')
  let index = []
  if (keep && fs.existsSync(indexFile)) {
    index = JSON.parse(fs.readFileSync(indexFile, 'utf8'))
  } else {
    for (const file of fs.readdirSync(tracesDir)) {
      if (file.endsWith('.zip')) fs.rmSync(path.join(tracesDir, file))
    }
  }

  let copied = 0
  for (const t of tests) {
    if (!t.trace || !fs.existsSync(t.trace.path)) continue
    const spec = path.basename(t.file).replace(/\.fit\.spec\.js$/, '')
    const file = `${spec}--${slugify(t.title)}.zip`
    fs.copyFileSync(t.trace.path, path.join(tracesDir, file))
    copied += 1
    index = index.filter((entry) => entry.file !== file)
    index.push({
      file,
      spec,
      test: t.title,
      status: t.status,
      pages: (meta.get(t.id) || {}).pages || []
    })
  }
  index.sort((a, b) => a.file.localeCompare(b.file))
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n')
  console.log(`collect: ${copied} trace(s) copied, ${index.length} in ${path.relative(root, indexFile)}`)
}

function writeEvidenceIndex () {
  fs.mkdirSync(evidenceDir, { recursive: true })
  const indexFile = path.join(evidenceDir, 'index.json')
  const byFile = new Map()
  if (keep && fs.existsSync(indexFile)) {
    for (const entry of JSON.parse(fs.readFileSync(indexFile, 'utf8'))) byFile.set(entry.file, entry)
  }
  const capturesFile = path.join(metaDir, 'captures.jsonl')
  if (fs.existsSync(capturesFile)) {
    for (const line of fs.readFileSync(capturesFile, 'utf8').split('\n')) {
      if (!line.trim()) continue
      const entry = JSON.parse(line)
      // capture() writes each page state once per run, so this run's record wins.
      byFile.set(entry.file, entry)
    }
  }
  const index = [...byFile.values()]
    .filter((entry) => fs.existsSync(path.join(evidenceDir, entry.file)))
    .sort((a, b) => a.file.localeCompare(b.file))
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n')
  console.log(`collect: ${index.length} screenshot(s) in ${path.relative(root, indexFile)}`)
}

writeTraces()
writeEvidenceIndex()
