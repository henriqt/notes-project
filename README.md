# Notes Project

A **local-first Markdown notes extension** that lives in the browser's side panel, with `[[wikilinks]]` between notes and **optional sync** to your own ASP.NET Core API.

Notes live on your device and work offline, with no account needed. If you want them on more than one machine, log in and turn on sync.

---

## Features

### Notes
- Lives in the browser's side panel: click the toolbar icon to open it next to any page
- Notes drawer with search (title and content), bookmark filter and per-note delete
- Markdown editor with an Edit / Preview toggle (one pane at a time, made for a narrow panel)
- Auto-save after 1 second of inactivity
- `[[Wikilinks]]` between notes: clickable in the preview, and a link to a note that doesn't exist yet creates an empty one
- Task lists: click a `- [ ]` box to toggle it in the editor or in the preview, and Enter on a task line starts the next one
- Bookmarks (star) on each note
- Status bar with live line and character counters
- Safe preview: Markdown is rendered with `marked` and sanitized with `DOMPurify`

### Local-first storage
- Notes are stored in `chrome.storage.local`, so the app works offline and without logging in
- Size limits match the API: 200 characters for titles, 200,000 for content

### Optional sync ("Keep syncing")
- Turn it on with the toggle in the footer of the notes drawer
- A full check runs when the toggle is turned on, when the panel opens and when the connection comes back; after that, local changes are sent automatically
- Conflicts (both sides changed) open a modal where you pick the local or the server version, one note at a time
- Deletions are confirmed before they are applied, so a note is never removed by surprise
- If the server is unreachable, sync keeps the toggle on and retries instead of failing
- Logout can optionally clear the notes stored on the device

### Account
- Login and registration live inside the side panel (the **Log in** button in the drawer footer)
- Logout asks whether to also clear the notes stored on the device

---

## Architecture

```text
notes-project/
├── api/                  ASP.NET Core Web API (JWT, Dapper, PostgreSQL)
├── client/               Chrome extension (React + TypeScript + Vite)
├── docker-compose.yml    PostgreSQL for local development
└── .env.example          Database credentials template
```

- The extension is the only client. The API is used only for login and sync.
- The API answers only to the extension: CORS allows a single `chrome-extension://` origin.
- The same wikilink logic exists on both sides (`NoteLinkService.cs` on the server and `wikilinkSync.ts` in the client).
- Sync compares a content hash of each note against the hash saved at the last sync to tell which side changed, and keeps tombstones for notes deleted offline.

---

## Tech stack

### Backend
- ASP.NET Core Web API (.NET 10)
- PostgreSQL 16 with Dapper and Npgsql
- JWT authentication (2-hour tokens) and BCrypt password hashing
- Swagger (development only)

### Frontend (extension)
- React 19 and TypeScript
- Vite with `@crxjs/vite-plugin` (Manifest V3)
- `react-router-dom` (`HashRouter`), `marked` and `DOMPurify`
- Chrome side panel (`chrome.sidePanel`) as the single UI

---

## Getting started

### Prerequisites
- .NET 10 SDK
- Node.js 20.19+ or 22.12+
- Docker (for PostgreSQL)
- A Chromium-based browser with side panel support (Chrome 114+)

### 1. Database

```bash
cp .env.example .env     # then set DB_PASSWORD
docker compose up -d
```

### 2. API

Create `api/appsettings.Development.json` (it is gitignored):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=127.0.0.1;Port=5432;Database=notes_db;Username=postgres;Password=<DB_PASSWORD from .env>"
  },
  "Jwt": {
    "Key": "<random string with at least 32 characters>"
  }
}
```

You can generate the key with `openssl rand -base64 64`. Then run:

```bash
dotnet dev-certs https --trust   # first time only
cd api
dotnet run --launch-profile https
```

The API runs at `https://localhost:7269` and Swagger at `https://localhost:7269/swagger`. The tables are created automatically on startup.

### 3. Extension

```bash
cd client
npm install
npm run build
```

Open `chrome://extensions` (or `brave://extensions`), turn on **Developer mode**, click **Load unpacked** and select the `client/dist` folder. Click the extension's toolbar icon to open the side panel.

**Extension ID and CORS.** The API only accepts requests from one extension ID, set in `Program.cs` (`WithOrigins("chrome-extension://<id>")`). To get a stable ID on your machine:

1. Generate a key: `openssl genrsa -out extension-key.pem 2048` and save it as `client/extension-key.pem` (it is gitignored).
2. Rebuild and reload the extension, then copy its ID from the extensions page.
3. Put that ID in the CORS policy in `Program.cs` and restart the API.

Without the key, Chrome gives the extension a random ID. Local notes still work, but sync is blocked by CORS.

---

## API overview

All routes except `auth` require a `Authorization: Bearer <token>` header.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in and receive a JWT |
| GET | `/api/users/me` | Current user |
| GET | `/api/notes` | List the user's notes |
| GET | `/api/notes/{id}` | Get one note |
| POST | `/api/notes` | Create a note |
| PUT | `/api/notes/{id}` | Update a note |
| DELETE | `/api/notes/{id}` | Delete a note |
| PATCH | `/api/notes/{id}/bookmark` | Toggle the bookmark |

Every note query is filtered by the logged-in user.

---

## Security

- Passwords hashed with BCrypt (8 to 72 characters); emails normalized and validated on the server
- Rate limit of 10 requests per minute per IP on login and register
- JWT validated for issuer, audience, lifetime and signing key; the API refuses to start with a missing or short key
- Parameterized SQL (Dapper) and a 1 MB request size limit
- CORS restricted to the extension; secrets stay out of Git (`.env`, `appsettings.Development.json`, `*.pem`)

---

## Project status

In development.

### Completed
- ✅ Local-first Markdown editor with an Edit / Preview toggle
- ✅ Wikilinks with automatic creation of missing notes
- ✅ Side panel UI with a notes drawer, search and bookmarks
- ✅ Optional sync with conflict resolution and deletion confirmation
- ✅ Login and registration inside the side panel
- ✅ Task lists with clickable checkboxes
- ✅ JWT API with PostgreSQL, rate limiting and input validation

### Planned
- 🔲 Docker setup for the full app (API and database with a single `docker compose up`)
- 🔲 Notes anchored to the current page (save a selection as a note, notes grouped by site)
- 🔲 Runnable HTTP blocks and smart paste formatting for developer notes
- 🔲 AI-assisted note formatting
- 🔲 Personal integrations (for example Spotify and Steam)
- 🔲 Line-by-line diff in the sync conflict screen

---

## License

MIT. See [LICENSE](LICENSE).