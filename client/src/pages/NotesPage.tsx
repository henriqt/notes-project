import { useEffect, useState } from 'react'
import {
  getLocalNotes,
  createLocalNote,
  updateLocalNote,
  deleteLocalNote,
  toggleLocalBookmark,
} from '../api/localStore'
import type { Note } from '../types/note'
import { Sidebar } from '../components/Sidebar'
import { NoteEditor } from '../components/NoteEditor'
import { syncWikilinksOnSave } from '../utils/wikilinkSync'

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wikilinkNotice, setWikilinkNotice] = useState('')

  async function handleCreateNote() {
    try {
      const newNote = await createLocalNote('New note', '')
      setNotes((prev) => [newNote, ...prev])
      setSelectedNoteId(newNote.id)
    } catch {
      setError('Failed to create note')
    }
  }

  async function handleSaveNote(updated: Note) {
  try {
    await updateLocalNote(updated)
    await syncWikilinksOnSave(updated.content)

    const refreshed = await getLocalNotes()
    setNotes(refreshed)
  } catch {
    setError('Failed to save note')
  }
}

  async function handleDeleteNote(id: number) {
    try {
      await deleteLocalNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (selectedNoteId === id) setSelectedNoteId(null)
    } catch {
      setError('Failed to delete note')
    }
  }

  async function handleToggleBookmark(id: number) {
    try {
      const updated = await toggleLocalBookmark(id)
      if (updated) setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
    } catch {
      setError('Failed to update bookmark')
    }
  }

  function handleWikilinkClick(title: string) {
    const target = notes.find((n) => n.title.toLowerCase() === title.toLowerCase())
    if (target) {
      setWikilinkNotice('')
      setSelectedNoteId(target.id)
    } else {
      setWikilinkNotice(`A nota "${title}" ainda não existe.`)
    }
  }

  useEffect(() => {
  getLocalNotes()
    .then(async (data) => {
      setNotes(data)

      const result = (await chrome.storage.local.get({
        lastOpenedNoteId: null as number | null,
      })) as { lastOpenedNoteId: number | null }

      if (result.lastOpenedNoteId !== null) {
        setSelectedNoteId(result.lastOpenedNoteId)
        await chrome.storage.local.remove('lastOpenedNoteId')
      }
    })
    .catch(() => setError('Failed to load notes'))
    .finally(() => setLoading(false))
  }, [])

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
      />

      <main style={{ flex: 1 }}>
        {error && <p role="alert">{error}</p>}
        {wikilinkNotice && <p role="status">{wikilinkNotice}</p>}

        {selectedNote ? (
          <div>
            <button onClick={() => handleToggleBookmark(selectedNote.id)}>
              {selectedNote.isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
            </button>
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              onSave={handleSaveNote}
              onWikilinkClick={handleWikilinkClick}
            />
          </div>
        ) : (
          <p>Select a note or create a new one</p>
        )}
      </main>
    </div>
  )
}