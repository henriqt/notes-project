import { useEffect, useRef, useState } from 'react'
import './NotesPage.css'
import {
  getLocalNotes,
  createLocalNote,
  updateLocalNote,
  deleteLocalNote,
  toggleLocalBookmark,
  clearLocalData,
  getSyncEnabled,
  saveSyncEnabled,
} from '../api/localStore'
import type { Note } from '../types/note'
import { NoteList } from '../components/notes/NoteList'
import { NoteEditor } from '../components/notes/NoteEditor'
import { syncWikilinksOnSave } from '../utils/wikilinkSync'
import { useAuth } from '../auth/useAuth'
import { AUTH_EXPIRED_EVENT } from '../api/client'
import {
  planSync,
  applySync,
  keepDeletedNotes,
  sendOnlyPlan,
  countUnsyncedNotes,
  type SyncConflict,
  type SyncPlan,
} from '../api/syncService'
import { SyncConflictModal } from '../components/sync/SyncConflictModal'
import { SyncDeleteConfirmModal } from '../components/sync/SyncDeleteConfirmModal'
import { LogoutModal } from '../components/account/LogoutModal'
import { SyncToggle } from '../components/sync/SyncToggle'
import { LoginForm } from '../components/account/LoginForm'
import { RegisterForm } from '../components/account/RegisterForm'
import { EmptyState } from '../components/notes/EmptyState'

// One status value instead of several booleans
type SyncStatus = 'idle' | 'syncing' | 'done' | 'offline' | 'error'

