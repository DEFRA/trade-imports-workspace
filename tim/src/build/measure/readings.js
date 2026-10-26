const MIB_PER_UNIT = {
  B: 1 / 1024 / 1024,
  KB: 1 / 1024,
  KiB: 1 / 1024,
  kB: 1 / 1024,
  MB: 1,
  MiB: 1,
  GB: 1024,
  GiB: 1024
}

const numberAfter = (text, pattern) => {
  const match = pattern.exec(text ?? '')
  return match ? Number(match[1]) : null
}

/**
 * Swap in use, in MiB, from `sysctl -n vm.swapusage`.
 *
 * @param {string} text - Such as "total = 3072.00M  used = 1633.81M  free = 1438.19M  (encrypted)"
 * @returns {number|null}
 */
export const swapUsedMiB = (text) => numberAfter(text, /used = ([\d.]+)M/)

/**
 * The one-minute load average from `sysctl -n vm.loadavg`.
 *
 * @param {string} text - Such as "{ 2.13 2.08 1.75 }"
 * @returns {number|null}
 */
export const oneMinuteLoad = (text) => numberAfter(text, /\{\s*([\d.]+)/)

/**
 * The share of memory macOS calls free, from `memory_pressure -Q`.
 *
 * @param {string} text
 * @returns {number|null}
 */
export const freeMemoryPercent = (text) =>
  numberAfter(text, /free percentage: (\d+)%/)

const VM_STAT_COUNTERS = {
  active: 'Pages active',
  wired: 'Pages wired down',
  compressor: 'Pages occupied by compressor',
  swapouts: 'Swapouts',
  pageouts: 'Pageouts'
}

const pageSizeOf = (text) =>
  numberAfter(text, /page size of (\d+) bytes/) ?? 4096

const counterOf = (text, label) =>
  numberAfter(text, new RegExp(`${label}:\\s+(\\d+)\\.`)) ?? 0

/**
 * The counters this measure keeps from `vm_stat`, and the memory in use
 * (active, wired and compressed pages) in GiB.
 *
 * @param {string} text
 * @returns {{usedGiB: number, swapouts: number, pageouts: number}|null} null when the text is not vm_stat output
 */
export const vmStatReading = (text) => {
  if (!text?.includes('Mach Virtual Memory Statistics')) return null
  const counters = Object.fromEntries(
    Object.entries(VM_STAT_COUNTERS).map(([key, label]) => [
      key,
      counterOf(text, label)
    ])
  )
  const usedPages = counters.active + counters.wired + counters.compressor
  return {
    usedGiB: (usedPages * pageSizeOf(text)) / 1024 ** 3,
    swapouts: counters.swapouts,
    pageouts: counters.pageouts
  }
}

/**
 * A docker memory figure such as "1.2GiB" or "512MiB", in MiB.
 *
 * @param {string} text
 * @returns {number}
 */
export const toMiB = (text) => {
  const match = /^([\d.]+)\s*([KMG]?i?B|kB)$/.exec(text.trim())
  return match ? Number(match[1]) * MIB_PER_UNIT[match[2]] : 0
}

const containerOf = (line) => {
  const [name, memUsage, cpuPercent] = line.split('\t')
  return {
    name,
    mib: toMiB(memUsage.split('/')[0]),
    cpuPercent: Number(cpuPercent.replace('%', '')) || 0
  }
}

/**
 * Each container's memory and CPU from
 * `docker stats --no-stream --format "{{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"`.
 *
 * @param {string} text
 * @returns {{name: string, mib: number, cpuPercent: number}[]}
 */
export const dockerContainers = (text) =>
  (text ?? '')
    .split('\n')
    .filter((line) => line.split('\t').length === 3)
    .map(containerOf)
