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
        return
      }

      // Links to a title ("#my-title"): scroll inside the preview instead of
      // changing the URL of the side panel. closest() covers "[**bold**](#x)".
      const link = target.closest('a')
      const href = link?.getAttribute('href')
      if (!link || !href?.startsWith('#')) return

      e.preventDefault()

      // marked percent-encodes accents ("#se%C3%A7%C3%A3o"), so decode first
      let fragment = href.slice(1)
      try {
        fragment = decodeURIComponent(fragment)
      } catch {
        // malformed escape: use it as it is
      }

      if (!fragment) {
        container.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // DOMPurify prefixes the ids with "user-content-" (SANITIZE_NAMED_PROPS).
      // Tries the exact text first, then lowercase, like GitHub does.
      const find = (id: string) => container.querySelector(`#${CSS.escape(`user-content-${id}`)}`)
      const heading = find(fragment) ?? find(fragment.toLowerCase())
      heading?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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