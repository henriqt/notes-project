import { useState } from 'react'
import '../common/Modal.css'

interface LogoutModalProps {
  unsyncedCount: number // local notes that only exist here or have unsynced changes
  onConfirm: (clearLocalNotes: boolean) => void
  onCancel: () => void
}

// Shown when the user clicks Logout. Logging out alone keeps every note on
// this device; the checkbox is the only way to clear them from the UI.
// Reuses the classes from SyncConflictModal.css.
export function LogoutModal({ unsyncedCount, onConfirm, onCancel }: LogoutModalProps) {
  const [clearLocalNotes, setClearLocalNotes] = useState(false)

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Log out</h2>
          <button className="modal-close" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </div>

        <p className="modal-description">
          You can keep using the app offline after logging out. Your notes stay on this device.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={clearLocalNotes}
            onChange={(e) => setClearLocalNotes(e.target.checked)}
          />
          Also clear the notes stored on this device
        </label>

        {clearLocalNotes && (
          <p className="modal-warning">
            {unsyncedCount > 0
              ? `Unsynced changes in ${unsyncedCount} ${unsyncedCount === 1 ? 'note' : 'notes'} will be lost for good. Notes already synced stay on the server.`
              : 'Everything is synced. Your notes stay on the server and come back when you log in and sync.'}
          </p>
        )}

        <div className="modal-actions">
          <button className="modal-continue" onClick={() => onConfirm(clearLocalNotes)}>
            {clearLocalNotes ? 'Log out and clear' : 'Log out'}
          </button>
          <button className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}