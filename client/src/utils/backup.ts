import type { Note } from '../types/note'

const BACKUP_VERSION = 1
// Same limits as the API (Note.cs)
const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 200_000

// A backup is a few MB at most, so anything bigger is the wrong file
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export interface BackupNote {
  title: string
  content: string
  isBookmarked: boolean
  createdAt: string
  updatedAt: string
  source?: { url: string }
}

export interface ParsedBackup {
  notes: BackupNote[]
  invalid: number // entries that were skipped
}

function validDate(value: unknown, fallback: string): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback
}

// Only the fields that mean something outside this device and this account
function buildBackup(notes: Note[]): string {
  const backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    notes: notes.map((n) => ({
      title: n.title,
      content: n.content,
      isBookmarked: n.isBookmarked,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      source: n.source,
    })),
  }
  return JSON.stringify(backup, null, 2)
}

// Saves the notes as a .json file through the browser's download
export function downloadBackup(notes: Note[]): void {
  const blob = new Blob([buildBackup(notes)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  // "sv-SE" gives YYYY-MM-DD in the local time zone
  const day = new Date().toLocaleDateString('sv-SE')

  const link = document.createElement('a')
  link.href = url
  link.download = `notes-backup-${day}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Reads the text of a backup file. The file is not trusted: every field is checked.
export function parseBackup(text: string): ParsedBackup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not a valid backup.')
  }

  const root = data as { version?: unknown; notes?: unknown } | null
  if (!root || typeof root !== 'object' || !Array.isArray(root.notes)) {
    throw new Error('This file is not a valid backup.')
  }
  if (root.version !== BACKUP_VERSION) {
    throw new Error('This backup comes from an unsupported version.')
  }

  const now = new Date().toISOString()
  const notes: BackupNote[] = []
  let invalid = 0

  for (const raw of root.notes as unknown[]) {
    const item = raw as Record<string, unknown> | null

    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.title !== 'string' ||
      typeof item.content !== 'string' ||
      item.content.length > MAX_CONTENT_LENGTH
    ) {
      invalid++
      continue
    }

    const sourceUrl = (item.source as { url?: unknown } | undefined)?.url
    const hasSource = typeof sourceUrl === 'string' && /^https?:\/\//i.test(sourceUrl)

    notes.push({
      title: item.title.slice(0, MAX_TITLE_LENGTH),
      content: item.content,
      isBookmarked: item.isBookmarked === true,
      createdAt: validDate(item.createdAt, now),
      updatedAt: validDate(item.updatedAt, now),
      source: hasSource ? { url: sourceUrl } : undefined,
    })
  }

  return { notes, invalid }
}