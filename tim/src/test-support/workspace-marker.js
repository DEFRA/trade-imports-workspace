import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const markWorkspaceRoot = (root) =>
  mkdirSync(join(root, 'docs', 'best-practices'), { recursive: true })
