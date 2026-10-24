import type { ReactNode } from 'react'
import './NoteEditor.css'
import './EmptyState.css'

interface EmptyStateProps {
  onCreateNote: () => void
  headerRight?: ReactNode // same sync controls the editor shows
}

// No Edit/Preview tabs and no divider: there is nothing to edit yet.
// The top bar keeps the same height and the controls stay in the same place
// as when a note is open, so nothing jumps when a note gets selected.
export function EmptyState({ onCreateNote, headerRight }: EmptyStateProps) {
  return (
    <div className="notes-editor-wrap">
      <div className="pane-header empty-header">
        <div className="pane-header-right">{headerRight}</div>
      </div>

      <div className="empty-message">
        <h2>No note selected</h2>
        <p>Pick a note from the sidebar or create a new one.</p>
        <button onClick={onCreateNote}>+ New note</button>
      </div>

      <div className="status-bar" />
    </div>
  )
}