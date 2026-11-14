import { describe, expect, test } from 'vitest'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stageInterviewWorkspace } from './__fixtures__/interview-workspace.js'
import { renderPreview, writeReport } from './report.js'

const withStaged = (run) => {
  const staged = stageInterviewWorkspace()
  try {
    return run(staged.root)
  } finally {
    staged.remove()
  }
}

const checkFolderIn = (workspaceRoot, ticket) =>
  join(workspaceRoot, 'workareas', 'understanding-checks', ticket)

const useSummaryWithNoTicketFile = (workspaceRoot, summary) => {
  const folder = checkFolderIn(workspaceRoot, 'EUDPA-204')
  const metaPath = join(folder, '.interview-meta.json')
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  writeFileSync(metaPath, JSON.stringify({ ...meta, summary }))
  rmSync(join(folder, 'ticket.md'))
}

describe('#renderPreview', () => {
  test('Should list each analysis in file-name order with its finding counts', () =>
    withStaged((root) => {
      const { preview } = renderPreview({
        workspaceRoot: root,
        ticket: 'EUDPA-204'
      })

      expect(preview.match(/^### trade-imports-.+$/gm)).toEqual([
        '### trade-imports-animals-backend',
        '### trade-imports-animals-frontend',
        '### trade-imports-stub'
      ])
      expect(preview).toContain(
        '### trade-imports-animals-backend\n- keyDesignDecisions: 0\n- edgeCases: 3\n- failureModes: 2\n'
      )
    }))

  test('Should refuse a check with no questions.json', () =>
    withStaged((root) => {
      expect(() =>
        renderPreview({ workspaceRoot: root, ticket: 'EUDPA-206' })
      ).toThrow('questions.json not found — generate questions first')
    }))
})

describe('#writeReport', () => {
  test('Should escape pipes in the per-question table as the report has always shown them', () =>
    withStaged((root) => {
      const { path } = writeReport({ workspaceRoot: root, ticket: 'EUDPA-204' })

      expect(readFileSync(path, 'utf8')).toContain(
        '| Q1 | architecture | PASS | Names the Q1 \\\\| reason |  |'
      )
    }))

  test('Should print the summary as the ticket summary when there is no ticket.md', () =>
    withStaged((root) => {
      useSummaryWithNoTicketFile(root, 'Plain summary')

      const { path } = writeReport({ workspaceRoot: root, ticket: 'EUDPA-204' })

      expect(readFileSync(path, 'utf8')).toContain(
        '## 2. Ticket summary\n\nPlain summary\n\n## 3. Change summary'
      )
    }))

  test('Should print no ticket summary line for a summary echo reads as -n', () =>
    withStaged((root) => {
      useSummaryWithNoTicketFile(root, '-n')

      const { path } = writeReport({ workspaceRoot: root, ticket: 'EUDPA-204' })

      expect(readFileSync(path, 'utf8')).toContain(
        '## 2. Ticket summary\n\n\n## 3. Change summary'
      )
    }))

  test('Should print an empty ticket summary line for a summary echo reads as -e', () =>
    withStaged((root) => {
      useSummaryWithNoTicketFile(root, '-eE')

      const { path } = writeReport({ workspaceRoot: root, ticket: 'EUDPA-204' })

      expect(readFileSync(path, 'utf8')).toContain(
        '## 2. Ticket summary\n\n\n\n## 3. Change summary'
      )
    }))

  test('Should take at most 20 lines of the ticket description', () =>
    withStaged((root) => {
      const { path } = writeReport({ workspaceRoot: root, ticket: 'EUDPA-208' })

      expect(readFileSync(path, 'utf8')).toContain(
        'Line 20\n\n## 3. Change summary'
      )
      expect(readFileSync(path, 'utf8')).not.toContain('Line 21')
    }))

  test('Should refuse a check with no transcript.json and write no report', () =>
    withStaged((root) => {
      expect(() =>
        writeReport({ workspaceRoot: root, ticket: 'EUDPA-209' })
      ).toThrow('transcript.json not found — finish the interview first')
      expect(
        existsSync(join(checkFolderIn(root, 'EUDPA-209'), 'report.md'))
      ).toBe(false)
    }))
})
