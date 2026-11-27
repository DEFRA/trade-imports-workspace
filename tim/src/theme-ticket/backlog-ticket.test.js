import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { backlogTicketBesideFolder, backlogTicketOf } from './backlog-ticket.js'

let root

afterEach(() => root && rmSync(root, { recursive: true, force: true }))

const workareaWith = (backlog) => {
  root = mkdtempSync(join(tmpdir(), 'tim-backlog-ticket-'))
  mkdirSync(join(root, 'tickets', 'animals'), { recursive: true })
  if (backlog !== undefined) {
    writeFileSync(join(root, 'backlog.json'), JSON.stringify(backlog))
  }
  return root
}

describe('#backlogTicketOf', () => {
  test('Should return the ticket the backlog names', () => {
    expect(backlogTicketOf(workareaWith({ ticket: 'EUDPA-9' }))).toBe('EUDPA-9')
  })

  test('Should return null for a backlog that names no ticket', () => {
    expect(backlogTicketOf(workareaWith({ repos: {} }))).toBeNull()
  })

  test('Should return null for a workarea with no backlog', () => {
    expect(backlogTicketOf(workareaWith(undefined))).toBeNull()
  })
})

describe('#backlogTicketBesideFolder', () => {
  test('Should return the ticket of the backlog beside the tickets folder', () => {
    const workarea = workareaWith({ ticket: 'EUDPA-9' })

    expect(
      backlogTicketBesideFolder(join(workarea, 'tickets', 'animals'))
    ).toBe('EUDPA-9')
  })

  test('Should return null for a folder that is not under a tickets folder', () => {
    const workarea = workareaWith({ ticket: 'EUDPA-9' })

    expect(backlogTicketBesideFolder(workarea)).toBeNull()
  })
})
