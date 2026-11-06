import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { preprocessWikilinks } from './wikilinks'

// DOMPurify's default list + the wikilink:// scheme
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|wikilink):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i

// Web links open in a new tab, so the side panel itself never navigates away.
// Runs after DOMPurify cleans the attributes, so the target is not removed.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof HTMLAnchorElement)) return
  if (!/^https?:/i.test(node.getAttribute('href') ?? '')) return

  node.setAttribute('target', '_blank')
  node.setAttribute('rel', 'noopener noreferrer')
})

export function renderNoteHtml(content: string): string {
  const withWikilinks = preprocessWikilinks(content)
  const rawHtml = marked.parse(withWikilinks, { async: false }) as string

  return DOMPurify.sanitize(rawHtml, { ALLOWED_URI_REGEXP })
}