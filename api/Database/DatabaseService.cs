using Npgsql;
using System.Data;
using System.Data.Common;

namespace NotesProjectAPI.Database
{
    public class DatabaseService
    {
        private readonly string _connectionString;

        public DatabaseService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("Connection string not found");
        }

        public IDbConnection CreateConnection()
        {
            return new NpgsqlConnection(_connectionString);
        }

        public async Task InitializeDatabaseAsync()
        {
            using var connection = CreateConnection();
            connection.Open();

            var scriptPath = Path.Combine(AppContext.BaseDirectory, "Database", "init.postgres.sql");

            if (!File.Exists(scriptPath))
            {
                throw new FileNotFoundException($"Database initialization script not found at: {scriptPath}");
            }

            var script = await File.ReadAllTextAsync(scriptPath);

            using var command = (DbCommand)connection.CreateCommand();
            command.CommandText = script;
            await command.ExecuteNonQueryAsync();
        }
    }
}