# Notes Project

![.NET](https://img.shields.io/badge/.NET-10-512BD4) ![React](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![License](https://img.shields.io/badge/license-MIT-blue)

A local-first Markdown notes extension that lives in the browser's side panel, with optional sync to your own ASP.NET Core API. Notes stay on your device and work offline, with no account needed. To have them on more than one machine, log in and turn on sync.

## Features

### Notes

- Lives in the browser's side panel: click the toolbar icon to open it next to any page.
- Markdown editor with an Edit / Preview toggle, one pane at a time, made for a narrow panel. The chosen mode is kept when a sync reloads the editor.
- Auto-save after 1 second of inactivity.
- Notes drawer with search (title and content), a bookmark filter, and per-note delete.
- The drawer shows who is logged in above the sync toggle ("Signed in as ...", or "Not signed in").
- New notes with a repeated title are numbered: `New note`, `New note (1)`, `New note (2)`.
- Bookmarks (star) on each note.
- Status bar with live line and character counters.
- Size limits match the API: 200 characters for titles, 200,000 for content.

### Markdown Preview

- Rendered with `marked` and sanitized with `DOMPurify`, styled to look like GitHub: headings with underlines, tables, strikethrough, fenced code blocks, blockquotes, images, and links.
- **Task lists**: click a `- [ ]` box to toggle it in the editor or in the preview, and press Enter on a task line to start the next one.
- Single line breaks render as line breaks.
- Links to `http` and `https` open in a new tab, so the side panel never navigates away.
- Raw HTML in a note is sanitized before it is rendered.

### Notes From the Web

- The **+** button in the drawer creates a note titled after the page in the active tab.
- The context menu item **Save selection as note** saves the selected text as a Markdown quote, followed by a link to the page.
- The drawer groups notes into **This page**, **This site**, and **All notes**, based on the page in the active tab.

### Local-First Storage and Optional Sync

- Notes are stored in `chrome.storage.local`, so the app works offline and without logging in.
- Sync is turned on with the **Keep syncing** toggle in the footer of the notes drawer.
- A full check runs when the toggle is turned on, when the panel opens, and when the connection comes back. After that, local changes are sent automatically after each save.
- Sync compares a content hash of each note against the hash saved at the last sync to tell which side changed, and keeps a tombstone for notes deleted on the device.
- **Conflicts** (both sides changed, or one side deleted while the other edited) open a modal where you pick the local or the server version, one note at a time.
- Deletions are confirmed before they are applied, so a note is never removed by surprise.
- If the server is unreachable, sync keeps the toggle on and retries instead of failing.
- Notes from a different account are treated as never synced, so they are uploaded instead of deleted.

### Account

- Login and registration live inside the side panel (the **Log in** button in the drawer footer).
- Accounts use a username instead of an email: 3 to 32 characters, with letters, numbers, `_` and `-`. Usernames are trimmed and lowercased, so `Foo` and `foo` are the same account.
- Logout asks whether to also clear the notes stored on the device, and shows how many have unsynced changes.
- When the session expires, sync is turned off and a notice asks the user to log in again.

### Security

- Passwords are hashed with BCrypt (8 to 72 characters). Usernames are normalized and validated on the server.
- Login and register are rate limited to 10 requests per minute per IP.
- JWT tokens last 2 hours and are validated for issuer, audience, lifetime, and signing key. The API refuses to start with a missing or short key.
- Parameterized SQL (Dapper) and a 1 MB request size limit on the notes endpoints.
- Every note query is filtered by the logged-in user.
- CORS is restricted to a single `chrome-extension://` origin. Secrets stay out of Git (`.env`, `appsettings.Development.json`, `*.pem`).
- The `tabs` permission lets the panel read the URL and title of the active tab. The page URL of a note stays in `chrome.storage.local` and is only used to group the drawer. The quote and the link written inside a note are part of its text, so they are sent to your API when sync is on. Sync sends nothing else about the page.

### Architecture

```text
notes-project/
├── api/                  ASP.NET Core Web API (JWT, Dapper, PostgreSQL)
├── client/               Chrome extension (React + TypeScript + Vite)
├── docker-compose.yml    PostgreSQL for local development
└── .env.example          Database credentials template
```

- The extension is the only client. The API is used only for login and sync.
- The API answers only to the extension, through a CORS policy for a single extension ID.
- Chrome extension on Manifest V3, with the side panel as the single screen of the UI.
- A background service worker opens the panel from the toolbar icon and registers the context menu.
- The API uses raw SQL through Dapper. The tables are created at startup from `Database/init.postgres.sql`.

## Technologies

- .NET 10 / ASP.NET Core Web API
- PostgreSQL 16
- Dapper + Npgsql
- JWT Bearer authentication
- BCrypt.Net
- Swagger (Swashbuckle), development only
- React 19
- TypeScript
- Vite + `@crxjs/vite-plugin` (Manifest V3)
- `marked` and `DOMPurify`
- Chrome extension APIs: side panel, storage, tabs, context menus
- Docker, Docker Compose (PostgreSQL)

## Running the Application

### Prerequisites

- .NET 10 SDK
- Node.js 20.19+ or 22.12+
- Docker and Docker Compose, for PostgreSQL
- Chrome 114+, or another Chromium-based browser with side panel support

The extension works on its own: skip steps 1 and 2 to use local notes without sync.

```bash
git clone https://github.com/henriqt/notes-project.git
cd notes-project
```

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

Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `client/dist` folder. Click the extension's toolbar icon to open the side panel.

The API address is set in `client/src/api/client.ts` (`API_BASE`) and in the `host_permissions` of `client/manifest.config.ts`.

**Extension ID and CORS.** The API only accepts requests from one extension ID, set in `Program.cs` (`WithOrigins("chrome-extension://<id>")`). To get a stable ID on your machine:

1. Generate a key: `openssl genrsa -out extension-key.pem 2048` and save it as `client/extension-key.pem` (it is gitignored).
2. Rebuild and reload the extension, then copy its ID from the extensions page.
3. Put that ID in the CORS policy in `Program.cs` and restart the API.

Without the key, Chrome gives the extension a random ID. Local notes still work, but sync is blocked by CORS.

## Configuration (Environment Variables)

| Variable | Description |
|---|---|
| `DB_USERNAME` | PostgreSQL user, read by Docker Compose from `.env`. Defaults to `postgres`. |
| `DB_PASSWORD` | PostgreSQL password, read by Docker Compose from `.env`. Required. |
| `ConnectionStrings:DefaultConnection` | Connection string used by the API, set in `api/appsettings.Development.json`. |
| `Jwt:Key` | Secret key used to sign and validate JWT tokens, with at least 32 characters. The API refuses to start without it. |
| `Jwt:Issuer` / `Jwt:Audience` | Token issuer and audience. Both default to `NotesProjectAPI` in `appsettings.json`. |

## Authentication

1. Create an account with `POST /api/auth/register`.
2. Get a token from `POST /api/auth/login`.
3. Send it on every request except `auth`: `Authorization: Bearer <your_jwt_token>`.

Tokens last 2 hours. After that the API answers `401`, and the extension turns sync off and asks the user to log in again. In Swagger, use the **Authorize** button with the token.

## API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Creates an account with a username and a password. | Public (rate limited) |
| POST | `/api/auth/login` | Authenticates a user and returns a JWT token and the username. | Public (rate limited) |
| GET | `/api/users/me` | Gets the current user (id, username and creation date). | Authenticated |
| GET | `/api/notes` | Lists the current user's notes. | Authenticated |
| GET | `/api/notes/{id}` | Gets a specific note. | Owner |
| POST | `/api/notes` | Creates a note. | Authenticated |
| PUT | `/api/notes/{id}` | Updates a note. | Owner |
| DELETE | `/api/notes/{id}` | Deletes a note. | Owner |

Every note query is filtered by the logged-in user.

## Data Models and Examples

### Note

Request (`POST /api/notes`) and (`PUT /api/notes/{id}`, which also sends `id`):

```json
{
  "title": "Reading list",
  "content": "- [ ] Read the Markdown guide",
  "isBookmarked": false
}
```

`title` accepts up to 200 characters and `content` up to 200,000.

Response:

```json
{
  "id": 1,
  "title": "Reading list",
  "content": "- [ ] Read the Markdown guide",
  "createdAt": "2026-11-08T14:32:00Z",
  "updatedAt": "2026-11-08T14:32:00Z",
  "isBookmarked": false,
  "userId": 1
}
```

### Register and Login

Request (`POST /api/auth/register` and `POST /api/auth/login`):

```json
{
  "username": "joao",
  "password": "myPassword123"
}
```

`username` must have between 3 and 32 characters (letters, numbers, `_` and `-`) and `password` between 8 and 72. Registering a username that already exists answers `409`, invalid data answers `400`, and too many attempts answer `429`.

Login response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "joao"
  }
}
```

### Local Note (extension)

Notes in `chrome.storage.local` carry a few extra fields. `serverId` and `baseHash` only exist after the first sync, and `source` never leaves the device.

```json
{
  "id": 1762612320000,
  "title": "How the DOM works",
  "content": "> Selected text.\n\n[How the DOM works](https://developer.example.com/dom)\n",
  "isBookmarked": false,
  "createdAt": "2026-11-08T14:32:00.000Z",
  "updatedAt": "2026-11-08T14:32:00.000Z",
  "userId": 0,
  "serverId": 12,
  "baseHash": "3a7bd3e2360a3d29eea436fcfb7e44c7...",
  "source": { "url": "https://developer.example.com/dom" }
}
```

## Linting and Build

```bash
cd client
npm run lint
npm run build

