import type { Note, NoteSource } from '../types/note'

const STORAGE_KEY = 'notes'
const TOMBSTONES_KEY = 'deletedNotes'
const SYNCED_USER_KEY = 'syncedUserId'
const SYNC_ENABLED_KEY = 'syncEnabled'
const TRASH_KEY = 'trashedNotes'

// Notes deleted locally after being synced. Without this, the sync would bring them back.
export interface DeletedNote {
  serverId: number
  baseHash?: string // hash at the last sync
}

// Notes deleted by the user, kept on this device until restored or deleted for good
export interface TrashedNote {
  note: Note
  deletedAt: string
}

export async function getLocalNotes(): Promise<Note[]> {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: [] as Note[] })
  return result[STORAGE_KEY] as Note[]
}

export async function saveLocalNotes(notes: Note[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: notes })
}

export async function createLocalNote(
  title: string,
  content: string,
  source?: NoteSource,
): Promise<Note> {
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
    source,
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
  if (!target) return

  // Trash first, then remove the note. If it fails in between, the note
  // just shows up in both places and restoring it is harmless.
  const trash = await getTrash()
  await saveTrash([{ note: target, deletedAt: new Date().toISOString() }, ...trash])

  await saveLocalNotes(notes.filter((n) => n.id !== id))

  // Only notes that reached the server need a tombstone
  if (target.serverId !== undefined) {
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

export async function getTrash(): Promise<TrashedNote[]> {
  const result = await chrome.storage.local.get({ [TRASH_KEY]: [] as TrashedNote[] })
  return result[TRASH_KEY] as TrashedNote[]
}

async function saveTrash(items: TrashedNote[]): Promise<void> {
  await chrome.storage.local.set({ [TRASH_KEY]: items })
}

export async function restoreFromTrash(id: number): Promise<void> {
  const trash = await getTrash()
  const item = trash.find((t) => t.note.id === id)
  if (!item) return

  let restored = item.note

  if (restored.serverId !== undefined) {
    const tombstones = await getTombstones()
    const pending = tombstones.some((t) => t.serverId === restored.serverId)

    if (pending) {
      // The server still has the note: drop the tombstone and keep the link
      await saveTombstones(tombstones.filter((t) => t.serverId !== restored.serverId))
    } else {
      // The deletion already reached the server: it comes back as a new note
      restored = { ...restored, serverId: undefined, baseHash: undefined }
    }
  }

  const notes = await getLocalNotes()
  if (!notes.some((n) => n.id === restored.id)) {
    await saveLocalNotes([restored, ...notes])
  }
  await saveTrash(trash.filter((t) => t.note.id !== id))
}

export async function deleteFromTrash(id: number): Promise<void> {
  const trash = await getTrash()
  await saveTrash(trash.filter((t) => t.note.id !== id))
}

export async function emptyTrash(): Promise<void> {
  await saveTrash([])
}

// Clears everything stored on this device. Synced notes stay on the server.
export async function clearLocalData(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEY,
    TOMBSTONES_KEY,
    SYNCED_USER_KEY,
    SYNC_ENABLED_KEY,
    TRASH_KEY,
  ])
}