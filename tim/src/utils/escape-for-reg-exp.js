export const escapeForRegExp = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
