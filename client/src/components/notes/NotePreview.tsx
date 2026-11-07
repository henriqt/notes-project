import { useEffect, useRef } from 'react'
import { renderNoteHtml } from '../../utils/markdown'
import './NotePreview.css'

interface NotePreviewProps {
  content: string
  onToggleTask: (index: number) => void
}

export function NotePreview({ content, onToggleTask }: NotePreviewProps) {
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
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [onToggleTask])

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