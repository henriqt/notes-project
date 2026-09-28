import { createLocalNote } from './api/localStore'
import './PopupApp.css'

const APP_URL = chrome.runtime.getURL('index.html')

export function PopupApp() {
  async function handleNewNote() {
    const note = await createLocalNote('New note', '')
    await chrome.storage.local.set({ pendingOpenNoteId: note.id })

    // Finds the open extension tab. startsWith because HashRouter adds "#/..."
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.TAB],
    })
    const existing = contexts.find((c) => c.documentUrl?.startsWith(APP_URL))

    if (existing && existing.tabId !== -1) {
      // Focus the tab first: focusing the window closes the popup
      await chrome.tabs.sendMessage(existing.tabId, { type: 'OPEN_NOTE' }).catch(() => {})
      await chrome.tabs.update(existing.tabId, { active: true })

      if (existing.windowId !== -1) {
        chrome.windows.update(existing.windowId, { focused: true })
      }
    } else {
      await chrome.tabs.create({ url: APP_URL })
    }
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