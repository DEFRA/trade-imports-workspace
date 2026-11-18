import { readFileSync } from 'node:fs'
import { EMPTY_REPORT, REPORT, TODAY } from './npm-audit-workspace.js'

const realReport = JSON.parse(
  readFileSync(new URL('./npm-audit-report.json', import.meta.url), 'utf8')
)

const via = (ghsa, severity, range) => ({
  name: 'tie',
  title: `${severity ?? 'no'} severity`,
  url: `https://github.com/advisories/${ghsa}`,
  severity,
  range
})

const tiedSeverities = {
  vulnerabilities: {
    tie: {
      via: [
        via('GHSA-tttt-tttt-tttt', 'info', null),
        via('GHSA-tttt-tttt-tttt', 'info', '<1.0.0'),
        via('GHSA-tttt-tttt-tttt', 'unheard-of', '<0.5.0'),
        via('GHSA-aaaa-aaaa-aaaa', 'low', '<2.0.0'),
        'other'
      ]
    }
  }
}

const allowlist = [
  'GHSA-aaaa-aaaa-aaaa',
  { 'GHSA-bbbb-bbbb-bbbb': { active: true, notes: 'n', expiry: TODAY } },
  { 'GHSA-cccc-cccc-cccc': { active: true, notes: 'n', expiry: '2026-11-15' } },
  { 'GHSA-dddd-dddd-dddd': { active: 'true', expiry: '2099-01-01' } },
  { 'GHSA-eeee-eeee-eeee': { active: true, expiry: '2099-1-1' } },
  { 'GHSA-ffff-ffff-ffff': { active: true, expiry: 20990101 } },
  { 'GHSA-gggg-gggg-gggg': { active: true, expiry: null } },
  {
    'GHSA-hhhh-hhhh-hhhh': { active: true, expiry: '2099-01-01' },
    'GHSA-iiii-iiii-iiii': { active: true }
  },
  {}
]

/**
 * Each case runs one jq program from audit-lib.sh on `input`, with `args`
 * passed to jq.
 */
export const jqCases = [
  {
    name: 'advisories: fixture report',
    program: 'AUDIT_JQ_ADVISORIES',
    input: REPORT
  },
  {
    name: 'advisories: empty report',
    program: 'AUDIT_JQ_ADVISORIES',
    input: EMPTY_REPORT
  },
  {
    name: 'advisories: no vulnerabilities key',
    program: 'AUDIT_JQ_ADVISORIES',
    input: {}
  },
  {
    name: 'advisories: real report',
    program: 'AUDIT_JQ_ADVISORIES',
    input: realReport
  },
  {
    name: 'advisories: tied and unknown severities',
    program: 'AUDIT_JQ_ADVISORIES',
    input: tiedSeverities
  },
  {
    name: 'allowlist: every entry shape',
    program: 'AUDIT_JQ_ALLOWLIST',
    input: { allowlist },
    args: ['--arg', 'today', TODAY]
  },
  {
    name: 'allowlist: a later day',
    program: 'AUDIT_JQ_ALLOWLIST',
    input: { allowlist },
    args: ['--arg', 'today', '2026-11-15']
  },
  {
    name: 'threshold: high',
    program: 'AUDIT_JQ_THRESHOLD',
    input: { high: true }
  },
  { name: 'threshold: none', program: 'AUDIT_JQ_THRESHOLD', input: {} },
  {
    name: 'threshold: lowest level set wins',
    program: 'AUDIT_JQ_THRESHOLD',
    input: { critical: true, moderate: true, low: false }
  },
  {
    name: 'threshold: only true counts',
    program: 'AUDIT_JQ_THRESHOLD',
    input: { low: 'true', critical: true }
  }
]
