import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getLocalNotes,
  createLocalNote,
  updateLocalNote,
  deleteLocalNote,
  toggleLocalBookmark,
  clearLocalData,
} from '../api/localStore'
import type { Note } from '../types/note'
import { Sidebar } from '../components/Sidebar'
import { NoteEditor } from '../components/NoteEditor'
import { syncWikilinksOnSave } from '../utils/wikilinkSync'
import { useAuth } from '../auth/useAuth'
import {
  planSync,
  applySync,
  keepDeletedNotes,
  countUnsyncedNotes,
  type SyncConflict,
  type SyncPlan,
} from '../api/syncService'
import { SyncConflictModal } from '../components/SyncConflictModal'
import { SyncDeleteConfirmModal } from '../components/SyncDeleteConfirmModal'
import { LogoutModal } from '../components/LogoutModal'

// One status value instead of several booleans
type SyncStatus = 'idle' | 'syncing' | 'done' | 'error'

// Titles shown in the "confirm deletions" modal
interface PendingDeletions {
  fromServer: string[]
  fromDevice: string[]
}

function hasDeletions(plan: SyncPlan): boolean {
  return plan.toDeleteOnServer.length > 0 || plan.toDeleteLocally.length > 0
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wikilinkNotice, setWikilinkNotice] = useState('')

  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[] | null>(null)
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletions | null>(null)
  const [logoutPrompt, setLogoutPrompt] = useState<{ unsyncedCount: number } | null>(null)

  // Changes after every sync. It is part of the NoteEditor key, so the editor
  // reloads the note (it only reads the content when it mounts).
  // Not updatedAt: that changes on every autosave and would remount while typing.
  const [syncVersion, setSyncVersion] = useState(0)

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
      setWikilinkNotice(`The note "${title}" doesn't exist yet.`)
    }
  }

  // Logout opens a modal first, so the user can also clear the local notes
  async function handleLogoutClick() {
    const unsyncedCount = await countUnsyncedNotes()
    setLogoutPrompt({ unsyncedCount })
  }

  async function handleLogoutConfirmed(clearLocalNotes: boolean) {
    setLogoutPrompt(null)

    if (clearLocalNotes) {
      try {
        await clearLocalData()
        setNotes([])
        setSelectedNoteId(null)
        setSyncVersion((v) => v + 1)
      } catch {
        // Stay logged in if clearing fails
        setError('Failed to clear local notes')
        return
      }
    }

    logout()
  }

  // Applies the plan and refreshes the screen
  async function applyPlan(plan: SyncPlan, resolutions: Array<'local' | 'server'>) {
    setSyncStatus('syncing')

    try {
      await applySync(plan, resolutions)
      const refreshed = await getLocalNotes()
      setNotes(refreshed)
      setSyncVersion((v) => v + 1)
      setSyncStatus('done')
    } catch (err) {
      console.error('sync failed', err)
      setError('Failed to sync with the server')
      setSyncStatus('error')
    } finally {
      pendingPlan = null
      pendingResolutions = []
    }
  }

  // Deletions inside conflicts were already decided in the conflict modal,
  // so only ask about the others
  async function applyOrConfirm(plan: SyncPlan, resolutions: Array<'local' | 'server'>) {
    if (!hasDeletions(plan)) {
      await applyPlan(plan, resolutions)
      return
    }

    pendingPlan = plan
    pendingResolutions = resolutions
    setPendingDeletions({
      fromServer: plan.toDeleteOnServer.map((n) => n.title || 'Untitled'),
      fromDevice: plan.toDeleteLocally.map((n) => n.title || 'Untitled'),
    })
  }

  // Plan, then conflict modal, then delete confirmation, then apply
  async function handleSyncClick() {
    if (!isAuthenticated) return

    setSyncStatus('syncing')
    setError('')

    try {
      const plan = await planSync()

      if (plan.conflicts.length > 0) {
        pendingPlan = plan
        setPendingConflicts(plan.conflicts)
        return
      }

      await applyOrConfirm(plan, [])
    } catch (err) {
      console.error('sync failed', err)
      setError('Failed to sync with the server')
      setSyncStatus('error')
    }
  }

  async function handleConflictsResolved(resolutions: Array<'local' | 'server'>) {
    const plan = pendingPlan
    setPendingConflicts(null)
    if (!plan) return

    await applyOrConfirm(plan, resolutions)
  }

  function handleConflictsCancelled() {
    pendingPlan = null
    setPendingConflicts(null)
    setSyncStatus('idle')
  }

  async function handleDeletionsConfirmed() {
    const plan = pendingPlan
    const resolutions = pendingResolutions
    setPendingDeletions(null)
    if (!plan) return

    await applyPlan(plan, resolutions)
  }

  // "Keep": bring the notes back instead of deleting them
  async function handleDeletionsKept() {
    const plan = pendingPlan
    const resolutions = pendingResolutions
    setPendingDeletions(null)
    if (!plan) return

    await applyPlan(keepDeletedNotes(plan), resolutions)
  }

  // Nothing was applied, so the next sync asks again
  function handleDeletionsCancelled() {
    pendingPlan = null
    pendingResolutions = []
    setPendingDeletions(null)
    setSyncStatus('idle')
  }

  // Opens the note the popup asked for. Also runs when the tab becomes visible,
  // because the message can be missed
  async function checkPendingNote() {
    const result = (await chrome.storage.local.get({
      pendingOpenNoteId: null as number | null,
    })) as { pendingOpenNoteId: number | null }

    if (result.pendingOpenNoteId !== null) {
      const data = await getLocalNotes()
      setNotes(data)
      setSelectedNoteId(result.pendingOpenNoteId)
      await chrome.storage.local.remove('pendingOpenNoteId')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const data = await getLocalNotes()
        if (cancelled) return
        setNotes(data)

        const result = (await chrome.storage.local.get({
          pendingOpenNoteId: null as number | null,
        })) as { pendingOpenNoteId: number | null }

        if (cancelled) return
        if (result.pendingOpenNoteId !== null) {
          setSelectedNoteId(result.pendingOpenNoteId)
          await chrome.storage.local.remove('pendingOpenNoteId')
        }
      } catch {
        if (!cancelled) setError('Failed to load notes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleMessage(message: { type: string }) {
      if (message.type === 'OPEN_NOTE') checkPendingNote()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') checkPendingNote()
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', gap: 8 }}>
        {isAuthenticated ? (
          <button onClick={handleLogoutClick}>Logout</button>
        ) : (
          <button onClick={() => navigate('/login')}>Login</button>
        )}
        <button
          onClick={handleSyncClick}
          disabled={!isAuthenticated || syncStatus === 'syncing'}
          title={isAuthenticated ? 'Sync with the server' : 'Login to sync'}
        >
          {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
        </button>
        {syncStatus === 'done' && <span style={{ marginLeft: 8 }}>Synced!</span>}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          notes={notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
        />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {error && <p role="alert">{error}</p>}
          {wikilinkNotice && <p role="status">{wikilinkNotice}</p>}

          {selectedNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <button onClick={() => handleToggleBookmark(selectedNote.id)}>
                {selectedNote.isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
              </button>
              <NoteEditor
                key={`${selectedNote.id}-${syncVersion}`}
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

      {pendingConflicts && (
        <SyncConflictModal
          conflicts={pendingConflicts}
          onResolve={handleConflictsResolved}
          onCancel={handleConflictsCancelled}
        />
      )}

      {pendingDeletions && (
        <SyncDeleteConfirmModal
          fromServer={pendingDeletions.fromServer}
          fromDevice={pendingDeletions.fromDevice}
          onConfirm={handleDeletionsConfirmed}
          onKeep={handleDeletionsKept}
          onCancel={handleDeletionsCancelled}
        />
      )}

      {logoutPrompt && (
        <LogoutModal
          unsyncedCount={logoutPrompt.unsyncedCount}
          onConfirm={handleLogoutConfirmed}
          onCancel={() => setLogoutPrompt(null)}
        />
      )}
    </div>
  )
}

// Plan and choices kept between planSync() and applySync(), because the
// modals come in between. Module variables since only one sync runs at a time.
let pendingPlan: SyncPlan | null = null
let pendingResolutions: Array<'local' | 'server'> = []