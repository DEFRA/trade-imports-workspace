import { describe, test, expect } from 'vitest'
import {
  dockerContainers,
  freeMemoryPercent,
  oneMinuteLoad,
  swapUsedMiB,
  toMiB,
  vmStatReading
} from './readings.js'

const VM_STAT = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                     6745.
Pages active:                                 372533.
Pages inactive:                               372511.
Pages wired down:                             154525.
Pages occupied by compressor:                 101611.
Pageouts:                                    1319522.
Swapins:                                     5105226.
Swapouts:                                    6295108.
`

describe('#swapUsedMiB', () => {
  test('Should read the used figure from vm.swapusage', () => {
    expect(
      swapUsedMiB(
        'total = 3072.00M  used = 1633.81M  free = 1438.19M  (encrypted)'
      )
    ).toBe(1633.81)
  })

  test('Should give null for text without a used figure', () => {
    expect(swapUsedMiB('')).toBeNull()
  })
})

describe('#oneMinuteLoad', () => {
  test('Should read the first figure of vm.loadavg', () => {
    expect(oneMinuteLoad('{ 2.13 2.08 1.75 }')).toBe(2.13)
  })
})

describe('#freeMemoryPercent', () => {
  test('Should read the free percentage from memory_pressure', () => {
    expect(
      freeMemoryPercent(
        'The system has 17179869184 (1048576 pages with a page size of 16384).\nSystem-wide memory free percentage: 74%\n'
      )
    ).toBe(74)
  })
})

describe('#vmStatReading', () => {
  test('Should count active, wired and compressed pages as used, at the page size vm_stat gives', () => {
    expect(vmStatReading(VM_STAT)).toEqual({
      usedGiB: ((372533 + 154525 + 101611) * 16384) / 1024 ** 3,
      swapouts: 6295108,
      pageouts: 1319522
    })
  })

  test('Should give null for text that is not vm_stat output', () => {
    expect(vmStatReading('command not found')).toBeNull()
  })
})

describe('#toMiB', () => {
  test('Should convert each docker unit to MiB', () => {
    expect(['1.5GiB', '512MiB', '2048KiB', '10B', 'n/a'].map(toMiB)).toEqual([
      1536,
      512,
      2,
      10 / 1024 / 1024,
      0
    ])
  })
})

describe('#dockerContainers', () => {
  test('Should read each container line and skip anything else', () => {
    expect(
      dockerContainers(
        'mongo\t512MiB / 9.7GiB\t3.50%\nbackend\t1.25GiB / 9.7GiB\t101.2%\nWARNING something\n'
      )
    ).toEqual([
      { name: 'mongo', mib: 512, cpuPercent: 3.5 },
      { name: 'backend', mib: 1280, cpuPercent: 101.2 }
    ])
  })
})
