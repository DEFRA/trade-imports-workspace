import { describe, test, expect, afterEach } from 'vitest'
import {
  crossPartProblems,
  mergedStructureOf,
  partClaimProblems,
  partRangesOf,
  partitionProblems
} from './partition.js'
import {
  PART_STRUCTURES,
  makeDistilWorkspace,
  splitExtractIntoParts
} from '../test-support/distil-workspace.js'

let workspace

afterEach(() => {
  workspace?.remove()
  workspace = undefined
})

const LABEL = 'distil/extract/repo-tests.partition.json'
const SOURCE = { id: 'repo:tests' }

const demoPartition = () => {
  workspace = makeDistilWorkspace()
  return splitExtractIntoParts(workspace)
}

const problemsWith = (edit) => {
  const { partition } = demoPartition()
  return partitionProblems({
    label: LABEL,
    source: SOURCE,
    value: edit(partition),
    schema: workspace.schemas.partition
  })
}

const editPart = (partition, number, edit) => ({
  ...partition,
  parts: partition.parts.map((part) =>
    part.part === number ? edit(part) : part
  )
})

describe('partitionProblems', () => {
  test('passes a partition in shape', () => {
    expect(problemsWith((partition) => partition)).toEqual([])
  })

  test('names a part with nothing to read', () => {
    expect(
      problemsWith((partition) =>
        editPart(partition, 2, (part) => ({ ...part, read: [] }))
      )
    ).toEqual([`${LABEL} parts[1].read needs at least 1 item.`])
  })

  test('refuses a partition with no parts', () => {
    expect(problemsWith((partition) => ({ ...partition, parts: [] }))).toEqual([
      `${LABEL} parts needs at least 1 item.`
    ])
  })

  test('refuses a partition that names another source', () => {
    expect(
      problemsWith((partition) => ({ ...partition, source: 'repo:stub' }))
    ).toEqual([`${LABEL} says it is from "repo:stub", not repo:tests.`])
  })

  test('refuses parts out of order', () => {
    expect(
      problemsWith((partition) => ({
        ...partition,
        parts: partition.parts.toReversed()
      }))
    ).toEqual([
      `${LABEL} lists part 2 where part 1 belongs. Number the parts 1, 2, 3 and on, in order.`,
      `${LABEL} lists part 1 where part 2 belongs. Number the parts 1, 2, 3 and on, in order.`
    ])
  })

  test('refuses two parts with one prefix', () => {
    expect(
      problemsWith((partition) =>
        editPart(partition, 2, (part) => ({ ...part, prefix: 'repo-tests-p1' }))
      )
    ).toEqual([
      `${LABEL} gives the prefix repo-tests-p1 to more than one part. Each part needs a prefix of its own.`
    ])
  })

  test('refuses a prefix that starts another, so their ids could clash', () => {
    expect(
      problemsWith((partition) =>
        editPart(partition, 2, (part) => ({
          ...part,
          prefix: 'repo-tests-p1-extra'
        }))
      )
    ).toEqual([
      `${LABEL} prefix repo-tests-p1-extra starts with the prefix repo-tests-p1, so their claim ids could clash. Use prefixes where neither starts the other.`
    ])
  })

  test('refuses an old claim id kept by two parts', () => {
    expect(
      problemsWith((partition) =>
        editPart(partition, 2, (part) => ({
          ...part,
          keeps: ['tests-010', 'tests-001']
        }))
      )
    ).toEqual([
      `${LABEL} keeps claim tests-001 in more than one part. Give each old claim id to the one part whose slice holds it.`
    ])
  })

  test('refuses keeping a claim a verifier found missing', () => {
    expect(
      problemsWith((partition) =>
        editPart(partition, 2, (part) => ({
          ...part,
          keeps: ['tests-010-m1']
        }))
      )
    ).toEqual([
      `${LABEL} keeps tests-010-m1, which ends in -m<N>: that is a claim a verifier found missing, never an extract claim.`
    ])
  })
})

describe('partClaimProblems', () => {
  const PART_LABEL = 'distil/extract/repo-tests.part2.json'
  const ENTRY = {
    part: 2,
    prefix: 'repo-tests-p2',
    keeps: ['tests-010']
  }
  const claim = (id) => ({ id })

  test('passes new ids under the prefix and the ids the part keeps', () => {
    expect(
      partClaimProblems({
        label: PART_LABEL,
        entry: ENTRY,
        value: { claims: [claim('tests-010'), claim('repo-tests-p2-001')] }
      })
    ).toEqual([])
  })

  test('refuses an id that is neither under the prefix nor kept', () => {
    expect(
      partClaimProblems({
        label: PART_LABEL,
        entry: ENTRY,
        value: { claims: [claim('tests-001'), claim('repo-tests-p1-004')] }
      })
    ).toEqual([
      `${PART_LABEL} has claim ids that are neither part 2's prefix repo-tests-p2 nor an id the partition gives it to keep: tests-001, repo-tests-p1-004. Number new claims repo-tests-p2-001, repo-tests-p2-002 and on.`
    ])
  })

  test('refuses a part with no claims', () => {
    expect(
      partClaimProblems({
        label: PART_LABEL,
        entry: ENTRY,
        value: { claims: [] }
      })
    ).toEqual([
      `${PART_LABEL} has no claims. Part 2 names a slice with something in it: claim every page, field, rule and branch it shows, and record a gap where it is silent.`
    ])
  })
})

describe('crossPartProblems', () => {
  test('names a claim id two parts both use', () => {
    const parts = [
      { entry: { part: 1 }, value: { claims: [{ id: 'tests-001' }] } },
      { entry: { part: 3 }, value: { claims: [{ id: 'tests-001' }] } }
    ]

    expect(crossPartProblems('repo-tests', parts)).toEqual([
      'distil/extract/repo-tests.part1.json and distil/extract/repo-tests.part3.json both have claim tests-001. A claim belongs to one part.'
    ])
  })
})

describe('mergedStructureOf and partRangesOf', () => {
  const partsOf = () => {
    const { partition, partPath } = demoPartition()
    return {
      partition,
      parts: partition.parts.map((entry) => ({
        entry,
        value: workspace.readJson(partPath(entry.part))
      }))
    }
  }

  test("puts the partition's structure first, then each part's", () => {
    const { partition, parts } = partsOf()

    expect(mergedStructureOf(partition, parts)).toBe(
      [
        partition.structure,
        '',
        'Extracted in 2 parts:',
        `Part 1, Suite layout and config: ${PART_STRUCTURES[0]}`,
        `Part 2, Fixtures: ${PART_STRUCTURES[1]}`
      ].join('\n')
    )
  })

  test('gives each part its claim count and first and last id', () => {
    const { parts } = partsOf()

    expect(partRangesOf(parts)).toEqual([
      {
        part: 1,
        title: 'Suite layout and config',
        claims: 3,
        from: 'tests-001',
        to: 'tests-005'
      },
      {
        part: 2,
        title: 'Fixtures',
        claims: 1,
        from: 'tests-010',
        to: 'tests-010'
      }
    ])
  })
})
