import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const backlogPathIn = (workspaceRoot, workarea) =>
  join(workspaceRoot, 'workareas', workarea, 'backlog.json')

export const writeBacklogRows = (workspaceRoot, workarea, rows) => {
  const path = backlogPathIn(workspaceRoot, workarea)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ programme: 'demo', increments: rows }))
}

export const readBacklogRows = (workspaceRoot, workarea) =>
  JSON.parse(readFileSync(backlogPathIn(workspaceRoot, workarea), 'utf8'))
    .increments
