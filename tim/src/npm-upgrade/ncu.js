import { createRequire } from 'node:module'
import { join } from 'node:path'
import ncu from 'npm-check-updates'

/**
 * The version of npm-check-updates tim runs.
 *
 * @returns {string}
 */
export const ncuVersion = () =>
  createRequire(import.meta.url)('npm-check-updates/package.json').version

/**
 * The upgrades `ncu --jsonUpgraded --target <target>` reports for the
 * package.json in `cwd`, as package name to proposed range. Given
 * `packages`, only those packages, where `*` is a wildcard.
 *
 * @param {{cwd: string, target: string, packages?: string[]}} request
 * @returns {Promise<Record<string, string>>}
 */
export const runNcu = async ({ cwd, target, packages = [] }) =>
  (await ncu.run({
    cwd,
    packageFile: join(cwd, 'package.json'),
    jsonUpgraded: true,
    target,
    silent: true,
    ...(packages.length > 0 && { filter: packages })
  })) ?? {}
