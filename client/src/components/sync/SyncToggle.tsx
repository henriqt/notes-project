import './SyncToggle.css'

interface SyncToggleProps {
  checked: boolean
  disabled?: boolean
  title?: string
  onChange: () => void
}

export function SyncToggle({ checked, disabled, title, onChange }: SyncToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Keep syncing"
      title={title}
      disabled={disabled}
      className="sync-toggle"
      onClick={onChange}
    >
      <span className="sync-toggle-knob" />
    </button>
  )
}