// Lightweight HTML -> Markdown converter for the limited, sanitized TipTap tag
// set used in FreiWerk (see server/utils/sanitize.ts). Intentionally dependency
// free: the input is already sanitized and well-formed, so a small set of ordered
// transformations is enough for decision-document exports. Deeply nested lists are
// flattened rather than perfectly reproduced.

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x2F;/gi, '/')
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

function imageToMarkdown(tag: string): string {
  const src = /src="([^"]*)"/i.exec(tag)?.[1] ?? ''
  const alt = /alt="([^"]*)"/i.exec(tag)?.[1] ?? ''
  return src ? `![${alt}](${src})` : ''
}

/** Convert inline-level HTML (bold/italic/code/links/images) to Markdown. */
function inline(html: string): string {
  let s = html
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `**${stripTags(c).trim()}**`)
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `*${stripTags(c).trim()}*`)
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, c) => `\`${stripTags(c)}\``)
  s = s.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href, c) => `[${stripTags(c).trim()}](${href})`,
  )
  s = s.replace(/<img\b[^>]*>/gi, (m) => imageToMarkdown(m))
  s = stripTags(s)
  s = decodeEntities(s)
  return s.replace(/[ \t]+/g, ' ').trim()
}

function listItems(html: string, ordered: boolean): string {
  const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m, i) => {
    const prefix = ordered ? `${i + 1}. ` : '- '
    return `${prefix}${inline(m[1])}`
  })
  return items.join('\n')
}

export function htmlToMarkdown(html: string): string {
  let s = html

  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<hr\s*\/?>/gi, '\n\n---\n\n')

  s = s.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n\n# ${inline(c)}\n\n`)
  s = s.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n\n## ${inline(c)}\n\n`)
  s = s.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n\n### ${inline(c)}\n\n`)

  s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m, c) => {
    const code = decodeEntities(stripTags(c)).replace(/\n+$/g, '')
    return `\n\n\`\`\`\n${code}\n\`\`\`\n\n`
  })

  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => {
    const text = inline(c.replace(/<\/?p\b[^>]*>/gi, '\n'))
    const quoted = text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => `> ${line.trim()}`)
      .join('\n')
    return `\n\n${quoted}\n\n`
  })

  s = s.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_m, c) => `\n\n${listItems(c, false)}\n\n`)
  s = s.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_m, c) => `\n\n${listItems(c, true)}\n\n`)

  s = s.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => `\n\n${inline(c)}\n\n`)

  // Any inline-level remnants outside block elements.
  s = inline(s)

  return s.replace(/\n{3,}/g, '\n\n').trim()
}
