/**
 * The exit code `tim spec diff --signed-off` gives when it finds a change
 * to a signed-off scenario, so a caller can tell a finding from a clean
 * run (0) and a usage error (2). Kept apart from `exitCodes.js`, whose
 * constants are each distinct; within `tim spec diff` the number means
 * only this.
 */
export const SIGNED_OFF_CHANGED = 3

/**
 * The exit code `tim spec diff` gives when it could resolve none of the
 * commits or ranges it was asked about, so a caller never reads a report
 * that examined nothing as a Behaviour Spec nothing touched.
 */
export const RESOLVED_NOTHING = 4
