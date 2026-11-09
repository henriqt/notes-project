import { useEffect, useState } from 'react'

// What the panel needs to know about the page in the active tab
export interface PageContext {
  url: string
  title: string
  domain: string
}

// Returns null for pages we ignore (chrome://, about:blank, new tab, etc.)
function toPageContext(tab: chrome.tabs.Tab | undefined): PageContext | null {
  if (!tab?.url) return null

  let parsed: URL
  try {
    parsed = new URL(tab.url)
  } catch {
    return null
  }

  // Only normal web pages
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  return { url: tab.url, title: tab.title ?? '', domain: parsed.hostname }
}

// Follows the active tab of the focused window
export function usePageContext(): PageContext | null {
  const [page, setPage] = useState<PageContext | null>(null)

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      if (!cancelled) setPage(toPageContext(tab))
    }

    // Any tab can fire onUpdated, but refresh always reads the active one
    function handleUpdated(
      _tabId: number,
      changeInfo: { url?: string; title?: string; status?: string },
    ) {
      if (changeInfo.url || changeInfo.title || changeInfo.status === 'complete') {
        refresh()
      }
    }

    refresh() // first read when the panel opens

    chrome.tabs.onActivated.addListener(refresh) // switched tab
    chrome.tabs.onUpdated.addListener(handleUpdated) // navigated or title changed
    chrome.windows.onFocusChanged.addListener(refresh) // switched window

    return () => {
      cancelled = true
      chrome.tabs.onActivated.removeListener(refresh)
      chrome.tabs.onUpdated.removeListener(handleUpdated)
      chrome.windows.onFocusChanged.removeListener(refresh)
    }
  }, [])

  return page
}