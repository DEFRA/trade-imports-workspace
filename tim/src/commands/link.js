import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync
} from 'node:fs'
import { dirname } from 'node:path'
import {
  resolveWorkspaceRoot,
  CANONICAL_WORKSPACE_PATH
} from '../env/workspace-root.js'
import { OK, USAGE, ERROR } from '../constants/exitCodes.js'
import { isTimError } from '../errors.js'

const SCHEMA_VERSION = 1

const isSymlink = (path) => {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

export const planLink = (
  workspaceRoot,
  canonical = CANONICAL_WORKSPACE_PATH
) => {
  if (workspaceRoot === canonical) {
    return {
      ok: true,
      action: 'already-canonical',
      from: canonical,
      to: workspaceRoot
    }
  }
  if (isSymlink(canonical)) {
    const currentTarget = readlinkSync(canonical)
    if (currentTarget === workspaceRoot) {
      return {
        ok: true,
        action: 'already-linked',
        from: canonical,
        to: currentTarget
      }
    }
    return {
      ok: false,
      action: 'wrong-symlink',
      from: canonical,
      to: currentTarget,
      message: `${canonical} is a symlink to ${currentTarget}, not this checkout. Remove it manually if you want to repoint: rm ${canonical}`
    }
  }
  if (existsSync(canonical)) {
    return {
      ok: false,
      action: 'blocked-by-non-symlink',
      from: canonical,
      to: workspaceRoot,
      message: `${canonical} exists and is not a symlink. Refusing to clobber.`
    }
  }
  return {
    ok: true,
    action: 'create',
    from: canonical,
    to: workspaceRoot
  }
}

export const applyLink = (plan) => {
  if (plan.action !== 'create') return plan
  mkdirSync(dirname(plan.from), { recursive: true })
  symlinkSync(plan.to, plan.from)
  return { ...plan, action: 'created' }
}

export const renderText = (result) => {
  switch (result.action) {
    case 'already-canonical':
      return `Already at canonical path — no symlink needed.`
    case 'already-linked':
      return `Already linked: ${result.from} -> ${result.to}`
    case 'created':
      return `Linked ${result.from} -> ${result.to}`
    case 'create':
      return `Would link ${result.from} -> ${result.to}` // dry-run shape, not currently exposed
    default:
      return result.message ?? `Unknown state: ${result.action}`
  }
}

export const renderJson = (result, timVersion) =>
  JSON.stringify({
    ok: result.ok,
    schema_version: SCHEMA_VERSION,
    tim_version: timVersion,
    result,
    errors: result.ok ? [] : [{ code: 'USAGE', message: result.message }],
    metadata: { ranAt: new Date().toISOString() }
  })

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

export const register = (program, { timVersion }) => {
  program
    .command('link')
    .description(
      `For a checkout cloned somewhere else: symlink ${CANONICAL_WORKSPACE_PATH} to this checkout, because tools/ scripts read that path. A clone at that path needs nothing.`
    )
    .action(async function linkAction() {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const plan = planLink(workspaceRoot)
        const result = applyLink(plan)
        if (globalOpts.json) emit(renderJson(result, timVersion))
        else emit(renderText(result))
        process.exit(result.ok ? OK : ERROR)
      } catch (error) {
        if (isTimError(error) && globalOpts.json) {
          emit(
            JSON.stringify({
              ok: false,
              schema_version: SCHEMA_VERSION,
              tim_version: timVersion,
              result: null,
              errors: [{ code: error.code, message: error.message }]
            })
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(
          isTimError(error) && error.code === 'USAGE' ? USAGE : ERROR
        )
      }
    })
}
