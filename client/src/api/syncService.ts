import {
  getLocalNotes,
  saveLocalNotes,
  getTombstones,
  saveTombstones,
  getSyncedUserId,
  setSyncedUserId,
  type DeletedNote,
} from './localStore'
import {
  getNotes,
  createNote as createServerNote,
  updateNote as updateServerNote,
  deleteNote as deleteServerNote,
} from './notes'
import { getTokenUserId } from './client'
import { hashNote } from '../utils/noteHash'
import type { Note } from '../types/note'

// A note that exists on both sides
export interface SyncPair {
  local: Note
  server: Note
}

// Both sides changed, or one side deleted while the other edited.
// A null side means "deleted there".
export interface SyncConflict {
  local: Note | null
  server: Note | null
}

export interface SyncPlan {
  toPush: Note[]             // only exists locally, not sent to the server yet
  toPull: Note[]             // only exists on the server, we don't have it locally yet
  toUpdateServer: SyncPair[] // only the local side changed -> send local to server
  toUpdateLocal: SyncPair[]  // only the server side changed -> bring server to local
  toDeleteOnServer: Note[]   // deleted here, untouched on the server -> delete there too
  toDeleteLocally: Note[]    // deleted on the server, untouched here -> delete here too
  conflicts: SyncConflict[]  // needs the user's decision
  clean: Note[]              // exists on both sides and is the same, nothing to do
  tombstones: DeletedNote[]  // tombstones this plan looked at (removed once applied)
  userId?: string            // account these notes end up synced with
}

// Compares local and server notes and groups them. Changes nothing yet.
export async function planSync(): Promise<SyncPlan> {
  const [storedNotes, serverNotes, tombstones, syncedUserId] = await Promise.all([
    getLocalNotes(),
    getNotes(),
    getTombstones(),
    getSyncedUserId(),
  ])

  const userId = getTokenUserId()
  const accountChanged =
    userId !== undefined && syncedUserId !== undefined && userId !== syncedUserId

  // "Missing on the server" only counts as deleted if these notes were synced
  // with this same account. If unsure, keep the note and push it again.
  const trustServerDeletes = userId !== undefined && !accountChanged

  // Notes from another account count as never synced (pushed, not deleted)
  const localNotes: Note[] = accountChanged
    ? storedNotes.map((n) => ({ ...n, serverId: undefined, baseHash: undefined }))
    : storedNotes
  const activeTombstones = accountChanged ? [] : tombstones

  const serverById = new Map(serverNotes.map((n) => [n.id, n]))
  const matchedServerIds = new Set<number>()

  const toPush: Note[] = []
  const toUpdateServer: SyncPair[] = []
  const toUpdateLocal: SyncPair[] = []
  const toDeleteOnServer: Note[] = []
  const toDeleteLocally: Note[] = []
  const conflicts: SyncConflict[] = []
  const clean: Note[] = []

  // Notes deleted locally that still exist on the server
  for (const tombstone of activeTombstones) {
    const server = serverById.get(tombstone.serverId)
    if (!server) continue // already gone from the server

    matchedServerIds.add(server.id) // don't pull back a note the user deleted

    const serverChanged =
      tombstone.baseHash === undefined || (await hashNote(server)) !== tombstone.baseHash

    if (serverChanged) {
      conflicts.push({ local: null, server })
    } else {
      toDeleteOnServer.push(server)
    }
  }

  for (const local of localNotes) {
    if (local.serverId === undefined) {
      toPush.push(local)
      continue
    }

    const server = serverById.get(local.serverId)

    if (!server) {
      // Has a serverId but is gone from the server
      if (!trustServerDeletes) {
        toPush.push(local)
        continue
      }

      // No baseHash: can't tell if it changed, so ask
      const localChanged =
        local.baseHash === undefined || (await hashNote(local)) !== local.baseHash

      if (localChanged) {
        conflicts.push({ local, server: null })
      } else {
        toDeleteLocally.push(local)
      }
      continue
    }

    matchedServerIds.add(server.id)

    const localHash = await hashNote(local)
    const serverHash = await hashNote(server)

    if (localHash === serverHash) {
      clean.push({ ...local, updatedAt: server.updatedAt, baseHash: serverHash })
      continue
    }

    // No baseHash (synced before it existed): can't tell which side changed, so ask
    if (local.baseHash === undefined) {
      conflicts.push({ local, server })
      continue
    }

    const localChanged = localHash !== local.baseHash
    const serverChanged = serverHash !== local.baseHash

    if (localChanged && serverChanged) {
      conflicts.push({ local, server })
    } else if (localChanged) {
      toUpdateServer.push({ local, server })
    } else {
      toUpdateLocal.push({ local, server })
    }
  }

  const toPull = serverNotes.filter((n) => !matchedServerIds.has(n.id))

  return {
    toPush,
    toPull,
    toUpdateServer,
    toUpdateLocal,
    toDeleteOnServer,
    toDeleteLocally,
    conflicts,
    clean,
    tombstones,
    userId,
  }
}

