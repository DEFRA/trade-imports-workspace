/**
 * Whether a capability path falls under a `--capability` scope: the scope
 * itself or one of its descendants. With no scope, everything is in scope.
 * `capabilityPath` is guarded rather than assumed a string — a delegated
 * openspec-validate finding can carry an undefined `capability`.
 *
 * @param {unknown} capabilityPath
 * @param {string} [scopeCapability]
 * @returns {boolean}
 */
export const inScope = (capabilityPath, scopeCapability) =>
  !scopeCapability ||
  (typeof capabilityPath === 'string' &&
    (capabilityPath === scopeCapability ||
      capabilityPath.startsWith(`${scopeCapability}/`)))
