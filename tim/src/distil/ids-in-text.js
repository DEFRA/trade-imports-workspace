import { escapeForRegExp } from '../utils/escape-for-reg-exp.js'

export const namesId = (text, id) =>
  new RegExp(
    `(?<![A-Za-z0-9._-])${escapeForRegExp(id)}(?![A-Za-z0-9_-]|\\.[A-Za-z0-9])`
  ).test(text)
