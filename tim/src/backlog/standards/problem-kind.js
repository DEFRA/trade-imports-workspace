/**
 * The `kind` tags a standards problem carries — shared between the
 * producers (`standards.js`, `claude-chain.js`) and `standards.js`'s own
 * `problemMessage` consumer, so a typo at either end fails loudly instead
 * of silently falling through to the generic message.
 */
export const PROBLEM_KIND = {
  TOPIC_DIR: 'topic-dir',
  IMPORT: 'import',
  ROUTING: 'routing',
  RULE_POINTER: 'rule-pointer'
}
