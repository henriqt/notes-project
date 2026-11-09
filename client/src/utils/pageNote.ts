// Starting Markdown for a note saved from a web page:
// the selected text as a quote, then a link back to the page.
export function buildPageNoteContent(pageUrl: string, pageTitle: string, selection: string): string {
  // Brackets and backslashes would break the link text
  const linkText = (pageTitle.trim() || pageUrl).replace(/[\\[\]]/g, '\\$&')
  // Parentheses would end the link destination too early
  const linkUrl = pageUrl.replace(/\(/g, '%28').replace(/\)/g, '%29')

  const quote = selection
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n')

  return `${quote}\n\n[${linkText}](${linkUrl})\n`
}