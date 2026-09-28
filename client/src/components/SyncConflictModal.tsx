import { useState } from 'react'
import type { SyncConflict } from '../api/syncService'
import type { Note } from '../types/note'
import './SyncConflictModal.css'

interface SyncConflictModalProps {
  conflicts: SyncConflict[]
  onResolve: (resolutions: Array<'local' | 'server'>) => void
  onCancel: () => void
}

function formatModifiedAt(isoDate: string): string {
  const date = new Date(isoDate)
  return `Modified ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

// A side that is null means the note was deleted there
function describeSide(note: Note | null): string {
  return note ? formatModifiedAt(note.updatedAt) : 'Deleted'
}

function describeConflict(conflict: SyncConflict): string {
  const title = (conflict.local ?? conflict.server)?.title || 'Untitled'

  if (!conflict.local) {
    return `You deleted the note "${title}" on this device, but it was changed on the server. Whichever version you choose to keep will be synced to this device and the server.`
  }
  if (!conflict.server) {
    return `The note "${title}" was deleted on the server, but you changed it on this device. Whichever version you choose to keep will be synced to this device and the server.`
  }
  return `Your local note "${title}" conflicts with what is stored on the server. Whichever version you choose to keep will be synced to this device and the server. The one you don't pick will be overwritten.`
}

function describeOutcome(conflict: SyncConflict, choice: 'local' | 'server'): string {
  if (!conflict.local) {
    return choice === 'server'
      ? 'The note will be restored on this device.'
      : 'The note will be deleted from the server.'
  }
  if (!conflict.server) {
    return choice === 'server'
      ? 'The note will be deleted from this device.'
      : 'The note will be created again on the server.'
  }
  return choice === 'server'
    ? 'Your local version will be overwritten using the server version.'
    : 'The server version will be overwritten using your local version.'
}

// Shows one conflict at a time. The user picks local
// or server for the current note, clicks Continue, and we move to the next
// one. When all conflicts are answered, onResolve is called with the full list.
export function SyncConflictModal({ conflicts, onResolve, onCancel }: SyncConflictModalProps) {
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState<'local' | 'server'>('server')
  const [resolutions, setResolutions] = useState<Array<'local' | 'server'>>([])

  const current = conflicts[index]
  const isLast = index === conflicts.length - 1

  function handleContinue() {
    const next = [...resolutions, choice]

    if (isLast) {
      onResolve(next)
      return
    }

    setResolutions(next)
    setIndex(index + 1)
    setChoice('server') // reset the pick for the next conflict
  }

  return (
    <div className="sync-modal-overlay">
      <div className="sync-modal">
        <div className="sync-modal-header">
          <span className="sync-modal-icon">⚠</span>
          <h2>Cloud Conflict</h2>
          <button className="sync-modal-close" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </div>

        <p className="sync-modal-description">
          {describeConflict(current)}
          {conflicts.length > 1 && ` (Conflict ${index + 1} of ${conflicts.length})`}
        </p>

        <div className="sync-modal-options">
          <button
            className={`sync-modal-option ${choice === 'server' ? 'selected' : ''}`}
            onClick={() => setChoice('server')}
          >
            <span className="sync-modal-radio" />
            <span className="sync-modal-icon-small">☁</span>
            <span className="sync-modal-option-text">
              <strong>Server Save</strong>
              <span>{describeSide(current.server)}</span>
            </span>
          </button>

          <button
            className={`sync-modal-option ${choice === 'local' ? 'selected' : ''}`}
            onClick={() => setChoice('local')}
          >
            <span className="sync-modal-radio" />
            <span className="sync-modal-icon-small">💾</span>
            <span className="sync-modal-option-text">
              <strong>Local Save</strong>
              <span>{describeSide(current.local)}</span>
            </span>
          </button>
        </div>

        <p className="sync-modal-warning">{describeOutcome(current, choice)}</p>

        <div className="sync-modal-actions">
          <button className="sync-modal-continue" onClick={handleContinue}>
            {isLast ? 'Continue' : 'Next'}
          </button>
          <button className="sync-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}