import { useState } from 'react'
import type { Note } from '../../types/note'
import type { PageContext } from '../../hooks/usePageContext'
import './NoteList.css'

// Hostname without the "www." prefix, so www.site.com and site.com count as the same site
function getSite(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function byUpdatedDesc(a: Note, b: Note): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
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

  // Notes grouped by the site they were created on. Notes without a site go last.
  const siteGroups = new Map<string, Note[]>()
  const looseNotes: Note[] = []

  for (const note of filteredNotes) {
    const site = note.source ? getSite(note.source.url) : null

    if (!site) {
      looseNotes.push(note)
      continue
    }

    const group = siteGroups.get(site)
    if (group) group.push(note)
    else siteGroups.set(site, [note])
  }

  const currentSite = page ? getSite(page.url) : null

  // The site you are on comes first, then the others by the most recently edited note
  const sections = [...siteGroups.entries()]
    .map(([site, siteNotes]) => ({
      site,
      title: site === currentSite ? 'This site' : site,
      notes: siteNotes.sort(byUpdatedDesc),
    }))
    .sort((a, b) => {
      if (a.site === currentSite) return -1
      if (b.site === currentSite) return 1
      return byUpdatedDesc(a.notes[0], b.notes[0])
    })

  if (looseNotes.length > 0) {
    sections.push({ site: '', title: 'Other notes', notes: looseNotes })
  }

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
            <h3 className="note-list-section-title">{section.title}</h3>
            <ul className="note-list-notes-list">{section.notes.map(renderNote)}</ul>
          </section>
        ))}

        {sections.length === 0 && <p className="note-list-empty">No notes found</p>}
      </div>
    </aside>
  )
}