// Same limit as the API (Note.cs)
const MAX_TITLE_LENGTH = 200

// "New note" -> "New note (1)" -> "New note (2)"... Works for any title.
export function uniqueTitle(base: string, existingTitles: string[]): string {
  const taken = new Set(existingTitles)
  if (!taken.has(base)) return base

  for (let n = 1; ; n++) {
    const suffix = ` (${n})`
    // Cut the base so the suffix never pushes the title past the limit
    const candidate = base.slice(0, MAX_TITLE_LENGTH - suffix.length) + suffix
    if (!taken.has(candidate)) return candidate
  }
}