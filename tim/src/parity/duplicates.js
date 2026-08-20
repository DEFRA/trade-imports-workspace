import { readAuthored } from './yield.js'
import { findingsDir } from './ingest.js'

/**
 * Words that carry no signal about what a finding is about.
 *
 * Ordinary English glue, plus the two words every comparison title contains by
 * construction. A contract that asks for "the requirements side asks X; the
 * implementation does Y" puts both side names in every single title, so leaving
 * them in would score every pair of findings alike and the ranking would say
 * nothing.
 */
export const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'both', 'but', 'by',
  'can', 'cannot', 'do', 'does', 'each', 'for', 'from', 'has', 'have', 'in',
  'into', 'is', 'it', 'its', 'no', 'not', 'of', 'on', 'one', 'only', 'or',
  'per', 'so', 'than', 'that', 'the', 'their', 'them', 'then', 'there',
  'these', 'they', 'this', 'to', 'two', 'under', 'up', 'was', 'were', 'what',
  'when', 'where', 'which', 'while', 'with', 'would'
])

/**
 * The words in a title that say what it is about.
 *
 * @param {string} title
 * @param {Set<string>} noise - Stopwords plus this corpus's side names
 * @returns {Set<string>}
 */
export const contentTokens = (title, noise) =>
  new Set(
    String(title ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !noise.has(word))
  )

/**
 * Every word this corpus puts in a title whatever the finding is.
 *
 * Read from the profile rather than listed, so a comparison whose sides are not
 * called frontend and prototype gets the same treatment without a code change.
 *
 * @param {object} profile
 * @returns {Set<string>}
 */
