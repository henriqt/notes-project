// Flips the n-th task item ("- [ ]" or "- [x]") in the Markdown text.
// Lines inside fenced code blocks are skipped, because they are not rendered as checkboxes.
export function toggleTask(content: string, index: number): string {
  let count = -1
  let inCode = false

  return content
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inCode = !inCode
      if (inCode) return line

      if (!/^\s*(?:[-*+]|\d+[.)])\s+\[[ xX]\]\s+\S/.test(line)) return line

      count++
      if (count !== index) return line

      return line.replace(/\[([ xX])\]/, (_match, mark: string) => (mark === ' ' ? '[x]' : '[ ]'))
    })
    .join('\n')
}