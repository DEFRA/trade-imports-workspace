/**
 * A finding factory bound to one check name — `{ check, capability, message }`,
 * the shape every `checks/*.js` module returns. Named once rather than
 * redeclared per module with only the `check` tag changing.
 *
 * @param {string} check
 * @returns {(capability: string, message: string) => {check: string, capability: string, message: string}}
 */
export const makeFinding = (check) => (capability, message) => ({
  check,
  capability,
  message
})
