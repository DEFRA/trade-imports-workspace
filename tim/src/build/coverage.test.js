import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  commitAll,
  createRepoOnBranchFromMain,
  writeFiles
} from '../test-support/branched-repo.js'
import { newCodeCoverage } from './coverage.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const FIVE_LINES = ['one', 'two', 'three', 'four', 'five']
  .map((word) => `export const ${word} = () => '${word}'`)
  .join('\n')

const lcov = (file, lines) =>
  [
    'TN:',
    `SF:${file}`,
    ...lines.map(({ line, hits }) => `DA:${line},${hits}`),
    'end_of_record',
    ''
  ].join('\n')

const lcovWithBranches = (file, lines, branches) =>
  [
    'TN:',
    `SF:${file}`,
    ...lines.map(({ line, hits }) => `DA:${line},${hits}`),
    ...branches.map(
      ({ line, branch, taken }) => `BRDA:${line},0,${branch},${taken}`
    ),
    'end_of_record',
    ''
  ].join('\n')

// Jacoco writes the whole report on one line, as this does.
const jacoco = (packageName, sourcefile, lines) =>
  [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">',
    '<report name="x">',
    `<package name="${packageName}">`,
    `<class name="${packageName}/${sourcefile.replace('.java', '')}" sourcefilename="${sourcefile}">`,
    '<counter type="LINE" missed="1" covered="4"/></class>',
    `<sourcefile name="${sourcefile}">`,
    ...lines.map(
      ({ line, covered, missedBranches = 0, coveredBranches = 0 }) =>
        `<line nr="${line}" mi="${covered ? 0 : 1}" ci="${covered ? 1 : 0}" mb="${missedBranches}" cb="${coveredBranches}"/>`
    ),
    '</sourcefile></package></report>'
  ].join('')

const everyLineCovered = (count, hits) =>
  Array.from({ length: count }, (_, index) => ({ line: index + 1, hits }))

const branchedRepoWith = async (files) => {
  root = mkdtempSync(join(tmpdir(), 'tim-coverage-'))
  await createRepoOnBranchFromMain(root, files)
}

