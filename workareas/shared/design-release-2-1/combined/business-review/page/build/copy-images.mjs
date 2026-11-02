import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pageDir = path.resolve(here, '..')
const reviewDir = path.resolve(pageDir, '..')
const workarea = path.resolve(reviewDir, '..', '..')

const sources = {
  after: path.join(reviewDir, 'screens', 'after'),
  before: path.join(reviewDir, 'screens', 'before'),
  proto: path.join(workarea, 'evidence', 'prototype')
}

const list = JSON.parse(fs.readFileSync(path.join(here, 'img-list.json'), 'utf8'))
const stats = {}

for (const side of Object.keys(sources)) {
  const target = path.join(pageDir, 'img', side)
  fs.mkdirSync(target, { recursive: true })
  const wanted = new Set(list.filter((item) => item.side === side).map((item) => item.file))
  for (const existing of fs.readdirSync(target)) {
    if (!wanted.has(existing)) fs.unlinkSync(path.join(target, existing))
  }
  let count = 0
  let bytes = 0
  for (const file of wanted) {
    const from = path.join(sources[side], file)
    if (!fs.existsSync(from)) {
      console.log('missing source:', side, file)
      continue
    }
    fs.copyFileSync(from, path.join(target, file))
    count += 1
    bytes += fs.statSync(from).size
  }
  stats[side] = { images: count, megabytes: Number((bytes / 1024 / 1024).toFixed(2)) }
}

console.log(JSON.stringify(stats))
