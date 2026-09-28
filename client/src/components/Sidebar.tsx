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

  // Filter by title or content
  const query = search.toLowerCase()
  const filteredNotes = notes.filter(
    (note) => note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query),
  )

  return (
    <aside className="sidebar">
      <button onClick={onCreateNote}>+ New note</button>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search notes..."
      />

      <ul className="sidebar-notes-list">
        {filteredNotes.map((note) => (
          <li key={note.id}>
            <button
              onClick={() => onSelectNote(note.id)}
              aria-current={note.id === selectedNoteId}
            >
              {note.title || 'Untitled'}
              {note.isBookmarked ? ' ★' : ''}
            </button>
            <button
              onClick={() => onDeleteNote(note.id)}
              aria-label={`Delete ${note.title || 'Untitled'}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {filteredNotes.length === 0 && <p>No notes found</p>}
    </aside>
  )
}