// "Keep": the notes come back instead of being deleted.
// The tombstones are dropped in applySync.
export function keepDeletedNotes(plan: SyncPlan): SyncPlan {
  return {
    ...plan,
    toPull: [...plan.toPull, ...plan.toDeleteOnServer],
    toPush: [
      ...plan.toPush,
      ...plan.toDeleteLocally.map((n) => ({ ...n, serverId: undefined, baseHash: undefined })),
    ],
    toDeleteOnServer: [],
    toDeleteLocally: [],
  }
}

// Plan for "keep syncing" after a save: only sends local changes.
// No pulls, no deletions, no conflicts (those wait for the next full check).
export function sendOnlyPlan(plan: SyncPlan): SyncPlan {
  return {
    ...plan,
    toPull: [],
    toUpdateLocal: [],
    toDeleteOnServer: [],
    toDeleteLocally: [],
    conflicts: [],
    tombstones: [],
  }
}

// applySync reads the notes at the start and writes them at the end. Anything the
// user typed, created or deleted in between would be lost, so merge it back first.
async function mergeConcurrentEdits(startNotes: Note[], result: Map<number, Note>): Promise<void> {
  const current = await getLocalNotes()
  const started = new Map(startNotes.map((n) => [n.id, n]))
  const currentIds = new Set(current.map((n) => n.id))

  for (const now of current) {
    const before = started.get(now.id)

    if (!before) {
      if (!result.has(now.id)) result.set(now.id, now) // created during the sync
      continue
    }

    const synced = result.get(now.id)
    if (synced && now.updatedAt !== before.updatedAt) {
      // Edited during the sync: keep the new text, keep serverId and baseHash
      result.set(now.id, {
        ...synced,
        title: now.title,
        content: now.content,
        isBookmarked: now.isBookmarked,
        updatedAt: now.updatedAt,
      })
    }
  }

  for (const before of startNotes) {
    if (!currentIds.has(before.id)) result.delete(before.id) // deleted during the sync
  }
}

// Turns a note that came from the server into a new local note.
async function toLocalNote(server: Note): Promise<Note> {
  return {
    id: Date.now() + Math.random(),
    title: server.title,
    content: server.content,
    isBookmarked: server.isBookmarked,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
    userId: server.userId,
    serverId: server.id,
    baseHash: await hashNote(server),
  }
}

