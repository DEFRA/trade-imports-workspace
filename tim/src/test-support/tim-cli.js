import { execa } from 'execa'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const TIM_CLI_PATH = fileURLToPath(new URL('../cli.js', import.meta.url))

/**
 * A temporary folder tim accepts as a workspace: a Makefile and an empty
 * repos/ folder.
 */
export const createCliWorkspace = (prefix) => {
  const root = mkdtempSync(join(tmpdir(), prefix))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(join(root, 'repos'))
  return root
}

/**
 * Run the tim CLI against `workspaceRoot` without pulling it first. The
 * workspace option goes before `args`, so arguments after `--` stay last.
 */
export const runTimInWorkspace = (workspaceRoot, args) =>
  execa('node', [TIM_CLI_PATH, '--workspace', workspaceRoot, ...args], {
    reject: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

export const envelopeOf = (run) => JSON.parse(run.stdout.trim())
