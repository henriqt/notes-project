using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NotesProjectAPI.Database;
using NotesProjectAPI.Models;
using NotesProjectAPI.Services;
using System.Security.Claims;

namespace NotesProjectAPI.Controllers
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [ApiController]
    [RequestSizeLimit(1_000_000)] // 1 MB max body, the default is ~30 MB
    [Route("api/[controller]")]
    public class NotesController : ControllerBase
    {
        private readonly DatabaseService _databaseService;

        public NotesController(DatabaseService databaseService)
        {
            _databaseService = databaseService;
        }

        // GET: api/Notes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Note>>> GetNotes()
        {
            using var connection = _databaseService.CreateConnection();
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

            var notes = await connection.QueryAsync<Note>(
                "SELECT * FROM Notes WHERE UserId = @UserId ORDER BY CreatedAt DESC",
                new { UserId = userId });

            return Ok(notes);
        }

        // GET: api/Notes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Note>> GetNote(int id)
        {
            using var connection = _databaseService.CreateConnection();
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

            var note = await connection.QueryFirstOrDefaultAsync<Note>(
                "SELECT * FROM Notes WHERE Id = @Id AND UserId = @UserId",
                new { Id = id, UserId = userId });

            if (note == null)
                return NotFound();

            return Ok(note);
        }

        // POST: api/Notes
        [HttpPost]
        public async Task<ActionResult<Note>> CreateNote(Note note)
        {
            using var connection = _databaseService.CreateConnection();
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

            var now = DateTime.UtcNow;

            var sql = @"
                INSERT INTO Notes
                (UserId, Title, Content, CreatedAt, UpdatedAt, IsBookmarked)
                VALUES
                (@UserId, @Title, @Content, @CreatedAt, @UpdatedAt, @IsBookmarked)
                RETURNING Id";

            var id = await connection.ExecuteScalarAsync<int>(sql, new
            {
                UserId = userId,
                note.Title,
                note.Content,
                CreatedAt = now,
                UpdatedAt = now,
                note.IsBookmarked
            });

            note.Id = id;
            note.UserId = userId;
            note.CreatedAt = now;
            note.UpdatedAt = now;

            // Update NoteLinks from the [[wikilinks]]
            await NoteLinkService.SyncLinksAsync(connection, note.Id, userId, note.Content);

            return CreatedAtAction(nameof(GetNote), new { id = note.Id }, note);
        }

        // PUT: api/Notes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNote(int id, Note note)
        {
            if (id != note.Id)
                return BadRequest();

            using var connection = _databaseService.CreateConnection();
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

            var sql = @"
                UPDATE Notes
                SET
                    Title = @Title,
                    Content = @Content,
                    UpdatedAt = @UpdatedAt,
                    IsBookmarked = @IsBookmarked
                WHERE Id = @Id AND UserId = @UserId";

            var rowsAffected = await connection.ExecuteAsync(sql, new
            {
                note.Title,
                note.Content,
                UpdatedAt = DateTime.UtcNow,
                note.IsBookmarked,
                Id = id,
                UserId = userId
            });

            if (rowsAffected == 0)
                return NotFound();

            // Content may have changed, update the links
            await NoteLinkService.SyncLinksAsync(connection, id, userId, note.Content);

            return NoContent();
        }

        // DELETE: api/Notes/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNote(int id)
        {
            using var connection = _databaseService.CreateConnection();
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

            // NoteLinks are deleted by ON DELETE CASCADE
            var rowsAffected = await connection.ExecuteAsync(
                "DELETE FROM Notes WHERE Id = @Id AND UserId = @UserId",
                new { Id = id, UserId = userId });

            if (rowsAffected == 0)
                return NotFound();

            return NoContent();
        }

        // PATCH: api/Notes/5/bookmark
        [HttpPatch("{id}/bookmark")]
        public async Task<IActionResult> ToggleBookmark(int id)
        {
            using var connection = _databaseService.CreateConnection();
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value);

            var note = await connection.QueryFirstOrDefaultAsync<Note>(
                "SELECT * FROM Notes WHERE Id = @Id AND UserId = @UserId",
                new { Id = id, UserId = userId });

            if (note == null)
                return NotFound();

            note.IsBookmarked = !note.IsBookmarked;
            note.UpdatedAt = DateTime.UtcNow;

            await connection.ExecuteAsync(@"
                UPDATE Notes
                SET IsBookmarked = @IsBookmarked,
                    UpdatedAt = @UpdatedAt
                WHERE Id = @Id AND UserId = @UserId",
                new
                {
                    note.IsBookmarked,
                    note.UpdatedAt,
                    note.Id,
                    UserId = userId
                });

            return Ok(note);
        }
    }
}