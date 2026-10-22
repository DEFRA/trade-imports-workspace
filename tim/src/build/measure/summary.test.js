import { describe, test, expect } from 'vitest'
import { outcomeLines, summariseSamples } from './summary.js'

const sample = (overrides) => ({
  load1: 2,
  freePercent: 60,
  hostUsedGiB: 9,
  swapUsedMiB: 1000,
  swapouts: 100,
  pageouts: 50,
  dockerMiB: 0,
  dockerCpuPercent: 0,
  containers: [],
  shellStartMs: 10,
  ...overrides
})

describe('#summariseSamples', () => {
  test('Should report the peaks, the lowest free memory and how far the swap counters rose', () => {
    const samples = [
      sample({}),
      sample({
        load1: 9.5,
        freePercent: 21,
        hostUsedGiB: 14.256,
        swapUsedMiB: 2500,
        swapouts: 900,
        pageouts: 70,
        shellStartMs: 400
      }),
      sample({ load1: 4, swapUsedMiB: 2000, swapouts: 1000, pageouts: 80 })
    ]

    const summary = summariseSamples(samples)

    expect(summary).toMatchObject({
      samples: 3,
      peakLoad1: 9.5,
      lowestFreePercent: 21,
      peakHostUsedGiB: 14.26,
      swapStartMiB: 1000,
      swapPeakMiB: 2500,
      swapoutPages: 900,
      pageoutPages: 30,
      shellStartMs: { median: 10, p95: 400, max: 400 }
    })
  })

  test('Should name the five biggest containers at the moment docker used the most memory', () => {
    const containers = [600, 100, 500, 400, 300, 200].map((mib, index) => ({
      name: `c${index}`,
      mib,
      cpuPercent: 1
    }))
    const samples = [
      sample({ dockerMiB: 900, containers: containers.slice(0, 2) }),
      sample({ dockerMiB: 2100, dockerCpuPercent: 250, containers })
    ]

    const summary = summariseSamples(samples)

    expect({
      peakDockerMiB: summary.peakDockerMiB,
      peakDockerCpuPercent: summary.peakDockerCpuPercent,
      dockerAtPeak: summary.dockerAtPeak.map(({ name }) => name)
    }).toEqual({
      peakDockerMiB: 2100,
      peakDockerCpuPercent: 250,
      dockerAtPeak: ['c0', 'c2', 'c3', 'c4', 'c5']
    })
  })

  test('Should give nulls when a reading was never available, as on a machine without vm_stat', () => {
    const summary = summariseSamples([
      sample({ freePercent: null, swapUsedMiB: null, swapouts: null })
    ])

    expect({
      lowestFreePercent: summary.lowestFreePercent,
      swapPeakMiB: summary.swapPeakMiB,
      swapoutPages: summary.swapoutPages
    }).toEqual({
      lowestFreePercent: null,
      swapPeakMiB: null,
      swapoutPages: null
    })
  })
})

describe('#outcomeLines', () => {
  test('Should keep the Playwright and Maven result lines from a log', () => {
    const log = [
      'Running 591 tests using 2 workers',
      '  ✓  1 [features] › a.fit.spec.js:1:1 › passes (2.0s)',
      'Timed out waiting 900s for the test suite to run',
      '  72 did not run',
      '  519 passed (15.0m)',
      '[INFO] Tests run: 120, Failures: 0, Errors: 0, Skipped: 0',
      '[INFO] BUILD SUCCESS'
    ].join('\n')

    expect(outcomeLines(log)).toEqual([
      'Timed out waiting 900s for the test suite to run',
      '72 did not run',
      '519 passed (15.0m)',
      '[INFO] Tests run: 120, Failures: 0, Errors: 0, Skipped: 0',
      '[INFO] BUILD SUCCESS'
    ])
  })
})