// Applies the plan. Every synced note gets a new baseHash.
export async function applySync(
  plan: SyncPlan,
  resolutions: Array<'local' | 'server'>,
): Promise<void> {
  const localNotes = await getLocalNotes()
  const byId = new Map(localNotes.map((n) => [n.id, n]))

  // Local-only notes, plus notes deleted on the server that the user kept
  const toCreate: Note[] = [...plan.toPush]
  plan.conflicts.forEach(({ local, server }, i) => {
    if (local && !server && resolutions[i] === 'local') {
      toCreate.push({ ...local, serverId: undefined, baseHash: undefined })
    }
  })

  // 1. Create notes on the server in two steps. The server creates an empty note
  // for each [[link]] it doesn't find, so sending "A" ([[B]]) before "B"
  // would duplicate "B".
  // Step 1: create every note with empty content
  const shells = new Map<number, Note>() // local id -> note created on the server
  for (const local of toCreate) {
    const shell = await createServerNote(local.title, '', local.isBookmarked)
    shells.set(local.id, shell)

    // Saved now, so if step 2 fails the next sync finishes the upload
    byId.set(local.id, {
      ...local,
      serverId: shell.id,
      baseHash: await hashNote({ title: local.title, content: '', isBookmarked: local.isBookmarked }),
    })
  }
  await mergeConcurrentEdits(localNotes, byId)
  await saveLocalNotes([...byId.values()])

  // Step 2: every title exists now, so send the real content
  for (const local of toCreate) {
    const shell = shells.get(local.id)!

    if (local.content) {
      await updateServerNote({ ...shell, content: local.content })
    }

    byId.set(local.id, {
      ...local,
      serverId: shell.id,
      updatedAt: local.content ? new Date().toISOString() : shell.updatedAt,
      baseHash: await hashNote(local),
    })
  }

  // 2. Server-only notes: add to local storage
  for (const server of plan.toPull) {
    const note = await toLocalNote(server)
    byId.set(note.id, note)
  }

  // 3. Same on both sides: copy the server timestamp and baseHash
  for (const note of plan.clean) {
    byId.set(note.id, note)
  }

  // 4. Only local changed: send it to the server
  for (const { local } of plan.toUpdateServer) {
    const pushed = { ...local, updatedAt: new Date().toISOString() }
    await updateServerNote({ ...pushed, id: local.serverId! })
    byId.set(local.id, { ...pushed, baseHash: await hashNote(pushed) })
  }

  // 5. Only the server changed: bring it to local
  for (const { local, server } of plan.toUpdateLocal) {
    byId.set(local.id, {
      ...local,
      title: server.title,
      content: server.content,
      isBookmarked: server.isBookmarked,
      updatedAt: server.updatedAt,
      baseHash: await hashNote(server),
    })
  }

  // 6. Deleted here: delete on the server too
  for (const server of plan.toDeleteOnServer) {
    await deleteServerNote(server.id)
  }

  // 7. Deleted on the server: delete here too
  for (const local of plan.toDeleteLocally) {
    byId.delete(local.id)
  }

  // 8. Conflicts: use the user's choice
  for (let i = 0; i < plan.conflicts.length; i++) {
    const { local, server } = plan.conflicts[i]
    const useLocal = resolutions[i] === 'local'

    if (local && server) {
      // Changed on both sides
      const winner = useLocal ? local : server

      const resolved: Note = {
        ...local,
        title: winner.title,
        content: winner.content,
        isBookmarked: winner.isBookmarked,
        updatedAt: useLocal ? new Date().toISOString() : server.updatedAt,
        baseHash: await hashNote(winner),
      }

      // Server version won, so no PUT needed
      if (useLocal) await updateServerNote({ ...resolved, id: local.serverId! })
      byId.set(local.id, resolved)
    } else if (server) {
      // Deleted here, changed on the server
      if (useLocal) {
        await deleteServerNote(server.id) // keep the deletion
      } else {
        const restored = await toLocalNote(server) // keep the server version
        byId.set(restored.id, restored)
      }
    } else if (local && !useLocal) {
      // Deleted on the server, changed here, and the user accepted the deletion
      // (if they kept it, step 1 already created it again)
      byId.delete(local.id)
    }
  }

  await mergeConcurrentEdits(localNotes, byId)
  await saveLocalNotes([...byId.values()])

  // Remove the tombstones this sync handled. New ones made meanwhile stay.
  const handled = new Set(plan.tombstones.map((t) => t.serverId))
  const remaining = (await getTombstones()).filter((t) => !handled.has(t.serverId))
  await saveTombstones(remaining)

  if (plan.userId !== undefined) await setSyncedUserId(plan.userId)
}

// Notes not on the server yet or with unsynced changes (used in the logout warning)
export async function countUnsyncedNotes(): Promise<number> {
  const notes = await getLocalNotes()
  let count = 0

  for (const note of notes) {
    const isSynced =
      note.serverId !== undefined &&
      note.baseHash !== undefined &&
      (await hashNote(note)) === note.baseHash

    if (!isSynced) count++
  }

  return count
}