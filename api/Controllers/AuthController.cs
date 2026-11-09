using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using NotesProjectAPI.Database;
using NotesProjectAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;

namespace NotesProjectAPI.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public class AuthController : ControllerBase
    {
        private readonly DatabaseService _databaseService;
        private readonly IConfiguration _configuration;

        public AuthController(DatabaseService databaseService, IConfiguration configuration)
        {
            _databaseService = databaseService;
            _configuration = configuration;
        }

        private const int MinPasswordLength = 8;
        private const int MaxPasswordLength = 72; // BCrypt only uses the first 72 bytes
        private const int MinUsernameLength = 3;
        private const int MaxUsernameLength = 32;
        private static readonly Regex UsernameRegex = new("^[a-z0-9_-]+$");

        // "Foo " and "foo" are the same account
        private static string NormalizeUsername(string? username)
        {
            return (username ?? string.Empty).Trim().ToLowerInvariant();
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var username = NormalizeUsername(request.Username);

            if (username.Length < MinUsernameLength || username.Length > MaxUsernameLength || !UsernameRegex.IsMatch(username))
                return BadRequest(new { message = $"Username must be {MinUsernameLength} to {MaxUsernameLength} characters: letters, numbers, _ and -." });

            // Checked here too because the API can be called directly
            var password = request.Password ?? string.Empty;
            if (password.Length < MinPasswordLength || Encoding.UTF8.GetByteCount(password) > MaxPasswordLength)
                return BadRequest(new { message = $"Password must be between {MinPasswordLength} and {MaxPasswordLength} characters." });

            using var connection = _databaseService.CreateConnection();

            // Case-insensitive, so older accounts still match
            var existing = await connection.QueryFirstOrDefaultAsync<User>(
                "SELECT * FROM Users WHERE LOWER(Username) = @Username",
                new { Username = username });

            if (existing != null)
                return Conflict(new { message = "An account with this username already exists." });

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);

            var sql = @"
                INSERT INTO Users (Username, PasswordHash, CreatedAt)
                VALUES (@Username, @PasswordHash, @CreatedAt)";

            await connection.ExecuteAsync(sql, new
            {
                Username = username,
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow
            });

            return Ok(new { message = "User created successfully" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var username = NormalizeUsername(request.Username);

            // A null password would make BCrypt throw (500)
            if (string.IsNullOrEmpty(request.Password))
                return Unauthorized(new { message = "Invalid credentials" });

            using var connection = _databaseService.CreateConnection();

            var user = await connection.QueryFirstOrDefaultAsync<User>(
                "SELECT * FROM Users WHERE LOWER(Username) = @Username",
                new { Username = username });

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new { message = "Invalid credentials" });

            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token,
                user = new { user.Id, user.Username }
            });
        }

        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"])
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}