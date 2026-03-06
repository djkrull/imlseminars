# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IML Seminars Registration System — a web app for managing research talk submissions and scheduling for Institut Mittag-Leffler (part of the Royal Swedish Academy of Sciences). Built with Node.js/Express, PostgreSQL, and EJS templates. Deployed on Railway.

## Development Commands

```bash
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production server (port 3000)
```

There is no test suite configured. `npm test` will fail.

## Architecture

### Request Flow

`server.js` is the entry point. It mounts four route modules:

- `/` — `src/routes/registration.js` — Public talk submission form
- `/admin` — `src/routes/admin.js` — Admin dashboard (session-auth protected)
- `/api/scheduling` — `src/routes/scheduling.js` — Scheduling CRUD API (JSON, session-auth)
- `/klein-converter` — `src/routes/kleinConverter.js` — Excel schedule format converter (public)

### Database Layer

All database access goes through `src/config/database.js`, which exports query functions (no ORM). Two modes:

1. **PostgreSQL** — when `DATABASE_URL` is set. Tables are auto-created on startup via `initDatabase()`.
2. **In-memory fallback** — when no `DATABASE_URL`. Data is lost on restart. Scheduling features return empty arrays.

**Tables:** `talk_submissions`, `rooms` (seeded with 4 default rooms), `scheduled_talks`

**Naming convention:** Database columns use `snake_case`. The `Talk.js` model provides `toJSON()` for `camelCase` API responses.

### Scheduled Talks: Two Types

`scheduled_talks` supports both:
- **Submission-linked talks** — `submission_id` references `talk_submissions`; speaker/title come from the submission
- **Custom events** — no `submission_id`; uses `event_title`, `event_speaker`, `event_affiliation`, `event_abstract` fields directly

### Klein Converter

Standalone tool at `/klein-converter` that converts Klein-format Excel schedules (Swedish date headers like "Tisdag 13 januari") into Ventla event app import format. No database interaction.

### Authentication

- Session-based admin auth via `express-session` with bcrypt password verification
- Auth middleware: `src/middleware/auth.js`
- Rate limiting on `/api/submit`: 5 requests per 15 minutes per IP

### Security

- Helmet CSP configured in `server.js` — must be updated when adding external resources
- `scriptSrc` includes `'unsafe-inline'` and `'unsafe-eval'` — use `addEventListener` instead of inline `onclick`
- Always include `credentials: 'same-origin'` in fetch calls to authenticated endpoints

## API Documentation

**CRITICAL:** When implementing, modifying, or deleting API endpoints, you MUST update `API_ENDPOINTS.md`. Document: HTTP method, path, auth requirements, request/response format, and status codes.

## Environment Variables

```env
DATABASE_URL=postgresql://...    # Railway PostgreSQL connection string
ADMIN_PASSWORD=...               # Admin login password
SESSION_SECRET=...               # Express session secret
PORT=3000                        # Server port (default 3000)
NODE_ENV=development             # Set to 'production' for secure cookies + SSL
```

## IML Branding

- **Colors:** Blue `#003E7E`, Gold `#D4AF37`, Cream `#f9edc6`
- **Font:** Lato (Google Fonts)
- **Logo:** `/public/images/IML_bla.png`

## Deployment

Railway auto-deploys from main branch. Build: `npm install`, Start: `npm start`. Environment variables configured in Railway dashboard.
