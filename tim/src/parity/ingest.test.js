import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonFile } from './io.js'
import { runIngest, composeDetail, findingsDir } from './ingest.js'

let root
let profile

const SCREENS = {
  frontend: ['fe-documents', 'fe-origin'],
  prototype: ['dr1-upload-documents', 'dr1-origin']
}

const buildProfile = (dir) => {
  const workarea = join(dir, 'workarea')
  const evidence = join(dir, 'evidence')
  const sides = ['frontend', 'prototype'].map((id) => {
    const manifest = join(evidence, `${id}@abc12345`, 'manifest.json')
    mkdirSync(join(evidence, `${id}@abc12345`), { recursive: true })
    writeFileSync(
      manifest,
      JSON.stringify({
        rows: SCREENS[id].map((screen) => ({
          screen,
          file: `page/${screen}.png`
        }))
      })
    )
    return {
      id,
      repo: id,
      screenPrefix: id === 'frontend' ? 'fe-' : 'dr1-',
      evidenceRoot: 'evidence',
      modelDir: join(dir, 'model', id),
      manifest
    }
  })
  mkdirSync(join(workarea, 'findings'), { recursive: true })
  mkdirSync(join(dir, 'run'), { recursive: true })
  return {
    id: 'dr1',
    runId: 'EUDPA-328-DR1',
    workspaceRoot: dir,
    sides,
    sideIds: sides.map((side) => side.id),
    sideById: Object.fromEntries(sides.map((side) => [side.id, side])),
    repos: { frontend: {}, prototype: {} },
    captures: {},
    bands: [
      { id: 'frontend-work' },
      { id: 'needs-backend' },
      { id: 'disputed' }
    ],
    paths: { workarea, backlog: join(dir, 'run', 'backlog.json') }
  }
}

const finding = (overrides = {}) => ({
  slice: 'documents',
  title: 'DR1 asks for a document type; the frontend infers one.',
  domain: 'documents',
  type: 'add-field',
  band: 'frontend-work',
  confidence: 'high',
  screens: ['fe-documents', 'dr1-upload-documents'],
  controls: ['accompanyingDocumentType'],
  finding: {
    frontend: 'The frontend infers the type from the file name.',
    prototype: 'DR1 asks the user to choose a type.',
    difference: 'Add a select before the upload.',
    falsifiedBy: 'A document-type select rendered from a shared partial.'
  },
  evidence: { frontend: 'src/server/app/documents/template.njk:31-58' },
  ...overrides
})

const writeFinding = (name, body) =>
  writeFileSync(
    join(findingsDir(profile), name),
    JSON.stringify(body ?? finding(), null, 2)
  )

const ingest = (opts = {}) =>
  runIngest({
    profile,
    workspaceRoot: root,
    target: 'live-animals-frontend',
    ...opts
  })

