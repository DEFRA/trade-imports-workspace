// Find whether a fixed version exists for each advisory.
//
// Usage (via audit_fix_check in audit-lib.sh):
//   echo '[{"ghsa":"GHSA-…","package":"braces","ranges":["<=3.0.3"]}]' \
//     | node audit-fix-check.mjs <repo-path>
//
// For each row it adds:
//   installed      every version of the package in the repo's lockfile
//   vulnerable     the installed versions inside a vulnerable range
//   fixes          for each vulnerable version, the nearest published,
//                  non-prerelease version above it that is outside every
//                  vulnerable range: [{installed, fixed}]; a version with
//                  no such release is left out
//   fixed_version  the fix for the newest vulnerable version that has
//                  one, or null when no vulnerable version has a fix
//
// It asks the registry the repo is configured for (`npm view`, run in
// the repo), so .npmrc applies. semver comes from the repo's own
// node_modules (audit-ci depends on it), falling back to npm's copy.

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const repoPath = process.argv[2]
if (!repoPath) {
  console.error('Usage: node audit-fix-check.mjs <repo-path> < advisories.json')
  process.exit(2)
}

function loadSemver() {
  try {
    return createRequire(path.join(repoPath, 'package.json'))('semver')
  } catch {
    const npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()
    return createRequire(path.join(npmRoot, 'npm', 'package.json'))('semver')
  }
}

function installedVersions(lock, name) {
  const suffix = `node_modules/${name}`
  return [
    ...new Set(
      Object.entries(lock.packages ?? {})
        .filter(([key, value]) => (key === suffix || key.endsWith(`/${suffix}`)) && value.version)
        .map(([, value]) => value.version)
    )
  ]
}

const publishedCache = new Map()
function publishedVersions(name) {
  if (!publishedCache.has(name)) {
    const out = execFileSync('npm', ['view', name, 'versions', '--json'], {
      cwd: repoPath,
      encoding: 'utf8'
    })
    const parsed = JSON.parse(out)
    publishedCache.set(name, Array.isArray(parsed) ? parsed : [parsed])
  }
  return publishedCache.get(name)
}

const semver = loadSemver()
const lockFile = path.join(repoPath, 'package-lock.json')
const lock = existsSync(lockFile) ? JSON.parse(readFileSync(lockFile, 'utf8')) : {}
const advisories = JSON.parse(readFileSync(0, 'utf8'))

const inRange = (version, ranges) =>
  ranges.some((range) => semver.satisfies(version, range, { includePrerelease: true }))

const result = advisories.map((advisory) => {
  const installed = installedVersions(lock, advisory.package)
  const vulnerable = installed
    .filter((version) => inRange(version, advisory.ranges))
    .sort(semver.compare)
  const safe =
    vulnerable.length > 0
      ? publishedVersions(advisory.package)
          .filter((v) => semver.valid(v) && !semver.prerelease(v))
          .filter((v) => !inRange(v, advisory.ranges))
          .sort(semver.compare)
      : []
  // The nearest safe version above each vulnerable copy in the tree.
  const fixes = vulnerable
    .map((version) => ({ installed: version, fixed: safe.find((v) => semver.gt(v, version)) }))
    .filter((fix) => fix.fixed)
  return {
    ...advisory,
    installed,
    vulnerable,
    fixes,
    fixed_version: fixes.length > 0 ? fixes[fixes.length - 1].fixed : null
  }
})

process.stdout.write(JSON.stringify(result) + '\n')