export const noiseFor = (profile) => {
  const words = new Set(STOPWORDS)
  for (const side of profile.sides ?? []) {
    for (const label of [side.id, side.label, ...(side.paragraphLabels ?? [])]) {
      for (const word of String(label ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
        if (word) words.add(word)
      }
    }
  }
  return words
}

const overlap = (a, b) => {
  const shared = [...a].filter((item) => b.has(item))
  return { shared, size: shared.length }
}

/**
 * How alike two titles are, as a share of the words either uses.
 *
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @returns {number} 0 to 1
 */
export const titleSimilarity = (a, b) => {
  if (a.size === 0 || b.size === 0) return 0
  const shared = overlap(a, b).size
  return shared / (a.size + b.size - shared)
}

/** A control entry is a bare string or an object naming a field or a label. */
const controlKey = (control) =>
  typeof control === 'string'
    ? control.toLowerCase()
    : String(control?.name ?? control?.text ?? '').toLowerCase()

const setOf = (list, key = (x) => x) =>
  new Set((Array.isArray(list) ? list : []).map(key).filter(Boolean))

/**
 * Turn one authored file into the three things a duplicate is judged on.
 *
 * @param {object} args
 * @param {{file: string, raw: object}} args.entry
 * @param {Set<string>} args.noise
 * @returns {object}
 */
export const shapeOf = ({ entry, noise }) => ({
  file: entry.file,
  slice: entry.raw?.slice ?? null,
  title: entry.raw?.title ?? '',
  screens: setOf(entry.raw?.screens),
  controls: setOf(entry.raw?.controls, controlKey),
  words: contentTokens(entry.raw?.title, noise)
})

/**
 * Three ways two findings can be the same change, and the threshold for each.
 *
 * A shared screen alone means almost nothing — a page yields a dozen findings —
 * so a shared screen has to arrive with a similar sentence or a shared control.
 * A very similar sentence on its own qualifies without either, because the same
 * change written up against two different screens is exactly the leak this
 * looks for and there is nothing else to spot it by.
 */
export const RULES = [
  {
    id: 'screen-and-wording',
    threshold: 0.3,
    why: 'they name the same screen and describe it in much the same words'
  },
  {
    id: 'screen-and-control',
    why: 'they name the same screen and the same control'
  },
  {
    id: 'wording',
    threshold: 0.6,
    why: 'the two titles say nearly the same thing, on different screens'
  }
]

/**
 * Judge one pair.
 *
 * @param {object} a - From shapeOf
 * @param {object} b - From shapeOf
 * @returns {object|null} A candidate, or null where nothing fires
 */
export const judgePair = (a, b) => {
  const screens = overlap(a.screens, b.screens)
  const controls = overlap(a.controls, b.controls)
  const similarity = titleSimilarity(a.words, b.words)

  const fired = []
  if (screens.size && similarity >= RULES[0].threshold) fired.push(RULES[0])
  if (screens.size && controls.size) fired.push(RULES[1])
  if (similarity >= RULES[2].threshold) fired.push(RULES[2])
  if (fired.length === 0) return null

  return {
    files: [a.file, b.file],
    slices: [a.slice, b.slice],
    crossSlice: a.slice !== b.slice,
    titles: [a.title, b.title],
    sharedScreens: screens.shared,
    sharedControls: controls.shared,
    similarity: Number(similarity.toFixed(2)),
    rules: fired.map((rule) => rule.id),
    why: fired.map((rule) => rule.why),
    // Cross-slice first, then how alike. A same-slice duplicate is the one
    // thing the verification pass does look for; a cross-slice one is seen by
    // nobody, because verifiers are paired per slice and never see two at once.
    score: similarity + screens.size * 0.2 + controls.size * 0.2
  }
}

/**
 * Candidate duplicates across the whole corpus at once.
 *
 * **This finds candidates and strikes nothing.** Whether two findings are one
 * change is a judgement about what a person would do about them, and no measure
 * of two sentences settles it. What the measure can do is put the pairs worth
 * reading in front of an agent, which is more than the pipeline had: verifiers
 * are paired per slice and never see two slices at once, so a cross-slice
 * duplicate is currently caught only when it happens to be large enough for
 * somebody to notice.
 *
 * @param {object} args
 * @param {object} args.profile - A loaded corpus profile
 * @param {boolean} [args.all] - Include same-slice pairs
 * @returns {object}
 */
export const runDuplicates = ({ profile, all = false }) => {
  const dir = findingsDir(profile)
  const { findings, unreadable, found } = readAuthored(dir)
  const noise = noiseFor(profile)
  const shapes = findings.map((entry) => shapeOf({ entry, noise }))

  const candidates = []
  for (let i = 0; i < shapes.length; i += 1) {
    for (let j = i + 1; j < shapes.length; j += 1) {
      const candidate = judgePair(shapes[i], shapes[j])
      if (!candidate) continue
      if (!all && !candidate.crossSlice) continue
      candidates.push(candidate)
    }
  }

  candidates.sort(
    (a, b) =>
      Number(b.crossSlice) - Number(a.crossSlice) || b.score - a.score
  )

  return {
    findingsDir: dir,
    findingsDirFound: found,
    total: findings.length,
    compared: all ? 'every pair' : 'pairs from different slices',
    candidates,
    crossSlice: candidates.filter((entry) => entry.crossSlice).length,
    unreadable,
    exitNonZero: false
  }
}

/**
 * @param {object} result - From runDuplicates
 * @returns {string}
 */
export const renderDuplicates = (result) => {
  if (!result.findingsDirFound) {
    return `No findings at ${result.findingsDir} yet. Nothing to compare.`
  }
  if (result.candidates.length === 0) {
    return `${result.total} findings, ${result.compared} compared, no candidate duplicates. That is not proof there are none — this measures two sentences, and whether two findings are one change is a judgement about what a person would do about them.`
  }

  const lines = [
    `${result.candidates.length} candidate duplicates across ${result.total} findings, ${result.crossSlice} of them across slices.`,
    'Read each pair and decide. Nothing here has been struck, and nothing here should be struck by a count.'
  ]
  for (const entry of result.candidates) {
    lines.push('')
    lines.push(
      `  ${entry.files[0]}  [${entry.slices[0]}]${entry.crossSlice ? '  ACROSS SLICES' : ''}`
    )
    lines.push(`  ${entry.files[1]}  [${entry.slices[1]}]`)
    lines.push(`    ${entry.why.join('; ')}`)
    lines.push(`    "${entry.titles[0]}"`)
    lines.push(`    "${entry.titles[1]}"`)
    if (entry.sharedScreens.length) {
      lines.push(`    shared screens: ${entry.sharedScreens.join(', ')}`)
    }
    if (entry.sharedControls.length) {
      lines.push(`    shared controls: ${entry.sharedControls.join(', ')}`)
    }
  }
  return lines.join('\n')
}
