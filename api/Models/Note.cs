using System.ComponentModel.DataAnnotations;

namespace NotesProjectAPI.Models
{
    public class Note
    {
        public int Id { get; set; }
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        [MaxLength(200_000)]
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsBookmarked { get; set; } = false;
        public int UserId { get; set; }
    }
}