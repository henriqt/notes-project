import { authFetch } from './client'
import type { Note } from '../types/note'

export async function getNotes(): Promise<Note[]> {
  const response = await authFetch('/notes')
  if (!response.ok) throw new Error('Failed to load notes')
  return response.json()
}

export async function createNote(title: string, content: string): Promise<Note> {
  const response = await authFetch('/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, isBookmarked: false }),
  })
  if (!response.ok) throw new Error('Failed to create note')
  return response.json()
}

export async function updateNote(note: Note): Promise<void> {
  const response = await authFetch(`/notes/${note.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  })
  if (!response.ok) throw new Error('Failed to update note')
}

export async function deleteNote(id: number): Promise<void> {
  const response = await authFetch(`/notes/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete note')
}

export async function toggleBookmark(id: number): Promise<Note> {
  const response = await authFetch(`/notes/${id}/bookmark`, { method: 'PATCH' })
  if (!response.ok) throw new Error('Failed to toggle bookmark')
  return response.json()
}