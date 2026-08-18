#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Command, Option } from 'commander'
import { z } from 'zod'
import { resolveWorkspaceRoot } from './env/workspace-root.js'
import { autoPullWorkspace } from './exec/auto-pull.js'
import { register as registerWorkspaceStatus } from './commands/workspace/status.js'
import { register as registerWorkspaceClean } from './commands/workspace/clean.js'
import { register as registerWorkspaceInstall } from './commands/workspace/install.js'
import { register as registerWorkspaceLint } from './commands/workspace/lint.js'
import { register as registerWorkspaceTest } from './commands/workspace/test.js'
import { register as registerWorkspaceSetup } from './commands/workspace/setup.js'
import { register as registerWorkspaceUpdate } from './commands/workspace/update.js'
import { register as registerWorkspaceReset } from './commands/workspace/reset.js'
import { register as registerWorkspaceBranch } from './commands/workspace/branch.js'
import { register as registerLink } from './commands/link.js'
import { register as registerDocker } from './commands/docker/index.js'
import { register as registerStart } from './commands/start.js'
import { register as registerAuth } from './commands/auth.js'
import { register as registerJira } from './commands/jira/index.js'
import { register as registerGithub } from './commands/github/index.js'
import { register as registerConfluence } from './commands/confluence/index.js'
import { register as registerGha } from './commands/gha/index.js'
import { register as registerParity } from './commands/parity/index.js'

const SCHEMA_VERSION = 1

const here = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'))

const helloOutputSchema = z.object({
  ok: z.literal(true),
  schema_version: z.literal(SCHEMA_VERSION),
  tim_version: z.string(),
  message: z.string()
})

const helloPayload = () => ({
  ok: true,
  schema_version: SCHEMA_VERSION,
  tim_version: pkg.version,
  message: 'Hello from tim'
})

const writeLine = (text) => process.stdout.write(`${text}\n`)

const emitHelloJson = () =>
  writeLine(JSON.stringify(helloOutputSchema.parse(helloPayload())))

const emitHelloText = () => writeLine('Hello from tim')

const addGlobalOptions = (program) => {
  program
    .option(
      '--json',
      'Emit one structured JSON line on stdout (suppresses Ink)'
    )
    .option('--no-ui', 'Plain text on stdout (suppresses Ink)')
    .option('--verbose', 'Emit structured logs to stderr')
    .addOption(
      new Option('--workspace <path>', 'Override the resolved workspace root')
    )
  return program
}

const launchInteractive = async ({ workspaceRoot }) => {
  const [{ createElement }, { default: MainMenu }, { mount }] =
    await Promise.all([
      import('react'),
      import('./components/MainMenu.js'),
      import('./components/inkControl.js')
    ])
  mount(createElement(MainMenu, { workspaceRoot }))
}

// Keep the workspace current for anyone who reaches for tim, without them
// having to remember to pull. Never blocks the command: if the workspace
// cannot be resolved (jira, github and friends do not need one) or git is
// unavailable, the command runs regardless. Notes go to stderr so a --json
// stdout stays a single parseable line.
const syncWorkspace = async (actionCommand) => {
  try {
    const workspaceRoot = resolveWorkspaceRoot({
      explicit: actionCommand.optsWithGlobals().workspace
    })
    await autoPullWorkspace({
      workspaceRoot,
      warn: (message) => process.stderr.write(`${message}\n`)
    })
  } catch {
    // No workspace, or git missing. The command reports whatever matters.
  }
}

export const buildProgram = () => {
  const program = new Command()
  program
    .hook('preAction', (_thisCommand, actionCommand) =>
      syncWorkspace(actionCommand)
    )
    .name('tim')
    .description(
      'Trade Imports CLI — dual-runs alongside the bash tooling in ../tools/'
    )
    .version(pkg.version)
    .showHelpAfterError(true)
    // No subcommand → launch the Ink menu when stdout is a TTY and the
    // user hasn't asked for plain text. Otherwise show help (so pipes,
    // CI, and `--no-ui` keep working unchanged).
    .action(async function noSubcommandAction() {
      const opts = this.optsWithGlobals()
      const interactive =
        process.stdout.isTTY && opts.ui !== false && !opts.json
      if (!interactive) {
        program.help()
        return
      }
      await launchInteractive({ workspaceRoot: opts.workspace })
    })

  addGlobalOptions(program)

  program
    .command('hello')
    .description('Print a hello message — used for smoke testing')
    .action(function helloAction() {
      const { json } = this.optsWithGlobals()
      if (json) emitHelloJson()
      else emitHelloText()
    })

  const workspace = program
    .command('workspace')
    .description('Commands that operate across every repo in the workspace')

  registerWorkspaceStatus(workspace, { timVersion: pkg.version })
  registerWorkspaceClean(workspace, { timVersion: pkg.version })
  registerWorkspaceInstall(workspace, { timVersion: pkg.version })
  registerWorkspaceLint(workspace, { timVersion: pkg.version })
  registerWorkspaceTest(workspace, { timVersion: pkg.version })
  registerWorkspaceSetup(workspace, { timVersion: pkg.version })
  registerWorkspaceUpdate(workspace, { timVersion: pkg.version })
  registerWorkspaceReset(workspace, { timVersion: pkg.version })
  registerWorkspaceBranch(workspace, { timVersion: pkg.version })

  registerLink(program, { timVersion: pkg.version })
  registerDocker(program, { timVersion: pkg.version })
  registerStart(program, { timVersion: pkg.version })
  registerAuth(program, { timVersion: pkg.version })
  registerJira(program, { timVersion: pkg.version })
  registerGithub(program, { timVersion: pkg.version })
  registerConfluence(program, { timVersion: pkg.version })
  registerGha(program, { timVersion: pkg.version })
  registerParity(program, { timVersion: pkg.version })

  return program
}

// cli.js IS the bin entry. Run unconditionally so the global `tim`
// symlink (which makes process.argv[1] !== import.meta.url) works.
// Tests spawn node src/cli.js as a subprocess; nothing imports this
// file's exports at module load time.
buildProgram().parse(process.argv)
