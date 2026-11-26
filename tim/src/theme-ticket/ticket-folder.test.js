import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isFolder, textFieldOf } from './ticket-folder.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const tempFolder = () => {
  root = mkdtempSync(join(tmpdir(), 'tim-ticket-folder-'))
  return root
}

const jsonFileIn = (folder, content) => {
  const file = join(folder, 'ticket.json')
  writeFileSync(file, JSON.stringify(content))
  return file
}

describe('#isFolder', () => {
  test('is true for a folder', () => {
    expect(isFolder(tempFolder())).toBe(true)
  })

  test('is false for a file', () => {
    const file = jsonFileIn(tempFolder(), {})

    expect(isFolder(file)).toBe(false)
  })

  test('is false for a path that does not exist', () => {
    expect(isFolder(join(tempFolder(), 'missing'))).toBe(false)
  })
})

describe('#textFieldOf', () => {
  test('returns the field value as text', () => {
    const file = jsonFileIn(tempFolder(), { key: 'EUDPA-9' })

    expect(textFieldOf(file, 'key')).toBe('EUDPA-9')
  })

  test('returns an empty string for a missing file', () => {
    expect(textFieldOf(join(tempFolder(), 'missing.json'), 'key')).toBe('')
  })

  test('returns an empty string for a field that is null', () => {
    const file = jsonFileIn(tempFolder(), { key: null })

    expect(textFieldOf(file, 'key')).toBe('')
  })

  test('returns an empty string for a field that is false', () => {
    const file = jsonFileIn(tempFolder(), { key: false })

    expect(textFieldOf(file, 'key')).toBe('')
  })
})
