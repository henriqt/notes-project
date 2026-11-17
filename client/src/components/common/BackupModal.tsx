import './Modal.css'

interface BackupModalProps {
  onSave: () => void
  onImport: () => void
  onCancel: () => void
}

// Asks which backup action to run. Reuses the classes from Modal.css.
export function BackupModal({ onSave, onImport, onCancel }: BackupModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-icon">💾</span>
          <h2>Backup</h2>
          <button className="modal-close" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </div>

        <p className="modal-description">
          Save your notes to a file, or bring them back from one.
        </p>

        <div className="modal-options">
          <button className="modal-option" onClick={onSave}>
            <span className="modal-icon-small">⬇</span>
            <span className="modal-option-text">
              <strong>Save backup</strong>
              <span>Download all notes as a .json file</span>
            </span>
          </button>

          <button className="modal-option" onClick={onImport}>
            <span className="modal-icon-small">⬆</span>
            <span className="modal-option-text">
              <strong>Import backup</strong>
              <span>Add notes from a backup file. Duplicates are skipped.</span>
            </span>
          </button>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}