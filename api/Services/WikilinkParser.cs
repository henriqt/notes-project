using System.Text.RegularExpressions;

namespace NotesProjectAPI.Services
{
    public static class WikilinkParser
    {
        // Matches [[Title]], no nested brackets
        private static readonly Regex WikilinkRegex = new(
            @"\[\[([^\[\]]+)\]\]",
            RegexOptions.Compiled);

        // Each link can create a note, so limit it per note
        private const int MaxLinksPerNote = 50;

        // Returns the unique titles from the Markdown (doesn't check the database)
        public static IEnumerable<string> ExtractLinkedTitles(string? content)
        {
            if (string.IsNullOrWhiteSpace(content))
                return Enumerable.Empty<string>();

            return WikilinkRegex
                .Matches(content)
                .Select(match => match.Groups[1].Value.Trim())
                .Where(title => !string.IsNullOrWhiteSpace(title) && title.Length <= 200)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(MaxLinksPerNote);
        }
    }
}