import '../common/Modal.css'

interface ServerUnreachableModalProps {
  onRetry: () => void
  onClose: () => void
}

// Shown when "Keep syncing" is turned on but the server doesn't answer.
// The toggle stays off, and the notes on this device are not touched.
export function ServerUnreachableModal({ onRetry, onClose }: ServerUnreachableModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-icon">⚠</span>
          <h2>Can't reach the server</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="modal-description">
          The sync server isn't responding, so Keep syncing was not turned on.
        </p>

        <p className="modal-warning">
          Your notes are safe on this device and keep working offline. Try again in a moment.
        </p>

        <div className="modal-actions">
          <button className="modal-continue" onClick={onRetry}>
            Try again
          </button>
          <button className="modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}