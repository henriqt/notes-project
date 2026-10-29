// Clicking the toolbar icon opens the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('side panel setup failed', err))

import { createLocalNote } from './api/localStore'

const MENU_ID = 'save-selection'
// Same idea as the title limit: keeps a huge selection from bloating the note
const MAX_SNIPPET_LENGTH = 1000

// The menu is created once, when the extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Save selection as note',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return

  const url = info.pageUrl ?? tab?.url
  if (!url) return

  const title = tab?.title?.trim().slice(0, 200) || 'New note'

  try {
    await createLocalNote(title, '', {
      url,
      title: tab?.title ?? '',
      snippet: info.selectionText.trim().slice(0, MAX_SNIPPET_LENGTH),
      capturedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('save selection failed', err)
  }
})