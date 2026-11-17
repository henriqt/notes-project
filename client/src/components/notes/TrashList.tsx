import { useState } from 'react'
import type { TrashedNote } from '../../api/localStore'
import { ConfirmModal } from '../common/ConfirmModal'
import './TrashList.css'

interface TrashListProps {
  items: TrashedNote[]
  onRestore: (id: number) => void
  onDeleteForever: (id: number) => void
  onEmpty: () => void
  onBack: () => void
}

export function TrashList({ items, onRestore, onDeleteForever, onEmpty, onBack }: TrashListProps) {
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  return (
    <div className="trash-screen">
      <div className="pane-header">
        <button className="pane-action" onClick={onBack} aria-label="Back to notes" title="Back to notes">
          ←
        </button>
        <span className="trash-title">Recently deleted</span>
        <button className="trash-empty-btn" onClick={() => setConfirmEmpty(true)} disabled={items.length === 0}>
            Empty
        </button>
      </div>

      <div className="trash-body">
        {items.length === 0 ? (
          <p className="trash-empty">Nothing here</p>
        ) : (
          <ul className="trash-list">
            {items.map(({ note, deletedAt }) => (
              <li key={note.id} className="trash-item">
                <div className="trash-item-text">
                  <span className="trash-item-title">{note.title || 'Untitled'}</span>
                  <span className="trash-item-date">
                    Deleted {new Date(deletedAt).toLocaleDateString()}
                  </span>
                </div>
                <button className="trash-restore" onClick={() => onRestore(note.id)}>
                  Restore
                </button>
                <button
                  className="trash-delete"
                  onClick={() => onDeleteForever(note.id)}
                  aria-label={`Delete ${note.title || 'Untitled'} for good`}
                  title="Delete for good"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
        {confirmEmpty && (
        <ConfirmModal
            title="Empty trash"
            description={`${items.length} ${items.length === 1 ? 'note' : 'notes'} will be deleted for good. This can't be undone.`}
            confirmLabel="Delete"
            onConfirm={() => {
            setConfirmEmpty(false)
            onEmpty()
            }}
            onCancel={() => setConfirmEmpty(false)}
        />
        )}
    </div>
  )
}