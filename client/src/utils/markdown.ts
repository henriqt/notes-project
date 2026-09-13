import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { preprocessWikilinks } from './wikilinks'

// DOMPurify's default list + the wikilink:// scheme
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|wikilink):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i

export function renderNoteHtml(content: string): string {
  const withWikilinks = preprocessWikilinks(content)
  const rawHtml = marked.parse(withWikilinks, { async: false }) as string

  return DOMPurify.sanitize(rawHtml, { ALLOWED_URI_REGEXP })
}