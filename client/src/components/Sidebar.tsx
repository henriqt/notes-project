import { useState } from 'react'
import type { Note } from '../types/note'
import './Sidebar.css'

interface SidebarProps {
  notes: Note[]
  selectedNoteId: number | null
  onSelectNote: (id: number) => void
  onCreateNote: () => void
  onDeleteNote: (id: number) => void
}

export function Sidebar({ notes, selectedNoteId, onSelectNote, onCreateNote, onDeleteNote }: SidebarProps) {
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
    <aside className="sidebar">
      <div className="sidebar-toolbar">
        <button
          className="sidebar-icon-btn"
          onClick={() => setOnlyBookmarked((v) => !v)}
          aria-pressed={onlyBookmarked}
          aria-label="Show only bookmarked notes"
          title="Show only bookmarked notes"
        >
          ★
        </button>
      </div>

      <button className="sidebar-new" onClick={onCreateNote}>
        + New note
      </button>

      <input
        type="text"
        className="sidebar-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search notes..."
      />

      <ul className="sidebar-notes-list">
        {filteredNotes.map((note) => (
          <li
            key={note.id}
            className={`sidebar-item ${note.id === selectedNoteId ? 'selected' : ''}`}
          >
            <button className="sidebar-item-title" onClick={() => onSelectNote(note.id)}>
              {note.title || 'Untitled'}
            </button>
            {note.isBookmarked && <span className="sidebar-item-star">★</span>}
            <button
              className="sidebar-item-delete"
              onClick={() => onDeleteNote(note.id)}
              aria-label={`Delete ${note.title || 'Untitled'}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {filteredNotes.length === 0 && <p className="sidebar-empty">No notes found</p>}
    </aside>
  )
}