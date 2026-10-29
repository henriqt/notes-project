import type { NoteSource } from '../../types/note'
import './SourceCard.css'

interface SourceCardProps {
  source: NoteSource
}

// Domain to show, or the raw url if it can't be parsed
function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// Only http/https become a link, anything else is shown as plain text
function isWebUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

// Shows where the note came from: domain (link), date and the saved snippet
export function SourceCard({ source }: SourceCardProps) {
  const domain = getDomain(source.url)

  return (
    <div className="source-card">
      <div className="source-card-top">
        {isWebUrl(source.url) ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer" title={source.title || source.url}>
            {domain}
          </a>
        ) : (
          <span>{domain}</span>
        )}
        <span className="source-card-date">{new Date(source.capturedAt).toLocaleDateString()}</span>
      </div>

      {source.snippet && <blockquote className="source-card-snippet">{source.snippet}</blockquote>}
    </div>
  )
}