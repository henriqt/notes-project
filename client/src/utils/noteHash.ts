import type { Note } from '../types/note'

// Fingerprint of the synced fields only (no ids or timestamps), used to
// tell whether a note changed since the last sync.
export async function hashNote(
  note: Pick<Note, 'title' | 'content' | 'isBookmarked'>,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify([note.title, note.content, note.isBookmarked]),
  )
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}