describe('newCodeCoverage', () => {
  test('reads the Node report the test rung wrote and reports the added lines it covers', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'src/added.js': FIVE_LINES,
      'coverage/lcov.info': lcov('src/added.js', everyLineCovered(5, 3))
    })
    await commitAll(root, 'add five covered lines')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      percent: outcome.percent,
      floorMet: outcome.floorMet,
      files: outcome.files.map(({ file, lines, covered }) => ({
        file,
        lines,
        covered
      }))
    }).toEqual({
      percent: 100,
      floorMet: true,
      files: [{ file: 'src/added.js', lines: 5, covered: 5 }]
    })
  })

  test('fails the floor and names every uncovered added line', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'src/added.js': FIVE_LINES,
      'coverage/lcov.info': lcov('src/added.js', [
        { line: 1, hits: 2 },
        { line: 2, hits: 0 },
        { line: 3, hits: 0 },
        { line: 4, hits: 1 },
        { line: 5, hits: 1 }
      ])
    })
    await commitAll(root, 'add five lines, three covered')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      percent: outcome.percent,
      floorMet: outcome.floorMet,
      uncovered: outcome.files[0].uncovered
    }).toEqual({ percent: 60, floorMet: false, uncovered: [2, 3] })
  })

  test('counts an uncovered condition against the number, as the gate does', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'src/added.js': FIVE_LINES,
      'coverage/lcov.info': lcovWithBranches(
        'src/added.js',
        everyLineCovered(5, 1),
        [
          { line: 3, branch: 0, taken: 1 },
          { line: 3, branch: 1, taken: '-' }
        ]
      )
    })
    await commitAll(root, 'add five covered lines, one branch missed')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      toCover: outcome.toCover,
      met: outcome.met,
      floorMet: outcome.floorMet,
      uncovered: outcome.files[0].uncovered
    }).toEqual({ toCover: 7, met: 6, floorMet: false, uncovered: [3] })
  })

  test('counts a line the report gives branches but no hit count as conditions, not as an uncovered line', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'src/added.js': FIVE_LINES,
      'coverage/lcov.info': lcovWithBranches(
        'src/added.js',
        [
          { line: 1, hits: 1 },
          { line: 2, hits: 1 },
          { line: 4, hits: 1 },
          { line: 5, hits: 1 }
        ],
        [
          { line: 3, branch: 0, taken: 6 },
          { line: 3, branch: 1, taken: 22 }
        ]
      )
    })
    await commitAll(root, 'add a ternary whose hits sit on the line above')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      lines: outcome.files[0].lines,
      conditions: outcome.files[0].conditions,
      uncovered: outcome.files[0].uncovered,
      percent: outcome.percent
    }).toEqual({ lines: 4, conditions: 2, uncovered: [], percent: 100 })
  })

  test('counts every line of an untracked file the branch has not committed yet', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'coverage/lcov.info': lcov('src/added.js', everyLineCovered(5, 0))
    })
    await commitAll(root, 'write the report')
    writeFiles(root, { 'src/added.js': FIVE_LINES })

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      percent: outcome.percent,
      files: outcome.files.map(({ file, lines }) => ({ file, lines }))
    }).toEqual({ percent: 0, files: [{ file: 'src/added.js', lines: 5 }] })
  })

  test('leaves out a changed file the report does not name, such as a test', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'src/added.js': FIVE_LINES,
      'src/added.test.js': FIVE_LINES,
      'coverage/lcov.info': lcov('src/added.js', everyLineCovered(5, 1))
    })
    await commitAll(root, 'add a file and its test')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect(outcome.files.map(({ file }) => file)).toEqual(['src/added.js'])
  })

  test('leaves out a line the branch did not touch', async () => {
    await branchedRepoWith({
      'src/added.js': `${FIVE_LINES}\n`,
      'coverage/lcov.info': lcov('src/added.js', everyLineCovered(5, 0))
    })
    writeFiles(root, {
      'src/added.js': `${FIVE_LINES}\nexport const six = () => 'six'\n`,
      'coverage/lcov.info': lcov('src/added.js', [
        ...everyLineCovered(5, 0),
        { line: 6, hits: 4 }
      ])
    })
    await commitAll(root, 'add a sixth covered line to an uncovered file')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      percent: outcome.percent,
      lines: outcome.files[0].lines
    }).toEqual({ percent: 100, lines: 1 })
  })

  test('reads a Node report in a sub-project, whose paths are its own folder’s', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'tim/package.json': '{"name":"tim"}',
      'tim/src/added.js': FIVE_LINES,
      'tim/coverage/lcov.info': lcov('src/added.js', [
        ...everyLineCovered(4, 1),
        { line: 5, hits: 0 }
      ])
    })
    await commitAll(root, 'add a sub-project')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      reports: outcome.reports,
      files: outcome.files.map(({ file, lines, uncovered }) => ({
        file,
        lines,
        uncovered
      }))
    }).toEqual({
      reports: ['tim/coverage/lcov.info'],
      files: [{ file: 'tim/src/added.js', lines: 5, uncovered: [5] }]
    })
  })

  test('reads a Java report, matching a source file by its package path', async () => {
    await branchedRepoWith({ 'pom.xml': '<project/>' })
    writeFiles(root, {
      'src/main/java/uk/gov/defra/Address.java': FIVE_LINES,
      'target/site/jacoco/jacoco.xml': jacoco('uk/gov/defra', 'Address.java', [
        { line: 1, covered: true },
        { line: 2, covered: true },
        { line: 3, covered: false },
        { line: 4, covered: true },
        { line: 5, covered: true }
      ])
    })
    await commitAll(root, 'add a Java file')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      file: outcome.files[0].file,
      percent: outcome.percent,
      uncovered: outcome.files[0].uncovered
    }).toEqual({
      file: 'src/main/java/uk/gov/defra/Address.java',
      percent: 80,
      uncovered: [3]
    })
  })

  test('reads a Java report beside each module’s own pom', async () => {
    await branchedRepoWith({ 'pom.xml': '<project/>' })
    writeFiles(root, {
      'service/pom.xml': '<project/>',
      'service/src/main/java/uk/gov/defra/Address.java': FIVE_LINES,
      'service/target/site/jacoco/jacoco.xml': jacoco(
        'uk/gov/defra',
        'Address.java',
        everyLineCovered(5, 1).map(({ line }) => ({ line, covered: true }))
      )
    })
    await commitAll(root, 'add a module')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({ reports: outcome.reports, percent: outcome.percent }).toEqual({
      reports: ['service/target/site/jacoco/jacoco.xml'],
      percent: 100
    })
  })

  test('leaves out a file sonar.coverage.exclusions names, as the gate does', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'sonar-project.properties': [
        'sonar.sources=src/',
        'sonar.coverage.exclusions=src/client/**',
        ''
      ].join('\n'),
      'src/server/added.js': FIVE_LINES,
      'src/client/untested.js': FIVE_LINES,
      'coverage/lcov.info': [
        lcov('src/server/added.js', everyLineCovered(5, 1)),
        lcov('src/client/untested.js', everyLineCovered(5, 0))
      ].join('')
    })
    await commitAll(root, 'add a server file and an excluded client one')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      files: outcome.files.map(({ file }) => file),
      percent: outcome.percent
    }).toEqual({ files: ['src/server/added.js'], percent: 100 })
  })

  test('leaves out a file sonar.exclusions names, such as a test helper', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'sonar-project.properties': [
        'sonar.sources=src/',
        'sonar.exclusions=src/**/fit/**',
        ''
      ].join('\n'),
      'src/server/added.js': FIVE_LINES,
      'src/server/fit/helper.js': FIVE_LINES,
      'coverage/lcov.info': [
        lcov('src/server/added.js', everyLineCovered(5, 1)),
        lcov('src/server/fit/helper.js', everyLineCovered(5, 0))
      ].join('')
    })
    await commitAll(root, 'add a server file and a fit helper')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect(outcome.files.map(({ file }) => file)).toEqual([
      'src/server/added.js'
    ])
  })

  test('leaves out a file outside sonar.sources', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'sonar-project.properties': 'sonar.sources=src/\n',
      'scripts/tool.js': FIVE_LINES,
      'coverage/lcov.info': lcov('scripts/tool.js', everyLineCovered(5, 0))
    })
    await commitAll(root, 'add a script outside the sources')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({ files: outcome.files, percent: outcome.percent }).toEqual({
      files: [],
      percent: null
    })
  })

  test('reads the exclusions a Maven project keeps in its pom', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'pom.xml': [
        '<project><properties>',
        '<sonar.coverage.exclusions>src/main/java/uk/gov/defra/Generated.java</sonar.coverage.exclusions>',
        '</properties></project>'
      ].join('\n'),
      'src/main/java/uk/gov/defra/Generated.java': FIVE_LINES,
      'target/site/jacoco/jacoco.xml': jacoco(
        'uk/gov/defra',
        'Generated.java',
        [
          { line: 1, covered: false },
          { line: 2, covered: false },
          { line: 3, covered: false },
          { line: 4, covered: false },
          { line: 5, covered: false }
        ]
      )
    })
    await commitAll(root, 'add an excluded generated class')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({ files: outcome.files, floorMet: outcome.floorMet }).toEqual({
      files: [],
      floorMet: true
    })
  })

  test('meets the floor when the branch added nothing the report measures', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'coverage/lcov.info': lcov('src/old.js', everyLineCovered(5, 0)),
      'docs/notes.md': 'a note'
    })
    await commitAll(root, 'add a note')

    const outcome = await newCodeCoverage({ repoPath: root })

    expect({
      percent: outcome.percent,
      floorMet: outcome.floorMet,
      files: outcome.files
    }).toEqual({ percent: null, floorMet: true, files: [] })
  })

  test('takes the floor it is given', async () => {
    await branchedRepoWith({ 'README.md': 'x' })
    writeFiles(root, {
      'src/added.js': FIVE_LINES,
      'coverage/lcov.info': lcov('src/added.js', [
        { line: 1, hits: 1 },
        { line: 2, hits: 1 },
        { line: 3, hits: 1 },
        { line: 4, hits: 1 },
        { line: 5, hits: 0 }
      ])
    })
    await commitAll(root, 'add five lines, four covered')

    const outcome = await newCodeCoverage({ repoPath: root, floor: 75 })

    expect({ percent: outcome.percent, floorMet: outcome.floorMet }).toEqual({
      percent: 80,
      floorMet: true
    })
  })

  test('refuses when no coverage report has been written, naming where it looked', async () => {
    await branchedRepoWith({ 'src/added.js': FIVE_LINES })

    await expect(newCodeCoverage({ repoPath: root })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('coverage/lcov.info')
    })
  })

  test('refuses a base it cannot find', async () => {
    await branchedRepoWith({ 'README.md': 'x' })

    await expect(
      newCodeCoverage({ repoPath: root, base: 'origin/nope' })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('origin/nope')
    })
  })
})
