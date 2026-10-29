// Where a note was captured from (the page in the active tab)
export interface NoteSource {
  url: string
  title: string
  snippet?: string // selected text, filled by the context menu (step 2c)
  capturedAt: string // ISO date
}

export interface Note {
  id: number
  title: string
  content: string
  isBookmarked: boolean
  createdAt: string
  updatedAt: string
  userId: number
  serverId?: number
  baseHash?: string
  source?: NoteSource // local only for now, not sent to the API
}