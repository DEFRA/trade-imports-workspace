const fs = require('fs')
const path = require('path')

// Each run regenerates the evidence screenshots and the per-test metadata, so a
// page state the suite no longer reaches cannot linger in the evidence set.
// A filtered run (--grep, a single spec) keeps the existing evidence.
module.exports = async function globalSetup () {
  const meta = path.join(__dirname, 'test-results', 'meta')
  fs.rmSync(meta, { recursive: true, force: true })

  if (process.env.KEEP_EVIDENCE === '1') return

  const evidence = path.join(__dirname, '..', 'evidence', 'prototype')
  if (fs.existsSync(evidence)) {
    for (const file of fs.readdirSync(evidence)) {
      if (file.endsWith('.png') || file === 'index.json') fs.rmSync(path.join(evidence, file))
    }
  }
}
