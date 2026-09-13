// Converts Obsidian-style wikilinks [[Title]] into standard Markdown links
// using the custom `wikilink://` scheme, so that `marked` renders
// them as a normal <a> tag, which we then intercept to navigate.
const WIKILINK_REGEX = /\[\[([^[\]]+)\]\]/g

export function preprocessWikilinks(content: string): string {
  return content.replace(WIKILINK_REGEX, (_match, rawTitle: string) => {
    const title = rawTitle.trim()
    const encoded = encodeURIComponent(title)
    return `[${title}](wikilink://${encoded})`
  })
}

// Extracts unique linked titles from raw Markdown, without transforming them.
// Used to auto-create empty notes for unresolved [[links]] on save.
export function extractLinkedTitles(content: string): string[] {
  const matches = [...content.matchAll(WIKILINK_REGEX)]
  const titles = matches.map((match) => match[1].trim()).filter(Boolean)
  return [...new Set(titles.map((t) => t.toLowerCase()))].map(
    (lower) => titles.find((t) => t.toLowerCase() === lower)!,
  )
}