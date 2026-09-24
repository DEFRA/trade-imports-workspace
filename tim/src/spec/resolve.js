/**
 * Whether a coverage link's recorded test name resolves to a real test.
 * Two ordered tiers, deliberately narrow: the runner's own list-mode
 * index first — exact match on the leaf title, or the full " > "-joined
 * title, against the link's `file` made repo-relative the same way the
 * index was; then, Java only, a literal substring match of the method
 * name in the source (method names are never parameterised, so grep is
 * correct there and a lister is not worth building for 3 links). No
 * template fallback: a blanket "grep as fallback" would swallow
 * `SCN-ADDR-001-B`, whose recorded title is a truncation of the real
 * one — only exact index matching catches that.
 *
 * @param {object} args
 * @param {{type: string, file: string, test: string}} args.link
 * @param {Record<string, {file: string, title: string, fullTitle: string}[]>} [args.index] - This repo's runner index, by type
 * @param {string} [args.javaSourceText] - The named file's source text, Java repos only
 * @returns {{resolved: boolean, tier: 'runner-index'|'java-grep'|null}}
 */
export const resolveLink = ({ link, index, javaSourceText }) => {
  const entries = index?.[link.type] ?? []
  const runnerMatch = entries.some(
    (entry) =>
      entry.file === link.file &&
      (entry.title === link.test || entry.fullTitle === link.test)
  )
  if (runnerMatch) return { resolved: true, tier: 'runner-index' }

  if (javaSourceText !== undefined && javaSourceText.includes(link.test)) {
    return { resolved: true, tier: 'java-grep' }
  }

  return { resolved: false, tier: null }
}
