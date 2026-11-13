import { markWorkspaceRoot } from './workspace-marker.js'
import { execa } from 'execa'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const TIM_CLI_PATH = fileURLToPath(new URL('../cli.js', import.meta.url))

export const createCliWorkspace = (prefix) => {
  const root = mkdtempSync(join(tmpdir(), prefix))
  markWorkspaceRoot(root)
  mkdirSync(join(root, 'repos'))
  return root
}

export const runTimInWorkspace = (workspaceRoot, args, { env = {} } = {}) =>
  execa('node', [TIM_CLI_PATH, '--workspace', workspaceRoot, ...args], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1', ...env }
  })

export const envelopeOf = (run) => JSON.parse(run.stdout.trim())
