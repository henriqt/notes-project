import { marked, Renderer } from 'marked'
import DOMPurify from 'dompurify'

// Web links open in a new tab, so the side panel itself never navigates away.
// Runs after DOMPurify cleans the attributes, so the target is not removed.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof HTMLAnchorElement)) return
  if (!/^https?:/i.test(node.getAttribute('href') ?? '')) return

  node.setAttribute('target', '_blank')
  node.setAttribute('rel', 'noopener noreferrer')
})

// Same rules as GitHub: lowercase, drop punctuation, spaces become hyphens
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '')
    .replace(/ /g, '-')
}

export function renderNoteHtml(content: string): string {
  // Repeated titles get -1, -2... like on GitHub. Reset on every render.
  const used = new Map<string, number>()
  const renderer = new Renderer()

  renderer.heading = function ({ tokens, depth }) {
    const inner = this.parser.parseInline(tokens)
    // Plain text of the title (no tags, entities decoded) is what the id comes from
    const text = new DOMParser().parseFromString(inner, 'text/html').body.textContent ?? ''

    // Like GitHub: if the id is already taken (even by a literal "foo-1"),
    // keep counting up from the base title until it is free
    const base = slugify(text)
    let id = base
    while (used.has(id)) {
      const next = (used.get(base) ?? 0) + 1
      used.set(base, next)
      id = `${base}-${next}`
    }
    used.set(id, 0)

    return `<h${depth} id="${id}">${inner}</h${depth}>\n`
  }

  const rawHtml = marked.parse(content, { async: false, breaks: true, renderer }) as string

  return DOMPurify.sanitize(rawHtml, { SANITIZE_NAMED_PROPS: true })
}