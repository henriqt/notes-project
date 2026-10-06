import type { Note } from '../types/note'

const STORAGE_KEY = 'notes'
const TOMBSTONES_KEY = 'deletedNotes'
const SYNCED_USER_KEY = 'syncedUserId'
const SYNC_ENABLED_KEY = 'syncEnabled'

// Notes deleted locally after being synced. Without this, the sync would bring them back.
export interface DeletedNote {
  serverId: number
  baseHash?: string // hash at the last sync
}

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
    id: Date.now(), // temporary local id
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
  const next = notes.map((n) =>
    n.id === updated.id
      ? {
          ...n, // keeps serverId and baseHash from the stored note
          title: updated.title,
          content: updated.content,
          isBookmarked: updated.isBookmarked,
          updatedAt: new Date().toISOString(),
        }
      : n,
  )
  await saveLocalNotes(next)
}

export async function deleteLocalNote(id: number): Promise<void> {
  const notes = await getLocalNotes()
  const target = notes.find((n) => n.id === id)

  // Delete the note first, then save the tombstone. If it fails in
  // between, the note just comes back on the next sync.
  await saveLocalNotes(notes.filter((n) => n.id !== id))

  // Only notes that reached the server need a tombstone
  if (target?.serverId !== undefined) {
    const tombstones = await getTombstones()
    await saveTombstones([
      ...tombstones.filter((t) => t.serverId !== target.serverId),
      { serverId: target.serverId, baseHash: target.baseHash },
    ])
  }
}

export async function toggleLocalBookmark(id: number): Promise<Note | undefined> {
  const notes = await getLocalNotes()
  const next = notes.map((n) =>
    n.id === id ? { ...n, isBookmarked: !n.isBookmarked, updatedAt: new Date().toISOString() } : n,
  )
  await saveLocalNotes(next)
  return next.find((n) => n.id === id)
}

export async function getTombstones(): Promise<DeletedNote[]> {
  const result = await chrome.storage.local.get({ [TOMBSTONES_KEY]: [] as DeletedNote[] })
  return result[TOMBSTONES_KEY] as DeletedNote[]
}

export async function saveTombstones(tombstones: DeletedNote[]): Promise<void> {
  await chrome.storage.local.set({ [TOMBSTONES_KEY]: tombstones })
}

// Account the local notes were last synced with
export async function getSyncedUserId(): Promise<string | undefined> {
  const result = await chrome.storage.local.get({ [SYNCED_USER_KEY]: null as string | null })
  return (result[SYNCED_USER_KEY] as string | null) ?? undefined
}

export async function setSyncedUserId(userId: string): Promise<void> {
  await chrome.storage.local.set({ [SYNCED_USER_KEY]: userId })
}

// "Keep syncing" toggle
export async function getSyncEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get({ [SYNC_ENABLED_KEY]: false as boolean })
  return result[SYNC_ENABLED_KEY] as boolean
}

export async function saveSyncEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [SYNC_ENABLED_KEY]: enabled })
}

// Clears everything stored on this device. Synced notes stay on the server.
export async function clearLocalData(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEY, TOMBSTONES_KEY, SYNCED_USER_KEY, SYNC_ENABLED_KEY])
}