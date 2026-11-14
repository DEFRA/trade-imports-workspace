const stripTags = (html) => html.replace(/<[^>]+>/g, '')

const decodeEntities = (html) =>
  html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )

const strippedAndTrimmed = (html) => stripTags(html).trim()

const convertInline = (html) =>
  html
    .replace(
      /<strong[^>]*>([\s\S]*?)<\/strong>/gi,
      (_, text) => `**${strippedAndTrimmed(text)}**`
    )
    .replace(
      /<b[^>]*>([\s\S]*?)<\/b>/gi,
      (_, text) => `**${strippedAndTrimmed(text)}**`
    )
    .replace(
      /<em[^>]*>([\s\S]*?)<\/em>/gi,
      (_, text) => `*${strippedAndTrimmed(text)}*`
    )
    .replace(
      /<i[^>]*>([\s\S]*?)<\/i>/gi,
      (_, text) => `*${strippedAndTrimmed(text)}*`
    )
    .replace(
      /<code[^>]*>([\s\S]*?)<\/code>/gi,
      (_, text) => `\`${decodeEntities(stripTags(text))}\``
    )
    .replace(
      /<(?:s|strike|del)[^>]*>([\s\S]*?)<\/(?:s|strike|del)>/gi,
      (_, text) => `~~${strippedAndTrimmed(text)}~~`
    )
    .replace(
      /<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_, href, text) => `[${strippedAndTrimmed(text)}](${href})`
    )
    .replace(
      /<a[^>]+href='([^']*)'[^>]*>([\s\S]*?)<\/a>/gi,
      (_, href, text) => `[${strippedAndTrimmed(text)}](${href})`
    )
    .replace(
      /<img[^>]+alt="([^"]*)"[^>]+src="([^"]*)"[^>]*\/?>/gi,
      (_, alt, src) => `![${alt}](${src})`
    )
    .replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gi, (_, src) => `![](${src})`)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(span|abbr|mark|time|cite|q|small|sub|sup)[^>]*>/gi, '')

const convertListItems = (content, { ordered }) => {
  let counter = 0
  return content
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, itemContent) => {
      counter++
      const bullet = ordered ? `${counter}.` : '-'
      const text = strippedAndTrimmed(convertInline(itemContent)).replace(
        /\n/g,
        '\n   '
      )
      return `${bullet} ${text}\n`
    })
    .trim()
}

const convertListsOnce = (html) =>
  html
    .replace(
      /<ul[^>]*>([\s\S]*?)<\/ul>/gi,
      (_, content) => `\n${convertListItems(content, { ordered: false })}\n`
    )
    .replace(
      /<ol[^>]*>([\s\S]*?)<\/ol>/gi,
      (_, content) => `\n${convertListItems(content, { ordered: true })}\n`
    )

const convertLists = (html) => {
  let previous
  let converted = html
  do {
    previous = converted
    converted = convertListsOnce(converted)
  } while (converted !== previous)
  return converted
}

const tableCellText = (cellHtml) =>
  strippedAndTrimmed(convertInline(cellHtml)).replace(/\|/g, '\\|')

const tableRows = (tableHtml) =>
  [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(([, rowHtml]) =>
      [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        ([, cellHtml]) => tableCellText(cellHtml)
      )
    )
    .filter((cells) => cells.length > 0)

const pipeRow = (cells, columnCount) =>
  `| ${[...cells, ...Array(columnCount - cells.length).fill('')].join(' | ')} |`

const convertTable = (tableHtml) => {
  const rows = tableRows(tableHtml)
  if (rows.length === 0) return ''
  const columnCount = Math.max(...rows.map((cells) => cells.length))
  const separator = pipeRow(Array(columnCount).fill('---'), columnCount)
  const [header, ...body] = rows.map((cells) => pipeRow(cells, columnCount))
  return `\n${[header, separator, ...body].join('\n')}\n`
}

const fencedCode = (language, code) => `\n\`\`\`${language}\n${code}\n\`\`\`\n`

const convertHeadings = (html) =>
  [6, 5, 4, 3, 2, 1].reduce(
    (converted, level) =>
      converted.replace(
        new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi'),
        (_, content) =>
          `\n${'#'.repeat(level)} ${strippedAndTrimmed(content)}\n`
      ),
    html
  )

/**
 * Markdown for a Confluence export-view HTML body, ending in one newline.
 *
 * @param {string} html
 * @returns {string}
 */
export const htmlToMarkdown = (html) => {
  const blocks = convertHeadings(
    html
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<\/?(html|body)[^>]*>/gi, '')
      .replace(
        /<pre[^>]*>\s*<code[^>]*class="[^"]*language-(\w+)[^"]*"[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
        (_, language, code) => fencedCode(language, decodeEntities(code).trim())
      )
      .replace(
        /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
        (_, code) => fencedCode('', decodeEntities(code).trim())
      )
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) =>
        fencedCode('', decodeEntities(stripTags(code)).trim())
      )
  )
    .replace(
      /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
      (_, content) =>
        `${htmlToMarkdown(content)
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')}\n`
    )
    .replace(/<table[\s\S]*?<\/table>/gi, convertTable)
    .replace(/<hr[^>]*\/?>/gi, '\n---\n')

  const markdown = decodeEntities(
    stripTags(
      convertInline(
        convertLists(blocks)
          .replace(
            /<p[^>]*>([\s\S]*?)<\/p>/gi,
            (_, content) => `\n${strippedAndTrimmed(convertInline(content))}\n`
          )
          .replace(
            /<\/?(?:div|section|article|main|header|footer|nav|aside)[^>]*>/gi,
            '\n'
          )
      )
    )
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return `${markdown}\n`
}
