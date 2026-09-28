using Dapper;
using System.Data;

namespace NotesProjectAPI.Services
{
    public static class NoteLinkService
    {
        // Reads the [[wikilinks]] in the content and updates NoteLinks.
        // Titles without a note get an empty note.
        public static async Task SyncLinksAsync(IDbConnection connection, int noteId, int userId, string content)
        {
            var titles = WikilinkParser.ExtractLinkedTitles(content);
            var targetIds = new List<int>();

            foreach (var title in titles)
            {
                var targetId = await ResolveOrCreateNoteAsync(connection, userId, title);

                if (targetId != noteId) // skip self-links
                    targetIds.Add(targetId);
            }

            // Delete the old links, insert the current ones
            await connection.ExecuteAsync(
                "DELETE FROM NoteLinks WHERE SourceNoteId = @NoteId AND UserId = @UserId",
                new { NoteId = noteId, UserId = userId });

            foreach (var targetId in targetIds.Distinct())
            {
                await connection.ExecuteAsync(
                    @"INSERT INTO NoteLinks (SourceNoteId, TargetNoteId, UserId)
                      VALUES (@SourceNoteId, @TargetNoteId, @UserId)
                      ON CONFLICT (SourceNoteId, TargetNoteId) DO NOTHING",
                    new { SourceNoteId = noteId, TargetNoteId = targetId, UserId = userId });
            }
        }

        // Finds the note by title (per user, ignoring case) or creates an empty one
        private static async Task<int> ResolveOrCreateNoteAsync(IDbConnection connection, int userId, string title)
        {
            var existingId = await connection.QueryFirstOrDefaultAsync<int?>(
                "SELECT Id FROM Notes WHERE UserId = @UserId AND LOWER(Title) = LOWER(@Title)",
                new { UserId = userId, Title = title });

            if (existingId.HasValue)
                return existingId.Value;

            var now = DateTime.UtcNow;

            return await connection.ExecuteScalarAsync<int>(
                @"INSERT INTO Notes (UserId, Title, Content, CreatedAt, UpdatedAt, IsBookmarked)
                  VALUES (@UserId, @Title, '', @Now, @Now, false)
                  RETURNING Id",
                new { UserId = userId, Title = title, Now = now });
        }
    }
}