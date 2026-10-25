import { useEffect, useRef } from 'react'
import { renderNoteHtml } from '../../utils/markdown'
import './NotePreview.css'

interface NotePreviewProps {
  content: string
  onWikilinkClick: (title: string) => void
  onToggleTask: (index: number) => void
}

export function NotePreview({ content, onWikilinkClick, onToggleTask }: NotePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        e.preventDefault() // the text is the source of truth, the preview re-renders from it
        const boxes = Array.from(container.querySelectorAll('input[type="checkbox"]'))
        onToggleTask(boxes.indexOf(target))
        return
      }

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
  }, [onWikilinkClick, onToggleTask])

  // marked renders task checkboxes as disabled, so turn them on after every render
  useEffect(() => {
    containerRef.current
      ?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((box) => {
        box.disabled = false
      })
  }, [content])

  return (
    <div
      ref={containerRef}
      className="note-preview"
      dangerouslySetInnerHTML={{ __html: renderNoteHtml(content) }}
    />
  )
}