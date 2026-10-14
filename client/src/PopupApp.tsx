import { useState } from 'react'
import { createLocalNote } from './api/localStore'
import { getTokenEmail } from './api/client'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'
import './PopupApp.css'

const APP_URL = chrome.runtime.getURL('index.html')

// Focuses the extension tab if it is open, or opens a new one.
// notifyOpenNote: also tells the tab to open the note saved in pendingOpenNoteId
async function openNotesTab(notifyOpenNote: boolean) {
  // Finds the open extension tab. startsWith because HashRouter adds "#/..."
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.TAB],
  })
  const existing = contexts.find((c) => c.documentUrl?.startsWith(APP_URL))

  if (existing && existing.tabId !== -1) {
    // Focus the tab first: focusing the window closes the popup
    if (notifyOpenNote) {
      await chrome.tabs.sendMessage(existing.tabId, { type: 'OPEN_NOTE' }).catch(() => {})
    }
    await chrome.tabs.update(existing.tabId, { active: true })

    if (existing.windowId !== -1) {
      chrome.windows.update(existing.windowId, { focused: true })
    }
  } else {
    await chrome.tabs.create({ url: APP_URL })
  }
}

export function PopupApp() {
  // Email of the logged in account (undefined = logged out)
  const [email, setEmail] = useState<string | undefined>(getTokenEmail())
  const [authView, setAuthView] = useState<'login' | 'register'>('login')

    async function handleNewNote() {
      const note = await createLocalNote('New note', '')
      await chrome.storage.local.set({ pendingOpenNoteId: note.id })
      await openNotesTab(true)
  }

  async function handleOpenNotes() {
      await openNotesTab(false)
  }

  return (
    <div style={{ width: 220, padding: 16, fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Notes Project</h3>
      <button onClick={handleNewNote} style={{ width: '100%', padding: '8px 12px', cursor: 'pointer' }}>
        + New note
      </button>
            <button
        onClick={handleOpenNotes}
        style={{ width: '100%', padding: '8px 12px', cursor: 'pointer', marginTop: 8 }}
      >
        Open notes
      </button>

      <hr style={{ margin: '16px 0 12px' }} />

      {email ? (
        <p style={{ margin: 0, fontSize: '0.85rem' }}>Signed in as {email}</p>
      ) : authView === 'login' ? (
        <LoginForm
          onLoggedIn={() => setEmail(getTokenEmail())}
          onSwitchToRegister={() => setAuthView('register')}
        />
      ) : (
        <RegisterForm
          onRegistered={() => setAuthView('login')}
          onSwitchToLogin={() => setAuthView('login')}
        />
      )}
    </div>
  )
}