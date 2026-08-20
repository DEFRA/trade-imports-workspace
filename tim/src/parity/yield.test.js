import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readAuthored,
  perSlice,
  misfiled,
  runYield,
  renderYield,
  THIN_FRACTION
} from './yield.js'

let root
let workarea

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-yield-'))
  workarea = join(root, 'workarea')
  mkdirSync(join(workarea, 'findings'), { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeFinding = (file, finding) =>
  writeFileSync(
    join(workarea, 'findings', file),
    JSON.stringify(finding, null, 2)
  )

const writeManifest = (name, screens) => {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'manifest.json')
  writeFileSync(
    path,
    JSON.stringify({ rows: screens.map((screen) => ({ screen })) })
  )
  return path
}

const writeSlices = (slices) =>
  writeFileSync(join(workarea, 'slices.json'), JSON.stringify({ slices }))

const writePairs = () => {
  const path = join(root, 'pairs.cjs')
  writeFileSync(
    path,
    'module.exports = { pairs: [], onlyFrontend: [], onlyPrototype: [] }'
  )
  return path
}

const profile = () => ({
  runId: 'EUDPA-999',
  sides: [
    {
      id: 'frontend',
      manifest: writeManifest('fe', ['fe-one', 'fe-two', 'fe-three', 'fe-four'])
    }
  ],
  paths: { workarea, pairingModule: writePairs() }
})

const verified = (extra = {}) => ({
  slice: 'hub',
  screens: ['fe-one'],
  finding: { verification: 'Opened both DOMs and ran the falsifier. CORRECT.' },
  ...extra
})

describe('readAuthored', () => {
  test('reads every finding file in name order', () => {
    writeFinding('b.json', { slice: 'hub' })
    writeFinding('a.json', { slice: 'hub' })

    const result = readAuthored(join(workarea, 'findings'))

    expect(result.findings.map((f) => f.file)).toEqual(['a.json', 'b.json'])
  })

  test('names a file it cannot parse rather than stopping the run', () => {
    writeFinding('good.json', { slice: 'hub' })
    writeFileSync(join(workarea, 'findings', 'bad.json'), '{ not json')

    const result = readAuthored(join(workarea, 'findings'))

    expect(result.findings).toHaveLength(1)
    expect(result.unreadable[0].file).toBe('bad.json')
  })

  test('says a corpus has no findings directory rather than reporting zero', () => {
    expect(readAuthored(join(root, 'nowhere')).found).toBe(false)
  })
})

describe('perSlice', () => {
  const slices = [
    { id: 'hub', screens: ['fe-one', 'fe-two'], chrome: false },
    { id: 'review', screens: ['fe-three', 'fe-four'], chrome: true }
  ]

  test('flags the slice that came in far under the middle of the pack', () => {
    const findings = [
      ...Array.from({ length: 10 }, (_, i) => ({
        file: `hub-${i}.json`,
        raw: { slice: 'hub' }
      })),
      { file: 'review-0.json', raw: { slice: 'review' } }
    ]

    const rows = perSlice({ slices, findings, fraction: THIN_FRACTION })

    expect(rows.map((row) => [row.slice, row.thin])).toEqual([
      ['hub', false],
      ['review', true]
    ])
  })

  test('an ordinary spread trips nothing', () => {
    const findings = [
      { file: 'a.json', raw: { slice: 'hub' } },
      { file: 'b.json', raw: { slice: 'hub' } },
      { file: 'c.json', raw: { slice: 'hub' } },
      { file: 'd.json', raw: { slice: 'review' } },
      { file: 'e.json', raw: { slice: 'review' } }
    ]

    const rows = perSlice({ slices, findings, fraction: THIN_FRACTION })

    expect(rows.some((row) => row.thin)).toBe(false)
  })

  test('counts a verification record and names the findings without one', () => {
    const findings = [
      { file: 'seen.json', raw: verified() },
      { file: 'unseen.json', raw: { slice: 'hub' } },
      {
        file: 'blank.json',
        raw: { slice: 'hub', finding: { verification: '   ' } }
      }
    ]

    const [hub] = perSlice({ slices, findings, fraction: THIN_FRACTION })

    expect(hub.verified).toBe(1)
    expect(hub.unverified).toEqual(['unseen.json', 'blank.json'])
  })

  test('a slice that owns screens and wrote nothing is thin even with no median', () => {
    const rows = perSlice({ slices, findings: [], fraction: THIN_FRACTION })

    expect(rows.every((row) => row.thin)).toBe(true)
  })
})

describe('misfiled', () => {
  const owner = new Map([
    ['fe-one', ['hub']],
    ['fe-three', ['review']]
  ])
  const sliceIds = new Set(['hub', 'review'])

  test('names a finding filed under a slice nobody was given', () => {
    const result = misfiled({
      findings: [{ file: 'x.json', raw: { slice: 'documents' } }],
      sliceIds,
      owner
    })

    expect(result.homeless).toEqual([{ file: 'x.json', slice: 'documents' }])
  })

  test('names a finding none of whose screens its own slice owns', () => {
    const result = misfiled({
      findings: [
        { file: 'x.json', raw: { slice: 'hub', screens: ['fe-three'] } }
      ],
      sliceIds,
      owner
    })

    expect(result.strayed[0]).toMatchObject({
      file: 'x.json',
      slice: 'hub',
      owners: ['review']
    })
  })

  test('a finding spanning two slices is ordinary while one of them is its own', () => {
    const result = misfiled({
      findings: [
        {
          file: 'x.json',
          raw: { slice: 'hub', screens: ['fe-one', 'fe-three'] }
        }
      ],
      sliceIds,
      owner
    })

    expect(result.strayed).toEqual([])
  })
})

describe('runYield', () => {
  beforeEach(() => {
    writeSlices([
      { id: 'hub', chrome: true, screens: ['fe-one', 'fe-two'] },
      { id: 'review', screens: ['fe-three', 'fe-four'] }
    ])
  })

  test('will not call a corpus ready to ingest while a finding is unverified', () => {
    writeFinding('hub--a.json', verified())
    writeFinding('review--b.json', { slice: 'review', screens: ['fe-three'] })

    const result = runYield({ profile: profile() })

    expect(result.readyToIngest).toBe(false)
    expect(result.unverified).toEqual(['review--b.json'])
  })

  test('calls it ready when every finding carries a record and sits in a real slice', () => {
    writeFinding('hub--a.json', verified())
    writeFinding('hub--b.json', verified())
    writeFinding(
      'review--c.json',
      verified({ slice: 'review', screens: ['fe-three'] })
    )
    writeFinding(
      'review--d.json',
      verified({ slice: 'review', screens: ['fe-four'] })
    )

    const result = runYield({ profile: profile() })

    expect([result.readyToIngest, result.total, result.thin]).toEqual([
      true,
      4,
      []
    ])
  })

  test('an unreadable finding file blocks the ingest rather than being skipped', () => {
    writeFinding('hub--a.json', verified())
    writeFileSync(join(workarea, 'findings', 'broken.json'), '{')

    const result = runYield({ profile: profile() })

    expect(result.readyToIngest).toBe(false)
    expect(result.unreadable[0].file).toBe('broken.json')
  })
})

describe('renderYield', () => {
  beforeEach(() => {
    writeSlices([
      { id: 'hub', chrome: true, screens: ['fe-one', 'fe-two'] },
      { id: 'review', screens: ['fe-three', 'fe-four'] }
    ])
  })

  test('says what a thin slice might mean rather than only that it is thin', () => {
    for (let i = 0; i < 12; i += 1) {
      writeFinding(`hub--${i}.json`, verified())
    }
    writeFinding(
      'review--a.json',
      verified({ slice: 'review', screens: ['fe-three'] })
    )

    const text = renderYield(runYield({ profile: profile() }))

    expect(text).toContain('THIN')
    expect(text).toContain('ran out of context and truncated')
  })

  test('explains why an unverified finding must not reach an ingest', () => {
    writeFinding('hub--a.json', { slice: 'hub', screens: ['fe-one'] })

    const text = renderYield(runYield({ profile: profile() }))

    expect(text).toContain('found nothing or looked at nothing')
    expect(text).toContain('freezes it permanently')
  })

  test('says there is nothing to weigh when no agent has written anything', () => {
    rmSync(join(workarea, 'findings'), { recursive: true, force: true })

    const text = renderYield(runYield({ profile: profile() }))

    expect(text).toContain('Nothing to weigh')
  })
})
