import { existsSync, readFileSync, statSync } from 'node:fs'

export const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

export const textFieldOf = (file, field) => {
  if (!existsSync(file)) return ''
  const value = JSON.parse(readFileSync(file, 'utf8'))[field]
  if (value === null || value === undefined || value === false) return ''
  return String(value)
}
