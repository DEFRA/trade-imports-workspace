import { describe, test, expect, afterEach } from 'vitest'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { runTimInWorkspace, envelopeOf } from '../../test-support/tim-cli.js'
import {
  EVIDENCE_REPO,
  OLD_HEADER_CLASS,
  createDepsWorkspace,
  createHeaderEvidenceWorkspace
} from '../../test-support/deps-workspace.js'

const okEnvelope = (result) =>
  z.object({ ok: z.literal(true), schema_version: z.literal(1), result })

const countSchema = okEnvelope(
  z.object({ repo: z.string(), pattern: z.string(), hits: z.number() }).strict()
)

const checkSchema = okEnvelope(
  z
    .object({
      allClean: z.boolean(),
      rowCount: z.number(),
      notCleanCount: z.number(),
      rows: z.array(
        z
          .object({
            item: z.string(),
            outcome: z.string(),
            clean: z.boolean(),
            problem: z.string().nullable()
          })
          .strict()
      )
    })
    .strict()
)

const renderSchema = okEnvelope(
  z
    .object({
      markdown: z.string(),
      allClean: z.boolean(),
      rowCount: z.number(),
      notCleanCount: z.number()
    })
    .strict()
)

const CLEAN_ROWS = [
  {
    item: 'Remove the header link class',
    pattern: OLD_HEADER_CLASS,
    hitsBefore: 2,
    hitsAfter: 0,
    outcome: 'applied',
    reason: ''
  },
  {
    item: 'Internal build changes',
    outcome: 'not-applicable',
    reason: 'Build only.'
  }
]

const NEEDS_A_PERSON_ROW = {
  item: 'Header layout changes',
  outcome: 'needs-a-person',
  reason: 'Visual change to every page.'
}

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const rowsFile = (rows) => {
  const path = join(root, 'rows.json')
  writeFileSync(path, JSON.stringify(rows))
  return path
}

const runEvidence = (...args) =>
  runTimInWorkspace(root, ['deps', 'evidence', ...args, '--json'])

describe('tim deps evidence count', () => {
  test("Should count the pattern's hits in the repo's tracked files", async () => {
    root = (await createHeaderEvidenceWorkspace()).root

    const run = await runEvidence('count', EVIDENCE_REPO, OLD_HEADER_CLASS)

    expect({
      exitCode: run.exitCode,
      result: countSchema.parse(envelopeOf(run)).result
    }).toEqual({
      exitCode: 0,
      result: { repo: EVIDENCE_REPO, pattern: OLD_HEADER_CLASS, hits: 2 }
    })
  })

  test('Should print only the count as text', async () => {
    root = (await createHeaderEvidenceWorkspace()).root

    const run = await runTimInWorkspace(root, [
      'deps',
      'evidence',
      'count',
      EVIDENCE_REPO,
      OLD_HEADER_CLASS
    ])

    expect(run.stdout.trim()).toBe('2')
  })

  test('Should refuse a repo that is not cloned', async () => {
    root = createDepsWorkspace({ cloned: [] })

    const run = await runEvidence('count', 'trade-imports-gone', 'x')

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code
    }).toEqual({ exitCode: 2, code: 'NOT_FOUND' })
  })
})

describe('tim deps evidence check', () => {
  test('Should exit 0 when every row is clean', async () => {
    root = createDepsWorkspace()

    const run = await runEvidence('check', '--file', rowsFile(CLEAN_ROWS))

    expect({
      exitCode: run.exitCode,
      allClean: checkSchema.parse(envelopeOf(run)).result.allClean
    }).toEqual({ exitCode: 0, allClean: true })
  })

  test('Should exit 1 and name the problem when a row needs a person', async () => {
    root = createDepsWorkspace()

    const run = await runEvidence(
      'check',
      '--file',
      rowsFile([...CLEAN_ROWS, NEEDS_A_PERSON_ROW])
    )

    expect({
      exitCode: run.exitCode,
      notClean: checkSchema
        .parse(envelopeOf(run))
        .result.rows.filter(({ clean }) => !clean)
    }).toEqual({
      exitCode: 1,
      notClean: [
        {
          item: 'Header layout changes',
          outcome: 'needs-a-person',
          clean: false,
          problem: 'A person needs to decide this item.'
        }
      ]
    })
  })

  test('Should exit 1 when the file holds no rows', async () => {
    root = createDepsWorkspace()

    const run = await runEvidence('check', '--file', rowsFile([]))

    expect(run.exitCode).toBe(1)
  })

  test('Should refuse a file of invalid rows as a usage error', async () => {
    root = createDepsWorkspace()

    const run = await runEvidence(
      'check',
      '--file',
      rowsFile([{ item: 'x', outcome: 'maybe', reason: '' }])
    )

    expect({
      exitCode: run.exitCode,
      code: envelopeOf(run).errors[0].code
    }).toEqual({ exitCode: 2, code: 'USAGE' })
  })

  test('Should refuse a missing --file as a usage error', async () => {
    root = createDepsWorkspace()

    const run = await runEvidence('check')

    expect({ exitCode: run.exitCode, errors: envelopeOf(run).errors }).toEqual({
      exitCode: 2,
      errors: [
        { code: 'USAGE', message: 'Give the evidence rows file with --file.' }
      ]
    })
  })
})

describe('tim deps evidence render', () => {
  test('Should print the markdown table as text', async () => {
    root = createDepsWorkspace()

    const run = await runTimInWorkspace(root, [
      'deps',
      'evidence',
      'render',
      '--file',
      rowsFile(CLEAN_ROWS)
    ])

    expect(run.stdout.trim()).toBe(
      [
        '| Changelog item | Outcome | Evidence |',
        '|---|---|---|',
        `| Remove the header link class | Applied | \`${OLD_HEADER_CLASS}\`: 2 hits before, 0 after. |`,
        '| Internal build changes | Not applicable | Build only. |',
        '',
        'Every row is clean.'
      ].join('\n')
    )
  })

  test('Should exit 0 with the clean flag false when a row is not clean', async () => {
    root = createDepsWorkspace()

    const run = await runEvidence(
      'render',
      '--file',
      rowsFile([...CLEAN_ROWS, NEEDS_A_PERSON_ROW])
    )

    const { allClean, notCleanCount } = renderSchema.parse(
      envelopeOf(run)
    ).result
    expect({ exitCode: run.exitCode, allClean, notCleanCount }).toEqual({
      exitCode: 0,
      allClean: false,
      notCleanCount: 1
    })
  })
})

describe('tim deps evidence check as text', () => {
  test('Should print each row that is not clean with its problem', async () => {
    root = createDepsWorkspace()

    const run = await runTimInWorkspace(root, [
      'deps',
      'evidence',
      'check',
      '--file',
      rowsFile([...CLEAN_ROWS, NEEDS_A_PERSON_ROW])
    ])

    expect(run.stdout.trim()).toBe(
      [
        '1 of 3 evidence rows in the file are not clean:',
        '- Header layout changes: A person needs to decide this item.'
      ].join('\n')
    )
  })
})
