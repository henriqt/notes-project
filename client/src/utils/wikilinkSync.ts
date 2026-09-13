import { extractLinkedTitles } from './wikilinks'
import { getLocalNotes, saveLocalNotes } from '../api/localStore'
import type { Note } from '../types/note'

// Mirrors the backend's NoteLinkService: any [[Title]] referenced in a note's
// content that doesn't match an existing note gets an empty note created for it.
export async function syncWikilinksOnSave(content: string): Promise<void> {
  const titles = extractLinkedTitles(content)
  if (titles.length === 0) return

  const notes = await getLocalNotes()
  const existingTitles = new Set(notes.map((n) => n.title.toLowerCase()))

  const newNotes: Note[] = titles
    .filter((title) => !existingTitles.has(title.toLowerCase()))
    .map((title) => {
      const now = new Date().toISOString()
      return {
        id: Date.now() + Math.random(),
        title,
        content: '',
        isBookmarked: false,
        createdAt: now,
        updatedAt: now,
        userId: 0,
      }
    })

  if (newNotes.length > 0) {
    await saveLocalNotes([...notes, ...newNotes])
  }
}