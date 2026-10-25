import '../common/Modal.css'

interface SyncDeleteConfirmModalProps {
  fromServer: string[] // titles that will be deleted from the server
  fromDevice: string[] // titles that will be removed from this device
  onConfirm: () => void // apply the deletions
  onKeep: () => void // bring the notes back instead of deleting them
  onCancel: () => void // do nothing now, ask again on the next sync
}

// Long lists get cut so the modal doesn't grow past the screen
const MAX_LISTED = 5

function noteCount(count: number): string {
  return `${count} ${count === 1 ? 'note' : 'notes'}`
}

function TitleList({ titles }: { titles: string[] }) {
  const shown = titles.slice(0, MAX_LISTED)
  const hidden = titles.length - shown.length

  return (
    <ul style={{ margin: '0 0 12px', paddingLeft: 20, fontSize: '0.9rem' }}>
      {shown.map((title, i) => (
        <li key={i}>{title}</li>
      ))}
      {hidden > 0 && <li>and {hidden} more</li>}
    </ul>
  )
}

// Shown before a sync applies deletions that nobody was asked about: notes
// deleted here that still exist on the server, and notes deleted on the
// server that still exist here. Reuses the classes from SyncConflictModal.css.
export function SyncDeleteConfirmModal({
  fromServer,
  fromDevice,
  onConfirm,
  onKeep,
  onCancel,
}: SyncDeleteConfirmModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-icon">⚠</span>
          <h2>Confirm sync</h2>
          <button className="modal-close" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </div>

        {fromServer.length > 0 && (
          <>
            <p className="modal-description" style={{ marginBottom: 4 }}>
              {noteCount(fromServer.length)} will be deleted from the server:
            </p>
            <TitleList titles={fromServer} />
          </>
        )}

        {fromDevice.length > 0 && (
          <>
            <p className="modal-description" style={{ marginBottom: 4 }}>
              {noteCount(fromDevice.length)} will be removed from this device:
            </p>
            <TitleList titles={fromDevice} />
          </>
        )}

        <p className="modal-warning">
          Delete can't be undone. Keep brings the notes back instead: the ones deleted here are
          restored from the server, and the ones deleted on the server are created there again.
          Cancel decides later.
        </p>

        <div className="modal-actions">
          <button className="modal-continue" onClick={onConfirm}>
            Delete
          </button>
          <button className="modal-cancel" onClick={onKeep}>
            Keep notes
          </button>
          <button className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}