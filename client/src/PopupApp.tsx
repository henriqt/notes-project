import { createLocalNote } from './api/localStore'

export function PopupApp() {
  async function handleNewNote() {
    const note = await createLocalNote('New note', '')
    await chrome.storage.local.set({ lastOpenedNoteId: note.id })
    await chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
    window.close()
  }

  return (
    <div style={{ width: 220, padding: 16, fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Notes Project</h3>
      <button onClick={handleNewNote} style={{ width: '100%', padding: '8px 12px', cursor: 'pointer' }}>
        + New note
      </button>
    </div>
  )
}