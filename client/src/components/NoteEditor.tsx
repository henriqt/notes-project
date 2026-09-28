import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { Note } from '../types/note'
import { NotePreview } from './NotePreview'
import './NoteEditor.css'

interface NoteEditorProps {
  note: Note
  onSave: (updated: Note) => void
  onWikilinkClick: (title: string) => void
}

// Same limits as the API (Note.cs)
const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 200_000

const DEFAULT_EDITOR_WIDTH = 50 // % of the split taken by the editor pane
const MIN_PANE_WIDTH = 20 // don't let either pane get smaller than this

// The parent uses key={note.id}, so changing notes remounts this
export function NoteEditor({ note, onSave, onWikilinkClick }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [editorWidth, setEditorWidth] = useState(DEFAULT_EDITOR_WIDTH)
  const saveTimeout = useRef<number | undefined>(undefined)
  const splitRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Latest values in a ref, so the cleanup on unmount can save them
  const latest = useRef({ note, title, content, onSave })
  useEffect(() => {
    latest.current = { note, title, content, onSave }
  })

  function flushPendingSave() {
    if (saveTimeout.current === undefined) return

    window.clearTimeout(saveTimeout.current)
    saveTimeout.current = undefined

    const { note: currentNote, title: currentTitle, content: currentContent, onSave: save } = latest.current
    save({ ...currentNote, title: currentTitle, content: currentContent })
  }

  // Save right away on unmount, so a pending autosave isn't lost.
  // Also removes the drag listeners.
  useEffect(() => {
    return () => {
      flushPendingSave()
      document.removeEventListener('mousemove', handleDividerMouseMove)
      document.removeEventListener('mouseup', handleDividerMouseUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scheduleSave(nextTitle: string, nextContent: string) {
    if (saveTimeout.current !== undefined) {
      window.clearTimeout(saveTimeout.current)
    }
    saveTimeout.current = window.setTimeout(() => {
      saveTimeout.current = undefined
      onSave({ ...note, title: nextTitle, content: nextContent })
    }, 1000)
  }

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    scheduleSave(e.target.value, content)
  }

  function handleContentChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    scheduleSave(title, e.target.value)
  }

  // Drag the divider. Listeners are on document so it keeps working
  // when the cursor leaves the divider.
  function handleDividerMouseDown() {
    isDragging.current = true
    document.addEventListener('mousemove', handleDividerMouseMove)
    document.addEventListener('mouseup', handleDividerMouseUp)
  }

  function handleDividerMouseMove(e: MouseEvent) {
    if (!isDragging.current || !splitRef.current) return

    const rect = splitRef.current.getBoundingClientRect()
    const percent = ((e.clientX - rect.left) / rect.width) * 100

    setEditorWidth(Math.min(100 - MIN_PANE_WIDTH, Math.max(MIN_PANE_WIDTH, percent)))
  }

  function handleDividerMouseUp() {
    isDragging.current = false
    document.removeEventListener('mousemove', handleDividerMouseMove)
    document.removeEventListener('mouseup', handleDividerMouseUp)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <input
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        maxLength={MAX_TITLE_LENGTH}
        style={{ width: '100%' }}
      />

      <div ref={splitRef} className="editor-split">
        <div className="editor-pane" style={{ width: `${editorWidth}%` }}>
          <div className="pane-header">Edit</div>
          <textarea
            value={content}
            onChange={handleContentChange}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="Start writing in Markdown... use [[Note Title]] to link notes"
            className="editor-textarea"
          />
        </div>

        <div className="editor-divider" onMouseDown={handleDividerMouseDown} />

        <div className="editor-pane" style={{ width: `${100 - editorWidth}%` }}>
          <div className="pane-header">Preview</div>
          <NotePreview content={content} onWikilinkClick={onWikilinkClick} />
        </div>
      </div>
    </div>
  )
}