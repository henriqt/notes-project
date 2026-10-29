import { useState } from 'react'
import type { Note } from '../../types/note'
import type { PageContext } from '../../hooks/usePageContext'
import './NoteList.css'

// Same page = same url, ignoring the #fragment
function withoutHash(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return url
  }
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

interface NoteListProps {
  notes: Note[]
  selectedNoteId: number | null
  onSelectNote: (id: number) => void
  onCreateNote: () => void
  onDeleteNote: (id: number) => void
  page: PageContext | null // page in the active tab, used to group the notes
}

export function NoteList({ notes, page, selectedNoteId, onSelectNote, onCreateNote, onDeleteNote }: NoteListProps) {
  const [search, setSearch] = useState('')
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)

  // Filter by bookmark (optional) and by title or content
  const query = search.toLowerCase()
  const filteredNotes = notes.filter(
    (note) =>
      (!onlyBookmarked || note.isBookmarked) &&
      (note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query)),
  )

  // Each note goes in only one section: this page, this site, or the rest
  const pageNotes: Note[] = []
  const siteNotes: Note[] = []
  const otherNotes: Note[] = []

  console.table(
    filteredNotes.map((note) => ({
      id: note.id,
      title: note.title,
      url: note.source?.url,
    })),
  )

  for (const note of filteredNotes) {
    if (page && note.source && withoutHash(note.source.url) === withoutHash(page.url)) {
      pageNotes.push(note)
    } else if (page && note.source && getHostname(note.source.url) === page.domain) {
      siteNotes.push(note)
    } else {
      otherNotes.push(note)
    }
  }

  // An empty section is not shown
  const sections = [
    { title: 'This page', notes: pageNotes },
    { title: 'This site', notes: siteNotes },
    { title: 'All notes', notes: otherNotes },
  ].filter((section) => section.notes.length > 0)

  function renderNote(note: Note) {
    return (
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
    )
  }

  return (
    <aside className="note-list">
      <button className="note-list-new" onClick={onCreateNote}>
        + New note
      </button>

      <div className="note-list-search-row">
        <input
          type="text"
          className="note-list-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
        />
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

      <div className="note-list-scroll">
        {sections.map((section) => (
          <section key={section.title}>
            {sections.length > 1 && <h3 className="note-list-section-title">{section.title}</h3>}
            <ul className="note-list-notes-list">{section.notes.map(renderNote)}</ul>
          </section>
        ))}

        {sections.length === 0 && <p className="note-list-empty">No notes found</p>}
      </div>
    </aside>
  )
}