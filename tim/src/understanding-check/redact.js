const SECRET_PATTERNS = [
  /(?<prefix>(?:^|\s|["'`])(?:[A-Z_]*(?:TOKEN|SECRET|PASSWORD|API[_-]?KEY|BEARER|AUTHORIZATION)[A-Z_]*)\s*[:=]\s*)["']?(?<value>[^\s"'`,;}]+)["']?/gi,
  /AKIA[0-9A-Z]{16}/g,
  /ghp_[A-Za-z0-9]{30,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
]

const PRIVATE_KEY_BLOCK =
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g

const REDACTED = '***REDACTED***'

const replacementFor = (matchArguments) => {
  const groups = matchArguments.at(-1)
  return typeof groups === 'object' && groups?.prefix !== undefined
    ? `${groups.prefix}${REDACTED}`
    : REDACTED
}

/**
 * A diff with its secrets replaced, and how many were replaced. A
 * key-value assignment keeps its key; a private-key block counts once.
 *
 * @param {string} text
 * @returns {{text: string, count: number}}
 */
export const redactDiff = (text) => {
  let count = 0
  const countedReplacement = (replacement) => {
    count += 1
    return replacement
  }
  const withoutSecrets = SECRET_PATTERNS.reduce(
    (redacted, pattern) =>
      redacted.replace(pattern, (...matchArguments) =>
        countedReplacement(replacementFor(matchArguments))
      ),
    text
  )
  const withoutKeys = withoutSecrets.replace(PRIVATE_KEY_BLOCK, () =>
    countedReplacement('***REDACTED PRIVATE KEY BLOCK***')
  )
  return { text: withoutKeys, count }
}