// Wait this long after a save before sending it to the server
const AUTO_SYNC_DELAY_MS = 2000
// While offline, run a full check again this often
const OFFLINE_RETRY_MS = 15000

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
  const [authNotice, setAuthNotice] = useState('')
  const { isAuthenticated, login, logout } = useAuth()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[] | null>(null)
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletions | null>(null)
  const [logoutPrompt, setLogoutPrompt] = useState<{ unsyncedCount: number } | null>(null)
  // Which auth form is open (null = the notes screens)
  const [authView, setAuthView] = useState<'login' | 'register' | null>(null)
  // The notes drawer starts open, so the panel opens on the list
  const [drawerOpen, setDrawerOpen] = useState(true)

  // Timers and listeners read the ref, because their state would be stale
  const syncEnabledRef = useRef(false)
  // Only one sync at a time (full check or auto-send)
  const busyRef = useRef(false)
  const autoSyncTimer = useRef<number | undefined>(undefined)

  // Changes after every full sync. It is part of the NoteEditor key, so the editor
  // reloads the note (it only reads the content when it mounts).
  // Not updatedAt: that changes on every autosave and would remount while typing.
  // The auto-send never bumps it, or the editor would remount while typing.
  const [syncVersion, setSyncVersion] = useState(0)

  function handleSelectNote(id: number) {
    setSelectedNoteId(id)
    setDrawerOpen(false)
  }

  async function handleCreateNote() {
    try {
      const newNote = await createLocalNote('New note', '')
      setNotes((prev) => [newNote, ...prev])
      setSelectedNoteId(newNote.id)
      setDrawerOpen(false)
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

      scheduleAutoSync()
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
      if (updated) {
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
        scheduleAutoSync()
      }
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

  function handleLoggedIn() {
    login()
    setAuthView(null)
    setAuthNotice('')
    setDrawerOpen(true)
  }

  // Logout opens a modal first, so the user can also clear the local notes
  async function handleLogoutClick() {
    const unsyncedCount = await countUnsyncedNotes()
    setLogoutPrompt({ unsyncedCount })
  }

  async function handleLogoutConfirmed(clearLocalNotes: boolean) {
    setAuthNotice('')
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

    await changeSyncEnabled(false)
    setSyncStatus('idle')
    logout()
  }

  // Turns "keep syncing" on or off, in memory and in storage
  async function changeSyncEnabled(value: boolean) {
    syncEnabledRef.current = value
    setSyncEnabled(value)
    if (!value) window.clearTimeout(autoSyncTimer.current)
    await saveSyncEnabled(value)
  }

  function handleSyncFailure(err: unknown) {
    console.error('sync failed', err)

    // fetch throws a TypeError when there is no connection
    const offline = err instanceof TypeError

    if (offline && syncEnabledRef.current) {
      setSyncStatus('offline')
      return
    }

    setError(
      offline
        ? "Can't reach the server. Keep syncing was not turned on."
        : 'Failed to sync with the server',
    )
    setSyncStatus('error')
  }

  // Applies the plan and refreshes the screen.
  // A full sync that works also turns the toggle on.
  async function applyPlan(plan: SyncPlan, resolutions: Array<'local' | 'server'>) {
    setSyncStatus('syncing')

    try {
      await applySync(plan, resolutions)
      const refreshed = await getLocalNotes()
      setNotes(refreshed)
      setSyncVersion((v) => v + 1)
      if (!syncEnabledRef.current) await changeSyncEnabled(true)
      setSyncStatus('done')
    } catch (err) {
      handleSyncFailure(err)
    } finally {
      pendingPlan = null
      pendingResolutions = []
      busyRef.current = false
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

  // Full check: plan, then conflict modal, then delete confirmation, then apply.
  // Runs when the toggle is turned on, when the tab opens and when the connection comes back.
  async function runFullSync() {
    if (busyRef.current) return
    busyRef.current = true

    setSyncStatus('syncing')
    setError('')

    try {
      const plan = await planSync()

      if (plan.conflicts.length > 0) {
        pendingPlan = plan
        setPendingConflicts(plan.conflicts)
        return // busyRef is released when the modals finish
      }

      await applyOrConfirm(plan, [])
    } catch (err) {
      handleSyncFailure(err)
      busyRef.current = false
    }
  }

  // Auto-send: only sends local changes, never opens a modal
  async function runQuietSync() {
    if (!syncEnabledRef.current) return

    if (busyRef.current) {
      scheduleAutoSync() // a full check is running, try again later
      return
    }

    busyRef.current = true
    setSyncStatus('syncing')

    try {
      const plan = await planSync()
      await applySync(sendOnlyPlan(plan), [])
      const refreshed = await getLocalNotes()
      setNotes(refreshed)
      setSyncStatus('done')
    } catch (err) {
      handleSyncFailure(err)
    } finally {
      busyRef.current = false
    }
  }

  function scheduleAutoSync() {
    if (!syncEnabledRef.current) return

    window.clearTimeout(autoSyncTimer.current)
    autoSyncTimer.current = window.setTimeout(runQuietSync, AUTO_SYNC_DELAY_MS)
  }

  async function handleToggleSync() {
    if (!isAuthenticated) {
      setAuthView('login')
      setDrawerOpen(false)
      return
    }

    if (syncEnabled) {
      await changeSyncEnabled(false)
      setSyncStatus('idle')
      return
    }

    await runFullSync()
  }

  async function handleConflictsResolved(resolutions: Array<'local' | 'server'>) {
    const plan = pendingPlan
    setPendingConflicts(null)
    if (!plan) {
      busyRef.current = false
      return
    }

    await applyOrConfirm(plan, resolutions)
  }

  async function handleDeletionsConfirmed() {
    const plan = pendingPlan
    const resolutions = pendingResolutions
    setPendingDeletions(null)
    if (!plan) {
      busyRef.current = false
      return
    }

    await applyPlan(plan, resolutions)
  }

  // "Keep": bring the notes back instead of deleting them
  async function handleDeletionsKept() {
    const plan = pendingPlan
    const resolutions = pendingResolutions
    setPendingDeletions(null)
    if (!plan) {
      busyRef.current = false
      return
    }

    await applyPlan(keepDeletedNotes(plan), resolutions)
  }

  // Cancelling a modal turns the toggle off. Nothing was applied, so the next
  // full check asks again. With it on, the auto-send could overwrite the server.
  async function handleSyncCancelled() {
    pendingPlan = null
    pendingResolutions = []
    busyRef.current = false
    setPendingConflicts(null)
    setPendingDeletions(null)
    setSyncStatus('idle')
    await changeSyncEnabled(false)
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const data = await getLocalNotes()
        if (cancelled) return
        setNotes(data)

        const enabled = await getSyncEnabled()
        if (cancelled) return

        if (enabled && isAuthenticated) {
          syncEnabledRef.current = true
          setSyncEnabled(true)
          runFullSync() // full check when the tab opens
        } else if (enabled) {
          await saveSyncEnabled(false) // there is no valid token anymore
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 401: authFetch fires this event, so the toggle goes off.
  // The notice below tells the user to log in again.
  useEffect(() => {
    function handleExpired() {
      syncEnabledRef.current = false
      saveSyncEnabled(false)
      setAuthNotice('Your session expired. Log in again.')
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
      window.clearTimeout(autoSyncTimer.current)
    }
  }, [])

  // Offline with the toggle on: full check again every few seconds
  // and as soon as the browser says the connection is back
  useEffect(() => {
    if (!syncEnabled || syncStatus !== 'offline') return

    const id = window.setInterval(runFullSync, OFFLINE_RETRY_MS)
    window.addEventListener('online', runFullSync)

    return () => {
      window.clearInterval(id)
      window.removeEventListener('online', runFullSync)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled, syncStatus])

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null

  // Sync toggle, status and login/logout. They live in the drawer footer.
  const syncControls = (
    <>
      <span className="topbar-sync">
        <SyncToggle
          checked={syncEnabled}
          disabled={syncStatus === 'syncing' && !syncEnabled}
          title={isAuthenticated ? 'Keep syncing' : 'Login to sync'}
          onChange={handleToggleSync}
        />
        <span>
          {syncStatus === 'syncing' && 'Syncing...'}
          {syncStatus === 'done' && syncEnabled && 'Synced'}
          {syncStatus === 'offline' && 'Offline, retrying...'}
        </span>
      </span>

      {isAuthenticated ? (
        <button onClick={handleLogoutClick}>Logout</button>
      ) : (
        <button
          onClick={() => {
            setAuthView('login')
            setDrawerOpen(false)
          }}
        >
          Log in
        </button>
      )}
    </>
  )

  if (loading) return <p>Loading...</p>

  return (
    <div className="notes-page">
      <div className="notes-body">
        <main className="notes-main">
          {error && <p role="alert">{error}</p>}
          {wikilinkNotice && <p role="status">{wikilinkNotice}</p>}
          {authNotice && !isAuthenticated && <p role="status">{authNotice}</p>}

          {authView && !isAuthenticated ? (
            <div className="auth-screen">
              <div className="pane-header">
                <button
                  className="pane-action"
                  onClick={() => {
                    setAuthView(null)
                    setDrawerOpen(true)
                  }}
                  aria-label="Back to notes"
                  title="Back to notes"
                >
                  ←
                </button>
              </div>
              <div className="auth-screen-body">
                {authView === 'login' ? (
                  <LoginForm
                    onLoggedIn={handleLoggedIn}
                    onSwitchToRegister={() => setAuthView('register')}
                  />
                ) : (
                  <RegisterForm
                    onRegistered={() => setAuthView('login')}
                    onSwitchToLogin={() => setAuthView('login')}
                  />
                )}
              </div>
            </div>
          ) : selectedNote ? (
            <div className="notes-editor-wrap">
              <NoteEditor
                key={`${selectedNote.id}-${syncVersion}`}
                note={selectedNote}
                onSave={handleSaveNote}
                onWikilinkClick={handleWikilinkClick}
                onToggleBookmark={() => handleToggleBookmark(selectedNote.id)}
                onOpenDrawer={() => setDrawerOpen(true)}
              />
            </div>
          ) : (
            <EmptyState
              onCreateNote={handleCreateNote}
              headerRight={
                <button
                  className="pane-action"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open notes"
                  title="Open notes"
                >
                  ☰
                </button>
              }
            />
          )}

          {drawerOpen && !(authView && !isAuthenticated) && (
            <>
              <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />
              <aside className="drawer">
                <div className="drawer-header">
                  <span className="drawer-title">Notes</span>
                  <button
                    className="pane-action"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close notes"
                    title="Close notes"
                  >
                    ✕
                  </button>
                </div>

                <NoteList
                  notes={notes}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={handleSelectNote}
                  onCreateNote={handleCreateNote}
                  onDeleteNote={handleDeleteNote}
                />

                <div className="drawer-footer">{syncControls}</div>
              </aside>
            </>
          )}
        </main>
      </div>
      
      {pendingConflicts && (
        <SyncConflictModal
          conflicts={pendingConflicts}
          onResolve={handleConflictsResolved}
          onCancel={handleSyncCancelled}
        />
      )}

      {pendingDeletions && (
        <SyncDeleteConfirmModal
          fromServer={pendingDeletions.fromServer}
          fromDevice={pendingDeletions.fromDevice}
          onConfirm={handleDeletionsConfirmed}
          onKeep={handleDeletionsKept}
          onCancel={handleSyncCancelled}
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