const backlog = () => readJsonFile(profile.paths.backlog)

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-parity-ingest-'))
  profile = buildProfile(root)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('runIngest', () => {
  test('numbers findings by slice then file name', () => {
    writeFinding('origin--country.json', finding({ slice: 'origin' }))
    writeFinding('documents--type.json')
    writeFinding('documents--size.json')

    ingest()

    expect(backlog().increments.map((i) => [i.id, i.source])).toEqual([
      ['inc-001', 'documents--size.json'],
      ['inc-002', 'documents--type.json'],
      ['inc-003', 'origin--country.json']
    ])
  })

  test('gives the same ids on a second run over the same findings', () => {
    writeFinding('documents--type.json')
    writeFinding('origin--country.json', finding({ slice: 'origin' }))

    const ids = ({ assignment }) =>
      assignment.map((entry) => [entry.file, entry.id])

    const first = ids(ingest())
    const second = ids(ingest())

    expect(second).toEqual(first)
  })

  test('leaves an existing id where it is when a finding sorts in ahead of it', () => {
    writeFinding('documents--type.json')
    ingest()

    writeFinding('documents--absent.json', finding({ title: 'Added later.' }))
    ingest()

    const byFile = Object.fromEntries(
      backlog().increments.map((i) => [i.source, i.id])
    )
    expect(byFile).toEqual({
      'documents--type.json': 'inc-001',
      'documents--absent.json': 'inc-002'
    })
  })

  test('composes detail from the four slots with the falsifier prefixed', () => {
    writeFinding('documents--type.json')

    ingest()

    expect(backlog().increments[0].detail).toBe(
      composeDetail(finding().finding)
    )
    expect(backlog().increments[0].detail).toBe(
      [
        'The frontend infers the type from the file name.',
        'DR1 asks the user to choose a type.',
        'Add a select before the upload.',
        'FALSIFIED BY: A document-type select rendered from a shared partial.'
      ].join('\n\n')
    )
  })

  test('starts a finding as unstarted work with no milestone or gate', () => {
    writeFinding('documents--type.json')

    ingest()

    const [increment] = backlog().increments
    expect({
      status: increment.status,
      gate: increment.gate,
      milestone: increment.milestone,
      commit: increment.commit,
      dependsOn: increment.dependsOn,
      corpus: increment.corpus
    }).toEqual({
      status: 'todo',
      gate: null,
      milestone: null,
      commit: null,
      dependsOn: [],
      corpus: 'dr1'
    })
  })

  test('carries the named controls and the carried-over id through', () => {
    writeFinding(
      'documents--type.json',
      finding({
        carriedFrom: 'inc-013',
        controls: ['documentType', 'Add file']
      })
    )

    const result = ingest()

    expect(backlog().increments[0].controls).toEqual([
      'documentType',
      'Add file'
    ])
    expect(backlog().increments[0].carriedFrom).toBe('inc-013')
    expect(result.carriedOver).toBe(1)
  })

  test('keeps a ruling and the build state when the finding is re-ingested', () => {
    writeFinding('documents--type.json')
    ingest()
    const held = backlog()
    held.increments[0] = {
      ...held.increments[0],
      status: 'done',
      commit: 'abc1234',
      gate: 'sam',
      dependsOn: ['inc-002'],
      decision: { ruling: 'accept', note: 'Build it.' },
      citations: [
        {
          ref: 'c1',
          kind: 'code',
          side: 'frontend',
          repo: 'frontend',
          path: 'a.njk',
          asWritten: 'a.njk:1',
          resolution: 'explicit'
        }
      ]
    }
    writeFileSync(profile.paths.backlog, JSON.stringify(held))

    writeFinding(
      'documents--type.json',
      finding({ title: 'A better sentence.', band: 'needs-backend' })
    )
    ingest()

    const [increment] = backlog().increments
    expect({
      status: increment.status,
      commit: increment.commit,
      gate: increment.gate,
      dependsOn: increment.dependsOn,
      ruling: increment.decision.ruling,
      citations: increment.citations.length
    }).toEqual({
      status: 'done',
      commit: 'abc1234',
      gate: 'sam',
      dependsOn: ['inc-002'],
      ruling: 'accept',
      citations: 1
    })
    expect(increment.title).toBe('A better sentence.')
    expect(increment.band).toBe('needs-backend')
  })

  test('refuses to rebuild over a ruling, naming what would be lost', () => {
    writeFinding('documents--type.json')
    ingest()
    const held = backlog()
    held.increments[0] = {
      ...held.increments[0],
      decision: { ruling: 'accept', note: 'Build it.' }
    }
    writeFileSync(profile.paths.backlog, JSON.stringify(held))

    expect(() => ingest({ replace: true })).toThrow(/inc-001/)
  })

  test('rebuilds from scratch when nothing has been ruled', () => {
    writeFinding('origin--country.json', finding({ slice: 'origin' }))
    writeFinding('documents--type.json')
    ingest()

    const result = ingest({ replace: true })

    expect(result.new).toBe(2)
    expect(backlog().increments.map((i) => i.id)).toEqual([
      'inc-001',
      'inc-002'
    ])
  })

  test('drops an increment whose finding file has been struck', () => {
    writeFinding('documents--type.json')
    writeFinding('origin--country.json', finding({ slice: 'origin' }))
    ingest()

    rmSync(join(findingsDir(profile), 'origin--country.json'))
    const result = ingest()

    expect(result.dropped).toEqual(['inc-002'])
    expect(backlog().increments.map((i) => i.id)).toEqual(['inc-001'])
  })

  test('refuses to drop an increment somebody has already ruled on', () => {
    writeFinding('documents--type.json')
    ingest()
    const held = backlog()
    held.increments[0] = { ...held.increments[0], status: 'done' }
    writeFileSync(profile.paths.backlog, JSON.stringify(held))
    writeFinding('origin--country.json', finding({ slice: 'origin' }))

    rmSync(join(findingsDir(profile), 'documents--type.json'))

    expect(() => ingest()).toThrow(/inc-001/)
  })

  test('refuses to change a frozen detail, naming the increment', () => {
    writeFinding('documents--type.json')
    ingest()

    writeFinding(
      'documents--type.json',
      finding({
        finding: {
          ...finding().finding,
          difference: 'Add a select, and rename the page.'
        }
      })
    )

    expect(() => ingest()).toThrow(/inc-001/)
    expect(backlog().increments[0].detail).toContain('Add a select before')
  })

  test('lets a verifier add a correction without disturbing the frozen detail', () => {
    writeFinding('documents--type.json')
    ingest()
    const before = backlog().increments[0].detail

    writeFinding(
      'documents--type.json',
      finding({
        finding: { ...finding().finding, correction: 'The select is hidden.' }
      })
    )
    ingest()

    expect(backlog().increments[0].finding.correction).toBe(
      'The select is hidden.'
    )
    expect(backlog().increments[0].detail).toBe(before)
  })

  test('names the file when the band is not one this corpus declares', () => {
    writeFinding('documents--type.json', finding({ band: 'needs-a-decision' }))

    expect(() => ingest()).toThrow(/documents--type\.json.*needs-a-decision/s)
  })

  test('names the file when the type is not a shape of work', () => {
    writeFinding('documents--type.json', finding({ type: 'add-thing' }))

    expect(() => ingest()).toThrow(/documents--type\.json/)
  })

  test('names the file when a screen is in no capture manifest', () => {
    writeFinding(
      'documents--type.json',
      finding({ screens: ['fe-documents', 'dr1-invented'] })
    )

    expect(() => ingest()).toThrow(/dr1-invented/)
  })

  test('names the file when a prose slot is missing', () => {
    const body = finding()
    delete body.finding.falsifiedBy
    writeFinding('documents--type.json', body)

    expect(() => ingest()).toThrow(/finding\.falsifiedBy/)
  })

  test('writes the backlog when its directory does not exist yet', () => {
    profile.paths.backlog = join(root, 'brand-new-corpus', 'backlog.json')
    writeFinding('documents--type.json')

    const result = ingest()

    expect(result.written).toBe(true)
    expect(backlog().increments.map((i) => i.id)).toEqual(['inc-001'])
  })

  test('writes nothing on a dry run, and still reports the counts', () => {
    writeFinding('documents--type.json')
    writeFinding(
      'origin--country.json',
      finding({ slice: 'origin', domain: 'origin', band: 'needs-backend' })
    )

    const result = ingest({ dryRun: true })

    expect(existsSync(profile.paths.backlog)).toBe(false)
    expect(result.written).toBe(false)
    expect(result.byBand).toEqual({ 'frontend-work': 1, 'needs-backend': 1 })
    expect(result.byDomain).toEqual({ documents: 1, origin: 1 })
    expect(result.assignment.map((entry) => entry.id)).toEqual([
      'inc-001',
      'inc-002'
    ])
  })

  test('reports how many findings were new and how many were refreshed', () => {
    writeFinding('documents--type.json')
    ingest()
    writeFinding('origin--country.json', finding({ slice: 'origin' }))

    const result = ingest()

    expect({
      total: result.total,
      new: result.new,
      refreshed: result.refreshed
    }).toEqual({ total: 2, new: 1, refreshed: 1 })
  })

  test('says so when no side has a manifest to check a screen against', () => {
    rmSync(join(root, 'evidence'), { recursive: true, force: true })
    writeFinding(
      'documents--type.json',
      finding({ screens: ['fe-not-photographed-yet'] })
    )

    const result = ingest()

    expect(result.screensCheckable).toBe(false)
    expect(result.total).toBe(1)
  })

  test('resolves a relatedTo file slug to the id that file was given', () => {
    writeFinding('documents--size.json')
    writeFinding(
      'documents--type.json',
      finding({
        relatedTo: [
          {
            id: 'documents--size',
            relation: 'travels-with',
            why: 'Both are upload rules.'
          }
        ]
      })
    )

    ingest()

    const byId = Object.fromEntries(backlog().increments.map((i) => [i.id, i]))
    expect(byId['inc-001'].source).toBe('documents--size.json')
    expect(byId['inc-002'].finding.relatedTo).toEqual([
      {
        id: 'inc-001',
        relation: 'travels-with',
        why: 'Both are upload rules.'
      }
    ])
  })

  test('resolves a reference to a finding written later in the same batch', () => {
    writeFinding(
      'documents--size.json',
      finding({
        relatedTo: [
          {
            id: 'documents--type',
            relation: 'depends-on',
            why: 'The limit only bites once a type is asked for.'
          }
        ]
      })
    )
    writeFinding('documents--type.json')

    ingest()

    const [first, second] = backlog().increments
    expect(second.source).toBe('documents--type.json')
    expect(first.finding.relatedTo).toEqual([
      {
        id: second.id,
        relation: 'depends-on',
        why: 'The limit only bites once a type is asked for.'
      }
    ])
  })

  test('leaves an id that is already an increment id alone on a re-ingest', () => {
    const related = [
      {
        id: 'inc-002',
        relation: 'travels-with',
        why: 'Already resolved by an earlier run.'
      }
    ]
    writeFinding('documents--size.json', finding({ relatedTo: related }))
    writeFinding('documents--type.json')

    ingest()
    const first = backlog().increments[0].finding.relatedTo
    ingest()
    const second = backlog().increments[0].finding.relatedTo

    expect(first).toEqual(related)
    expect(second).toEqual(related)
  })

  test('names the file and the slug when a relatedTo resolves to nothing', () => {
    writeFinding(
      'documents--type.json',
      finding({
        relatedTo: [
          {
            id: 'documents--file-size-limit',
            relation: 'travels-with',
            why: 'A slug nobody wrote.'
          }
        ]
      })
    )

    expect(() => ingest()).toThrow(
      /documents--type\.json.*relatedTo.*documents--file-size-limit/s
    )
  })

  test('refuses a finding that names itself, naming the file', () => {
    writeFinding(
      'documents--type.json',
      finding({
        relatedTo: [
          {
            id: 'documents--type',
            relation: 'duplicate-of',
            why: 'Itself.'
          }
        ]
      })
    )

    expect(() => ingest()).toThrow(/documents--type\.json.*itself/s)
  })

  test('refuses a relatedTo entry that names no finding at all', () => {
    writeFinding(
      'documents--type.json',
      finding({
        relatedTo: [{ relation: 'travels-with', why: 'No id at all.' }]
      })
    )

    expect(() => ingest()).toThrow(/documents--type\.json.*relatedTo/s)
  })

  test('refuses when the findings directory does not exist', () => {
    rmSync(findingsDir(profile), { recursive: true, force: true })

    expect(() => ingest()).toThrow(/findings/)
  })
})