cd ../api
dotnet build
```

## Project Status

In development.

The project follows GitHub Flavored Markdown. Features without a GitHub equivalent, like Obsidian-style `[[wikilinks]]`, are out of scope.

### Done

- Local-first Markdown editor with an Edit / Preview toggle
- Markdown preview styled like GitHub
- Task lists with clickable checkboxes
- Side panel UI with a notes drawer, search, and bookmarks
- Notes anchored to pages, with the **+** button and the context menu
- Save selection as note, as a quote with a link to the page
- Drawer sections for the current page, the current site, and all notes
- Optional sync with conflict resolution and deletion confirmation
- Login and registration inside the side panel
- JWT API with PostgreSQL, rate limiting, and input validation

### Planned

- Docker setup for the full app (API and database with a single `docker compose up`)
- Heading ids and `#` links inside the preview
- More GitHub Markdown in the preview: alerts, footnotes, emoji shortcodes, syntax highlighting, math, and diagrams
- Related notes when you return to a page
- Runnable HTTP blocks and smart paste formatting for developer notes
- AI-assisted note formatting
- Personal integrations (for example Spotify and Steam)
- Line-by-line diff in the sync conflict screen

## Contributing

1. Fork the project.
2. Create your feature branch: `git checkout -b feature/NewFeature`.
3. Commit your changes: `git commit -m 'feat: adds NewFeature'`.
4. Push to the branch: `git push origin feature/NewFeature`.
5. Open a Pull Request.

## License

Distributed under the MIT license. See `LICENSE` for more information.