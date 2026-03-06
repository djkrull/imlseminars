# IML Seminars Registration System - API Endpoints

## Table of Contents
- [Public Routes](#public-routes)
- [Admin Routes](#admin-routes)
- [Scheduling API Routes](#scheduling-api-routes)
- [System Routes](#system-routes)

---

## Public Routes

### Registration & Submission

#### `GET /`
**Description:** Display the public registration form for talk submissions
**Authentication:** None
**Response:** Renders `registration.ejs` view

#### `POST /api/submit`
**Description:** Submit a new research talk proposal
**Authentication:** None (rate-limited: 5 requests per 15 minutes per IP)
**Content-Type:** `application/x-www-form-urlencoded` or `application/json`
**Body Parameters:**
```json
{
  "firstName": "string (required, max 255 chars)",
  "lastName": "string (required, max 255 chars)",
  "email": "string (required, valid email)",
  "sendCopy": "boolean (optional)",
  "talkTitle": "string (required, max 500 chars)",
  "talkAbstract": "string (required, min 50 chars)",
  "affiliation": "string (required, max 500 chars)",
  "questions": "string (optional, max 2000 chars)"
}
```
**Response:** Redirects to `/success?id={submissionId}` on success

#### `GET /success`
**Description:** Display submission confirmation page
**Authentication:** None
**Query Parameters:**
- `id` - Submission ID
**Response:** Renders `success.ejs` view

---

## Admin Routes
**Base Path:** `/admin`
**Authentication:** Routes require admin session unless noted. Scheduling page accessible to both admin and external users.

### Authentication

#### `GET /admin/login`
**Description:** Display admin login page
**Authentication:** None
**Response:** Renders `admin-login.ejs` view
**Note:** Redirects to dashboard if already authenticated

#### `POST /admin/login`
**Description:** Authenticate admin user
**Authentication:** None
**Body Parameters:**
```json
{
  "password": "string (required)"
}
```
**Response:** Redirects to `/admin/dashboard` on success

#### `GET /admin/logout`
**Description:** Log out admin user and destroy session
**Authentication:** Required
**Response:** Redirects to `/admin/login`

### Dashboard & Submissions

#### `GET /admin` or `GET /admin/dashboard`
**Description:** Display admin dashboard with all submissions
**Authentication:** Required
**Response:** Renders `admin-dashboard.ejs` view with submissions list

#### `GET /admin/view/:id`
**Description:** View detailed information for a specific submission
**Authentication:** Required
**URL Parameters:**
- `id` - Submission ID
**Response:** Renders `admin-view-submission.ejs` view
**Status Codes:**
- `200` - Success
- `404` - Submission not found

#### `POST /admin/delete/:id`
**Description:** Delete a talk submission
**Authentication:** Required
**URL Parameters:**
- `id` - Submission ID
**Response:** Redirects to `/admin/dashboard?deleted=true`
**Status Codes:**
- `200` - Success
- `404` - Submission not found

### Export

#### `GET /admin/export`
**Description:** Export all submissions to Excel file
**Authentication:** Required
**Response:** Excel file download (`IML_Talk_Submissions_YYYY-MM-DD.xlsx`)
**Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Scheduling

#### `GET /admin/scheduling`
**Description:** Display the scheduling management interface
**Authentication:** Required (admin or external)
**Response:** Renders `admin-scheduling.ejs` view with `role` variable (`admin` or `external`)
**Note:** External users see a restricted UI without publish, lock, export, or batch actions

#### `GET /admin/scheduling/export`
**Description:** Export schedule to Excel file in the format used for website publishing
**Authentication:** Required
**Response:** Excel file download (`IML_Schedule_YYYY-MM-DD.xlsx`)
**Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
**Excel Columns:**
- Start (datetime)
- End (datetime)
- Speaker (name)
- Title
- Affiliation
- Abstract
- Room
- Tag (e.g., "website")

#### `GET /admin/scheduling/export-app`
**Description:** Export published schedule to Excel file in the event app import format
**Authentication:** Required
**Response:** Excel file download (`IML_EventApp_Schedule_YYYY-MM-DD.xlsx`)
**Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
**Note:** Only exports talks with `status = 'published'`
**Excel Columns:**
- Start date (YYYY-MM-DD)
- Start time (HH:MM)
- End date (YYYY-MM-DD)
- End time (HH:MM)
- Title (format: "Speaker Name: Talk Title")
- Description (HTML format: `<b>Speaker</b><br/>Name, Affiliation<br/><br/><b>Abstract</b><br/>Abstract text`)
- Track (empty)
- Tag(s) ("website" if publish_to_website is true)
- Room location (room name)
- Group(s) (empty)

---

## Scheduling API Routes
**Base Path:** `/api/scheduling`
**Authentication:** All routes require authenticated session (admin or external). Lock toggle requires admin.
**Content-Type:** `application/json`
**Role restrictions on PATCH:** External users cannot change `is_locked`, `publish_to_website`, or `status` fields (returns 403).

### Rooms

#### `GET /api/scheduling/rooms`
**Description:** Get all available rooms
**Authentication:** Required
**Response:**
```json
[
  {
    "id": 1,
    "name": "string",
    "building": "string",
    "capacity": 50,
    "equipment": "string"
  }
]
```

### Submissions

#### `GET /api/scheduling/submissions`
**Description:** Get all talk submissions (both scheduled and unscheduled)
**Authentication:** Required
**Response:**
```json
[
  {
    "id": 1,
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "sendCopy": boolean,
    "talkTitle": "string",
    "talkAbstract": "string",
    "affiliation": "string",
    "questions": "string",
    "submittedAt": "datetime"
  }
]
```

#### `GET /api/scheduling/unscheduled`
**Description:** Get only unscheduled talk submissions
**Authentication:** Required
**Response:** Same format as `/api/scheduling/submissions` but filtered for unscheduled talks

### Scheduled Talks

#### `GET /api/scheduling/scheduled`
**Description:** Get all scheduled talks and events
**Authentication:** Required
**Response:**
```json
[
  {
    "id": 1,
    "submission_id": 123,
    "room_id": 1,
    "room_name": "string",
    "start_time": "datetime",
    "end_time": "datetime",
    "status": "string",
    "publish_to_website": boolean,
    "notes": "string",
    "first_name": "string",
    "last_name": "string",
    "talk_title": "string",
    "talk_abstract": "string",
    "affiliation": "string",
    "event_title": "string",
    "event_speaker": "string",
    "event_affiliation": "string",
    "event_abstract": "string"
  }
]
```

#### `POST /api/scheduling/schedule`
**Description:** Schedule a talk submission or create a custom event
**Authentication:** Required
**Body Parameters:**
```json
{
  "submission_id": 123,
  "room_id": 1,
  "start_time": "datetime (required)",
  "end_time": "datetime (required)",
  "publish_to_website": boolean,
  "notes": "string",
  "event_title": "string (for custom events)",
  "event_speaker": "string (for custom events)",
  "event_affiliation": "string (for custom events)",
  "event_abstract": "string (for custom events)"
}
```
**Response:** Created scheduled talk object
**Status Codes:**
- `201` - Created successfully
- `400` - Missing required fields
- `409` - Scheduling conflict detected

#### `PATCH /api/scheduling/schedule/:id`
**Description:** Update a scheduled talk
**Authentication:** Required
**URL Parameters:**
- `id` - Scheduled talk ID
**Body Parameters:** (all optional)
```json
{
  "room_id": 1,
  "start_time": "datetime",
  "end_time": "datetime",
  "status": "string",
  "publish_to_website": boolean,
  "notes": "string",
  "event_title": "string",
  "event_speaker": "string",
  "event_affiliation": "string",
  "event_abstract": "string"
}
```
**Response:** Updated scheduled talk object
**Status Codes:**
- `200` - Updated successfully
- `403` - Item is locked (only `is_locked`, `publish_to_website`, `status` changes allowed on locked items)
- `404` - Scheduled talk not found
- `409` - Scheduling conflict detected
- `500` - Update failed

#### `PATCH /api/scheduling/schedule/:id/lock`
**Description:** Toggle lock state on a single scheduled item
**Authentication:** Required
**URL Parameters:**
- `id` - Scheduled talk ID
**Body Parameters:**
```json
{
  "is_locked": true
}
```
**Response:** Updated scheduled talk object
**Status Codes:**
- `200` - Updated successfully
- `400` - `is_locked` must be a boolean
- `404` - Scheduled talk not found

#### `DELETE /api/scheduling/schedule/:id`
**Description:** Remove a talk from the schedule
**Authentication:** Required
**URL Parameters:**
- `id` - Scheduled talk ID
**Response:**
```json
{
  "message": "Scheduled talk deleted successfully"
}
```
**Status Codes:**
- `200` - Deleted successfully
- `403` - Item is locked and cannot be deleted
- `404` - Scheduled talk not found

### Scheduling Blocks

#### `POST /api/scheduling/blocks`
**Description:** Create a scheduling block (single or repeating)
**Authentication:** Required
**Body Parameters:**
```json
{
  "event_title": "string (required)",
  "room_id": 1,
  "start_time": "datetime (required)",
  "end_time": "datetime (required)",
  "is_locked": true,
  "notes": "string",
  "repeat": {
    "pattern": "daily|weekdays|weekly|custom",
    "days": [1, 3],
    "until": "date (required if repeat)"
  }
}
```
**Notes:**
- `room_id` is optional for blocks
- `repeat` is optional; without it creates a single block
- `repeat.days` only used with `pattern: "custom"` (0=Sun, 1=Mon, ..., 6=Sat)
- Checks conflicts for all instances before creating (all-or-nothing)
**Response (single):** Created block object
**Response (repeating):**
```json
{
  "repeat_group_id": "uuid",
  "count": 10,
  "blocks": [...]
}
```
**Status Codes:**
- `201` - Created successfully
- `400` - Missing required fields or no matching dates
- `409` - Scheduling conflict detected

#### `PATCH /api/scheduling/blocks/group/:groupId`
**Description:** Update all instances in a repeat group
**Authentication:** Required
**URL Parameters:**
- `groupId` - Repeat group UUID
**Body Parameters:** (all optional)
```json
{
  "event_title": "string",
  "room_id": 1,
  "is_locked": true,
  "notes": "string",
  "publish_to_website": true,
  "status": "string"
}
```
**Response:**
```json
{
  "count": 10,
  "updated": [...]
}
```
**Status Codes:**
- `200` - Updated successfully
- `404` - Repeat group not found

#### `DELETE /api/scheduling/blocks/group/:groupId`
**Description:** Delete all instances in a repeat group
**Authentication:** Required
**URL Parameters:**
- `groupId` - Repeat group UUID
**Query Parameters:**
- `force` - Set to `true` to delete even if some instances are locked
**Response:**
```json
{
  "message": "Repeat group deleted successfully"
}
```
**Status Codes:**
- `200` - Deleted successfully
- `403` - Some items in the series are locked (use `?force=true`)
- `404` - Repeat group not found

### Conflict Detection

#### `POST /api/scheduling/check-conflict`
**Description:** Check for scheduling conflicts without creating a schedule entry
**Authentication:** Required
**Body Parameters:**
```json
{
  "room_id": 1,
  "start_time": "datetime (required)",
  "end_time": "datetime (required)",
  "exclude_id": 123
}
```
**Response:**
```json
{
  "hasConflict": boolean,
  "conflicts": [
    {
      "id": 1,
      "room_id": 1,
      "start_time": "datetime",
      "end_time": "datetime",
      "talk_title": "string"
    }
  ]
}
```
**Status Codes:**
- `200` - Check completed
- `400` - Missing required fields

---

## System Routes

#### `GET /health`
**Description:** Health check endpoint for monitoring
**Authentication:** None
**Response:**
```json
{
  "status": "ok",
  "timestamp": "datetime"
}
```

#### `404 Error Handler`
**Description:** Catches all undefined routes
**Response:** Renders `error.ejs` view with 404 status

---

## Magic Link Routes

### External Access

#### `GET /schedule/:token`
**Description:** Magic link login for external users — validates token and redirects to scheduling page
**Authentication:** None (token-based)
**URL Parameters:**
- `token` - 64-character hex token
**Response:** Redirects to `/admin/scheduling` on success
**Status Codes:**
- `302` - Valid token, redirect to scheduling
- `403` - Invalid or expired token

### Magic Link Management (Admin Only)

#### `GET /admin/magic-links`
**Description:** Get all magic links
**Authentication:** Admin only
**Response:**
```json
[
  {
    "id": 1,
    "token": "string",
    "label": "string",
    "is_active": true,
    "created_at": "datetime",
    "expires_at": "datetime"
  }
]
```

#### `POST /admin/magic-links`
**Description:** Create a new magic link
**Authentication:** Admin only
**Body Parameters:**
```json
{
  "label": "string (optional)",
  "expires_at": "datetime (optional)"
}
```
**Response:** Created magic link object
**Status Codes:**
- `201` - Created successfully

#### `POST /admin/magic-links/:id/deactivate`
**Description:** Deactivate a magic link
**Authentication:** Admin only
**URL Parameters:**
- `id` - Magic link ID
**Response:**
```json
{
  "message": "Magic link deactivated"
}
```
**Status Codes:**
- `200` - Deactivated successfully
- `404` - Magic link not found

---

## Authentication & Security

### Two User Types

#### Admin
- Full access to all features: dashboard, submissions, scheduling, export, publish, lock, magic link management
- Authenticated via password login at `/admin/login`

#### External
- Access to scheduling page only (create/edit/delete events and blocks)
- Cannot publish, lock/unlock, export, or manage submissions
- Authenticated via magic link at `/schedule/:token`

### Session-Based Authentication
- Uses `express-session`
- Session cookie: `connect.sid` (HTTP-only, secure in production)
- Session lifetime: 24 hours
- Admin password verification: Plain text comparison (development), should use bcrypt in production

### Rate Limiting
- Form submissions: 5 requests per 15 minutes per IP address
- Applied to: `POST /api/submit`

### Content Security Policy
- Default: `'self'`
- Scripts: `'self'`, `'unsafe-inline'`, `'unsafe-eval'`
- Styles: `'self'`, `'unsafe-inline'`, Google Fonts
- Fonts: `'self'`, Google Fonts
- Images: `'self'`, `data:`, `https:`

---

## Error Responses

### Validation Errors
```json
{
  "errors": [
    {
      "msg": "Error message",
      "param": "fieldName",
      "location": "body"
    }
  ]
}
```

### Server Errors
Renders `error.ejs` view with:
```json
{
  "title": "Error",
  "message": "Error description",
  "statusCode": 500
}
```

---

## Database Schema Reference

### Tables
- `talk_submissions` - Research talk proposals
- `rooms` - Available rooms for talks
- `scheduled_talks` - Scheduled talks, events, and blocks
  - `is_locked` (boolean) - When true, item cannot be edited or deleted (publish still allowed by admin)
  - `is_block` (boolean) - Marks item as a schedule block (distinct visual treatment)
  - `repeat_group_id` (varchar) - UUID linking instances of a repeating block series
- `magic_links` - External user access tokens
  - `token` (varchar) - 64-character hex token
  - `label` (varchar) - Optional descriptive label
  - `is_active` (boolean) - Can be deactivated by admin
  - `expires_at` (timestamp) - Optional expiration date

For detailed schema information, see `src/config/database.js`

---

**Last Updated:** 2026-03-06
**Version:** 1.2.0
