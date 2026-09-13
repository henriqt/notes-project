import type { Note } from '../types/note'

const STORAGE_KEY = 'notes'

export async function getLocalNotes(): Promise<Note[]> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: [] as Note[] })
  return result[STORAGE_KEY] as Note[]
}

export async function saveLocalNotes(notes: Note[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: notes })
}

export async function createLocalNote(title: string, content: string): Promise<Note> {
  const notes = await getLocalNotes()
  const now = new Date().toISOString()

  const newNote: Note = {
    id: Date.now(), // temporary local id, replaced by server id if synced later
    title,
    content,
    isBookmarked: false,
    createdAt: now,
    updatedAt: now,
    userId: 0, // unused until sync
  }

  await saveLocalNotes([newNote, ...notes])
  return newNote
}

export async function updateLocalNote(updated: Note): Promise<void> {
  const notes = await getLocalNotes()
  const next = notes.map((n) => (n.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : n))
  await saveLocalNotes(next)
}

export async function deleteLocalNote(id: number): Promise<void> {
  const notes = await getLocalNotes()
  await saveLocalNotes(notes.filter((n) => n.id !== id))
}

export async function toggleLocalBookmark(id: number): Promise<Note | undefined> {
  const notes = await getLocalNotes()
  const next = notes.map((n) =>
    n.id === id ? { ...n, isBookmarked: !n.isBookmarked, updatedAt: new Date().toISOString() } : n,
  )
  await saveLocalNotes(next)
  return next.find((n) => n.id === id)
}