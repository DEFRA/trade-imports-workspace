const PRINT_WIDTH = 80
const INDENT = '  '

const isContainer = (value) => value !== null && typeof value === 'object'

const inlineArray = (values) =>
  `[${values.map((value) => JSON.stringify(value)).join(', ')}]`

const fitsInline = (values, room) =>
  values.every((value) => !isContainer(value)) &&
  inlineArray(values).length <= room

const layoutItems = (items, indent, [open, close]) => {
  if (items.length === 0) return `${open}${close}`
  const inner = `${indent}${INDENT}`
  const lines = items.map(({ prefix, value }, index) => {
    const trailing = index < items.length - 1 ? ',' : ''
    const head = `${inner}${prefix}`
    const room = PRINT_WIDTH - head.length - trailing.length
    return `${head}${layoutValue(value, inner, room)}${trailing}`
  })
  return [open, ...lines, `${indent}${close}`].join('\n')
}

const layoutArray = (values, indent, room) =>
  fitsInline(values, room)
    ? inlineArray(values)
    : layoutItems(
        values.map((value) => ({ prefix: '', value })),
        indent,
        ['[', ']']
      )

const layoutObject = (object, indent) =>
  layoutItems(
    Object.entries(object)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({ prefix: `${JSON.stringify(key)}: `, value })),
    indent,
    ['{', '}']
  )

const layoutValue = (value, indent, room) => {
  if (!isContainer(value)) return JSON.stringify(value)
  return Array.isArray(value)
    ? layoutArray(value, indent, room)
    : layoutObject(value, indent)
}

/**
 * JSON text laid out as Prettier lays out a `.json` file: 2-space indents,
 * every object on its own lines, an array of plain values on one line when
 * it fits in 80 columns, and a trailing newline.
 *
 * @param {unknown} value - Keys whose value is undefined are left out
 * @returns {string}
 */
export const prettierJson = (value) =>
  `${layoutValue(value, '', PRINT_WIDTH)}\n`
