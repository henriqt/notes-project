import { useEffect, useRef } from 'react'
import { renderNoteHtml } from '../utils/markdown'

interface NotePreviewProps {
  content: string
  onWikilinkClick: (title: string) => void
}

export function NotePreview({ content, onWikilinkClick }: NotePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (!link) return

      const href = link.getAttribute('href') || ''
      if (href.startsWith('wikilink://')) {
        e.preventDefault()
        const title = decodeURIComponent(href.replace('wikilink://', ''))
        onWikilinkClick(title)
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onWikilinkClick])

  return (
    <div
      ref={containerRef}
      className="note-preview"
      dangerouslySetInnerHTML={{ __html: renderNoteHtml(content) }}
    />
  )
}