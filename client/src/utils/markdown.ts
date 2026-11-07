import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Web links open in a new tab, so the side panel itself never navigates away.
// Runs after DOMPurify cleans the attributes, so the target is not removed.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof HTMLAnchorElement)) return
  if (!/^https?:/i.test(node.getAttribute('href') ?? '')) return

  node.setAttribute('target', '_blank')
  node.setAttribute('rel', 'noopener noreferrer')
})

export function renderNoteHtml(content: string): string {
  const rawHtml = marked.parse(content, { async: false }) as string

  return DOMPurify.sanitize(rawHtml)
}