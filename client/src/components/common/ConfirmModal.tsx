import './Modal.css'

interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Generic yes/no popup. Reuses the classes from Modal.css.
export function ConfirmModal({ title, description, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-icon">⚠</span>
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel} aria-label="Cancel">
            ×
          </button>
        </div>

        <p className="modal-description">{description}</p>

        <div className="modal-actions">
          <button className="modal-continue" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="modal-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}