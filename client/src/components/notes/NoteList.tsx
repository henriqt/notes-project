import { useState } from 'react'
import type { Note } from '../../types/note'
import './NoteList.css'

interface NoteListProps {
  notes: Note[]
  selectedNoteId: number | null
  onSelectNote: (id: number) => void
  onCreateNote: () => void
  onDeleteNote: (id: number) => void
}

export function NoteList({ notes, selectedNoteId, onSelectNote, onCreateNote, onDeleteNote }: NoteListProps) {
  const [search, setSearch] = useState('')
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)

  // Filter by bookmark (optional) and by title or content
  const query = search.toLowerCase()
  const filteredNotes = notes.filter(
    (note) =>
      (!onlyBookmarked || note.isBookmarked) &&
      (note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query)),
  )

  return (
    <aside className="note-list">
      <div className="note-list-toolbar">
        <button
          className="note-list-icon-btn"
          onClick={() => setOnlyBookmarked((v) => !v)}
          aria-pressed={onlyBookmarked}
          aria-label="Show only bookmarked notes"
          title="Show only bookmarked notes"
        >
          ★
        </button>
      </div>

      <button className="note-list-new" onClick={onCreateNote}>
        + New note
      </button>

      <input
        type="text"
        className="note-list-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search notes..."
      />

      <ul className="note-list-notes-list">
        {filteredNotes.map((note) => (
          <li
            key={note.id}
            className={`note-list-item ${note.id === selectedNoteId ? 'selected' : ''}`}
          >
            <button className="note-list-item-title" onClick={() => onSelectNote(note.id)}>
              {note.title || 'Untitled'}
            </button>
            {note.isBookmarked && <span className="note-list-item-star">★</span>}
            <button
              className="note-list-item-delete"
              onClick={() => onDeleteNote(note.id)}
              aria-label={`Delete ${note.title || 'Untitled'}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {filteredNotes.length === 0 && <p className="note-list-empty">No notes found</p>}
    </aside>
  )
}