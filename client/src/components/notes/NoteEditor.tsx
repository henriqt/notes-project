import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type { Note } from '../../types/note'
import { NotePreview } from './NotePreview'
import { toggleTask } from '../../utils/tasks'
import './NoteEditor.css'
import { SourceCard } from './SourceCard'

interface NoteEditorProps {
  note: Note
  onSave: (updated: Note) => void
  onWikilinkClick: (title: string) => void
  onToggleBookmark: () => void
  onOpenDrawer: () => void
}

// Same limits as the API (Note.cs)
const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 200_000

// The parent uses key={note.id}, so changing notes remounts this
export function NoteEditor({ note, onSave, onWikilinkClick, onToggleBookmark, onOpenDrawer }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  // New notes open in Edit, existing ones in Preview
  const [mode, setMode] = useState<'edit' | 'preview'>(note.content === '' ? 'edit' : 'preview')
  const saveTimeout = useRef<number | undefined>(undefined)

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
  useEffect(() => {
    return () => {
      flushPendingSave()
    }
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

  // Clicking on the "[ ]" or "[x]" of a task line flips it
  function handleTextareaClick(e: ReactMouseEvent<HTMLTextAreaElement>) {
    const textarea = e.currentTarget
    if (textarea.selectionStart !== textarea.selectionEnd) return // the user is selecting text

    const caret = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', caret - 1) + 1
    let lineEnd = content.indexOf('\n', caret)
    if (lineEnd === -1) lineEnd = content.length

    // "- [ ] text", "* [x] text" or "1. [ ] text"
    const match = content
      .slice(lineStart, lineEnd)
      .match(/^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\](?=\s+\S)/)
    if (!match) return

    // Only when the click landed on the "[ ]" itself
    const boxStart = lineStart + match[1].length
    if (caret < boxStart || caret > boxStart + 3) return

    const mark = match[2] === ' ' ? 'x' : ' '
    const next = content.slice(0, boxStart + 1) + mark + content.slice(boxStart + 2)

    setContent(next)
    scheduleSave(title, next)

    // Changing the value moves the caret to the end, so put it back
    requestAnimationFrame(() => textarea.setSelectionRange(caret, caret))
  }

  // Enter on a task line ("- [ ] text") starts a new task below.
  // Enter on an empty task removes it, which ends the list.
  function handleTextareaKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return

    const textarea = e.currentTarget
    if (textarea.selectionStart !== textarea.selectionEnd) return

    const caret = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', caret - 1) + 1
    let lineEnd = content.indexOf('\n', caret)
    if (lineEnd === -1) lineEnd = content.length

    // Only when the caret is at the end of the line, otherwise normal Enter
    if (caret !== lineEnd) return

    // match[1] = indent + bullet ("  - "), match[2] = text after the box
    const match = content
      .slice(lineStart, lineEnd)
      .match(/^(\s*(?:[-*+]|\d+[.)])\s+)\[[ xX]\](?:\s+(.*))?$/)
    if (!match) return

    e.preventDefault()

    let next: string
    let newCaret: number

    if (!match[2]?.trim()) {
      // Empty task: remove the line content
      next = content.slice(0, lineStart) + content.slice(lineEnd)
      newCaret = lineStart
    } else {
      // New unchecked task on the next line
      const prefix = `${match[1]}[ ] `
      next = content.slice(0, lineEnd) + '\n' + prefix + content.slice(lineEnd)
      newCaret = lineEnd + 1 + prefix.length
    }

    setContent(next)
    scheduleSave(title, next)

    // Changing the value moves the caret to the end, so put it back
    requestAnimationFrame(() => textarea.setSelectionRange(newCaret, newCaret))
  }
  
  // Clicking a checkbox in the Preview changes the Markdown and saves like a normal edit
  function handleToggleTask(index: number) {
    const next = toggleTask(content, index)
    setContent(next)
    scheduleSave(title, next)
  }

  // Live counters for the status bar (an empty note has 0 lines)
  const lineCount = content === '' ? 0 : content.split('\n').length
  const charCount = content.length

  return (
    <div className="note-editor">
      <div className="pane-header">
        <button
          className="pane-action"
          onClick={onOpenDrawer}
          aria-label="Open notes"
          title="Open notes"
        >
          ☰
        </button>

        <div className="pane-tabs">
          <button
            className={`pane-tab ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            className={`pane-tab ${mode === 'preview' ? 'active' : ''}`}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>

        <button
          className="pane-action"
          onClick={onToggleBookmark}
          aria-pressed={note.isBookmarked}
          aria-label={note.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          title={note.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {note.isBookmarked ? '★' : '☆'}
        </button>
      </div>

      {mode === 'edit' ? (
        <>
          <input
            className="editor-title"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            maxLength={MAX_TITLE_LENGTH}
          />
          <textarea
            value={content}
            onChange={handleContentChange}
            onClick={handleTextareaClick}
            onKeyDown={handleTextareaKeyDown}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="Start writing in Markdown... use [[Note Title]] to link notes"
            className="editor-textarea"
          />
        </>
      ) : (
        <>
          <h2 className="preview-title">{title || 'Untitled'}</h2>
          {note.source && <SourceCard source={note.source} />}
          <NotePreview content={content} onWikilinkClick={onWikilinkClick} onToggleTask={handleToggleTask} />
        </>
      )}

      <div className="status-bar">
        <span>
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </span>
        <span>{charCount.toLocaleString()} characters</span>
      </div>
    </div>
  )
}