import { useRef, useState, type ChangeEvent } from 'react'
import type { Note } from '../types/note'
import { NotePreview } from './NotePreview'

interface NoteEditorProps {
  note: Note
  onSave: (updated: Note) => void
  onWikilinkClick: (title: string) => void
}

type Mode = 'edit' | 'preview'

// Render with key={note.id} from the parent so switching notes resets
// this component's local state naturally, without needing an effect.
export function NoteEditor({ note, onSave, onWikilinkClick }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [mode, setMode] = useState<Mode>('edit')
  const saveTimeout = useRef<number | undefined>(undefined)

  function scheduleSave(nextTitle: string, nextContent: string) {
    if (saveTimeout.current) {
      window.clearTimeout(saveTimeout.current)
    }
    saveTimeout.current = window.setTimeout(() => {
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

  return (
    <div>
      <input value={title} onChange={handleTitleChange} placeholder="Untitled" />

      <div>
        <button type="button" onClick={() => setMode('edit')} aria-pressed={mode === 'edit'}>
          Edit
        </button>
        <button type="button" onClick={() => setMode('preview')} aria-pressed={mode === 'preview'}>
          Preview
        </button>
      </div>

      {mode === 'edit' ? (
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing in Markdown... use [[Note Title]] to link notes"
          rows={20}
          style={{ width: '100%' }}
        />
      ) : (
        <NotePreview content={content} onWikilinkClick={onWikilinkClick} />
      )}
    </div>
  )
}