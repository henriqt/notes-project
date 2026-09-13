import type { Note } from '../types/note'

interface SidebarProps {
  notes: Note[]
  selectedNoteId: number | null
  onSelectNote: (id: number) => void
  onCreateNote: () => void
  onDeleteNote: (id: number) => void
}

export function Sidebar({ notes, selectedNoteId, onSelectNote, onCreateNote, onDeleteNote }: SidebarProps) {
  return (
    <aside>
      <button onClick={onCreateNote}>+ New note</button>

      <ul>
        {notes.map((note) => (
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
    </aside>
  )
}